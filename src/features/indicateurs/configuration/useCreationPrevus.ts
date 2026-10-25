import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { choisirModelePrevus, creerIndicateursPrevus } from '@/data/indicateursConfiguration'
import { lireErreurBase, MESSAGES_COMMUNS } from '@/data/messagesBase'
import { invaliderApresEcriture } from '@/features/indicateurs/configuration/cles'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import {
  reussiteAucunPrevu,
  reussiteChoixListe,
  reussiteCreationPrevus,
  TEXTES_CONFIGURATION,
} from '@/features/indicateurs/configuration/textes'

/**
 * Phrase d'un refus, par la table de traduction de `src/data/messagesBase.ts` (m228) : « La fiche
 * a déjà « X ». Retirez-le, puis créez les indicateurs prévus. », la connexion expirée (m271), un
 * refus de droit (42501) qui dit seulement que l'élément n'est pas accessible, ou le repli d'une
 * action. `null` : un problème de connexion (l'écran dit « La connexion a échoué. Réessayez. »).
 * `formulaire` faux : une action sans formulaire (création des prévus, fenêtre de retrait).
 */
export function messageDeRefusPrevus(erreur: unknown, formulaire = false): string | null {
  const lue = lireErreurBase(erreur, { formulaire })
  switch (lue.genre) {
    case 'reseau':
    case 'delai':
      return null
    case 'acces':
      return MESSAGES_COMMUNS.acces
    case 'message':
      return lue.message
  }
}

/** Ce que reçoit l'écran pour la création des prévus. */
export interface CreationPrevus {
  /** Crée les prévus d'un ministère, ou enregistre « Aucun prévu » (`MODELE_AUCUN`). */
  creer: (ministere: { id: string; nom: string }, modele: string) => Promise<void>
  /**
   * Enregistre la liste choisie d'un ministère (`choisir_modele_prevus`, T72) : `liste.code` est le
   * code du catalogue ou `MODELE_AUCUN`, `liste.nom` son nom à l'écran. Rend vrai si la base l'a
   * acceptée.
   */
  choisir: (
    ministere: { id: string; nom: string },
    liste: { code: string; nom: string },
  ) => Promise<boolean>
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
 * Choix de la liste et création des indicateurs prévus (EJP Tech) : un seul appel à
 * `choisir_modele_prevus` ou à `creer_indicateurs_prevus`, tout ou rien. Après une réussite,
 * toutes les lectures de la configuration sont relues. Un second clic pendant l'envoi ne fait rien.
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

  const choisir = useCallback(
    async (ministere: { id: string; nom: string }, liste: { code: string; nom: string }) => {
      if (occupe.current) return false
      occupe.current = true
      setEnCours(ministere.id)
      setDernier(ministere.id)
      setRefus(null)
      try {
        await choisirModelePrevus(ministere.id, liste.code)
        await invaliderApresEcriture(client, ministere.id)
        setReussite(reussiteChoixListe(liste.nom, ministere.nom))
        setEnvoi((precedent) => precedent + 1)
        return true
      } catch (erreur) {
        setReussite(null)
        setRefus(messageDeRefusPrevus(erreur) ?? TEXTES_CONFIGURATION.erreur)
        return false
      } finally {
        occupe.current = false
        setEnCours(null)
      }
    },
    [client],
  )

  return { creer, choisir, enCours, dernier, reussite, envoi, refus }
}
