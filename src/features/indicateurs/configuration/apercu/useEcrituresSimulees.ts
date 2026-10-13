import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { RefObject } from 'react'
import { schemaAjout, schemaCalcul, schemaCorrection } from '@/data/indicateursEcriture'
import { traduireMessageBase } from '@/data/messagesBase'
import {
  ajouterCalculSimule,
  ajouterSimule,
  corrigerSimule,
  limitesSimulees,
  retirerSimule,
  verifierSimule,
} from '@/features/indicateurs/configuration/apercu/simulation'
import type { EtatSimule } from '@/features/indicateurs/configuration/apercu/simulation'
import { invaliderConfiguration } from '@/features/indicateurs/configuration/cles'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'

const ATTENTE_SIMULEE_MS = 150
const REFUS_EXEMPLE = 'Cette fiche a déjà « Publications ».'

/** Jour de Paris et dimanche de référence de l'aperçu : une date fixe, jamais celle du navigateur. */
const SEMAINE_EXEMPLE = { aujourdhui: '2026-10-12', dimanche: '2026-10-11' }

/**
 * Les écritures de l'aperçu de développement : les mêmes interfaces que les écritures réelles, mais
 * appliquées à l'état d'exemple (`simulation.ts`) après une courte attente. `envoi` vaut `echec`
 * pour simuler une connexion perdue, `refus` pour un refus de la base. Chaque envoi passe par les
 * schémas Zod des formulaires, comme l'appel réel, et relit les contrôles et les limites ensuite.
 */
export function useEcrituresSimulees(
  courant: RefObject<EtatSimule>,
  ecrire: (etat: EtatSimule) => void,
  envoi: string | null,
): EcrituresIndicateurs {
  const client = useQueryClient()
  return useMemo((): EcrituresIndicateurs => {
    const attendre = async () => {
      await new Promise((resolve) => setTimeout(resolve, ATTENTE_SIMULEE_MS))
      // L'erreur de fetch hors ligne : une autre `Error` serait lue comme un refus inattendu.
      if (envoi === 'echec') throw new TypeError('Failed to fetch')
      if (envoi === 'refus') {
        throw Object.assign(new Error(REFUS_EXEMPLE), { code: 'P0001' })
      }
    }
    const appliquer = async (suivant: EtatSimule) => {
      ecrire(suivant)
      await invaliderConfiguration(client)
    }
    const maintenant = () => new Date().toISOString()
    return {
      semaine: () => Promise.resolve(SEMAINE_EXEMPLE),
      ajouter: async (ministereId, entree, remplaceId) => {
        const ajout = schemaAjout.parse(entree)
        await attendre()
        await appliquer(
          ajouterSimule(courant.current, ministereId, ajout, remplaceId, maintenant()),
        )
      },
      ajouterCalcul: async (ministereId, entree, remplaceId) => {
        const calcul = schemaCalcul.parse(entree)
        await attendre()
        await appliquer(
          ajouterCalculSimule(courant.current, ministereId, calcul, remplaceId, maintenant()),
        )
      },
      corriger: async (ministereId, indicateurId, entree) => {
        const correction = schemaCorrection.parse(entree)
        await attendre()
        await appliquer(
          corrigerSimule(courant.current, ministereId, indicateurId, correction, maintenant()),
        )
      },
      retirer: async (ministereId, indicateurId, motif) => {
        await attendre()
        const { etat, calculs } = retirerSimule(
          courant.current,
          ministereId,
          indicateurId,
          motif,
          maintenant(),
        )
        await appliquer(etat)
        return calculs
      },
      // Comme `verifierLibelle` : chaque message prend la phrase de la table de traduction (m233).
      verifier: (libelle, _nature, ministereId) =>
        Promise.resolve(
          verifierSimule(courant.current, ministereId, libelle).map((ligne) => ({
            ...ligne,
            message: traduireMessageBase(ligne.message),
          })),
        ),
      limites: (ministereId) => Promise.resolve(limitesSimulees(courant.current, ministereId)),
      termes: (filtre) =>
        Promise.resolve(
          courant.current.termes.filter((terme) =>
            'calculId' in filtre
              ? terme.calcul_id === filtre.calculId
              : terme.source_id === filtre.sourceId,
          ),
        ),
    }
  }, [client, courant, ecrire, envoi])
}
