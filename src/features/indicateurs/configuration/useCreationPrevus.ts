import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { creerIndicateursPrevus } from '@/data/indicateursConfiguration'
import { invaliderApresEcriture } from '@/features/indicateurs/configuration/cles'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import {
  reussiteAucunPrevu,
  reussiteCreationPrevus,
  TEXTES_CONFIGURATION,
} from '@/features/indicateurs/configuration/textes'

/** Refus de droit commun à toutes les fonctions de l'API (42501), message d'un objet absent. */
const REFUS_ACCES = "Cet élément n'existe pas ou vous n'y avez pas accès."

/** Refus de `private.exige_aal2()` (42501 aussi) : la session n'a plus la double authentification. */
const REFUS_DOUBLE_AUTHENTIFICATION = 'Double authentification requise.'

/**
 * Texte d'un refus de la base à montrer tel quel (erreur `P0001` : « La fiche a déjà « X » :
 * retirez-le avant de créer les indicateurs prévus. »), ou `null` pour un problème de connexion
 * (l'écran dit « La connexion a échoué. Réessayez. »). Un refus de droit (42501) dit seulement que
 * l'élément n'est pas accessible, sauf « Double authentification requise. », que la personne doit
 * lire pour refaire sa double authentification.
 */
export function messageDeRefusPrevus(erreur: unknown): string | null {
  if (typeof erreur !== 'object' || erreur === null) return null
  const { code, message } = erreur as { code?: unknown; message?: unknown }
  if (code === '42501') {
    return message === REFUS_DOUBLE_AUTHENTIFICATION ? message : REFUS_ACCES
  }
  if (code !== 'P0001' || typeof message !== 'string') return null
  return message
}

/** Ce que reçoit l'écran pour la création des prévus. */
export interface CreationPrevus {
  /** Crée les prévus d'un ministère, ou enregistre « Aucun prévu » (`MODELE_AUCUN`). */
  creer: (ministere: { id: string; nom: string }, modele: string) => Promise<void>
  /** Identifiant du ministère dont la création est en cours, ou `null`. */
  enCours: string | null
  /** Identifiant du ministère du dernier envoi : le refus s'affiche sur sa ligne. */
  dernier: string | null
  /** Message de réussite du dernier envoi, ou `null`. */
  reussite: string | null
  /** Numéro de l'envoi réussi : deux envois de suite affichent chacun leur message. */
  envoi: number
  /** Refus de la base, tel quel, ou la phrase de connexion ; `null` : aucun problème. */
  refus: string | null
}

/**
 * Création des indicateurs prévus (administration et EJP Tech) : un seul appel à
 * `creer_indicateurs_prevus`, tout ou rien. Après une réussite, toutes les lectures de la
 * configuration sont relues. Un second clic pendant l'envoi ne fait rien.
 */
export function useCreationPrevus(): CreationPrevus {
  const client = useQueryClient()
  const [enCours, setEnCours] = useState<string | null>(null)
  const [dernier, setDernier] = useState<string | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)
  // Un second clic arrive avant que le rendu ait mis `enCours` à jour : la référence le retient.
  const occupe = useRef(false)

  const creer = useCallback(
    async (ministere: { id: string; nom: string }, modele: string) => {
      if (occupe.current) return
      occupe.current = true
      setEnCours(ministere.id)
      setDernier(ministere.id)
      setRefus(null)
      try {
        const nombre = await creerIndicateursPrevus(ministere.id, modele)
        await invaliderApresEcriture(client, ministere.id)
        setReussite(
          modele === MODELE_AUCUN
            ? reussiteAucunPrevu(ministere.nom)
            : reussiteCreationPrevus(nombre, ministere.nom),
        )
        setEnvoi((precedent) => precedent + 1)
      } catch (erreur) {
        setReussite(null)
        setRefus(messageDeRefusPrevus(erreur) ?? TEXTES_CONFIGURATION.erreur)
      } finally {
        occupe.current = false
        setEnCours(null)
      }
    },
    [client],
  )

  return { creer, enCours, dernier, reussite, envoi, refus }
}
