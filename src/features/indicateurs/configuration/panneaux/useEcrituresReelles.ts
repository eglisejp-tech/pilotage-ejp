import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lireSemaine } from '@/data/eglise'
import {
  ajouterCalcul,
  ajouterIndicateur,
  corrigerIndicateur,
  lireLimites,
  lireTermes,
  retirerIndicateur,
  verifierLibelle,
} from '@/data/indicateursEcriture'
import { invaliderApresEcriture } from '@/features/indicateurs/configuration/cles'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'

/**
 * Les écritures réelles de la configuration des indicateurs : un appel à la base, puis la relecture
 * de tout ce que l'écriture change (les deux écrans de configuration, la fiche et les saisies du
 * ministère : `invaliderApresEcriture`). Le jour de Paris et le dimanche de référence viennent de
 * `v_semaine`, lue seulement quand un panneau d'ajout s'ouvre, jamais de la date du navigateur.
 */
export function useEcrituresReelles(): EcrituresIndicateurs {
  const client = useQueryClient()
  return useMemo(
    (): EcrituresIndicateurs => ({
      semaine: async () => {
        const semaine = await lireSemaine()
        return semaine === null
          ? null
          : { aujourdhui: semaine.aujourdhui, dimanche: semaine.dimanche }
      },
      ajouter: async (ministereId, entree, remplaceId) => {
        await ajouterIndicateur(ministereId, entree, remplaceId)
        await invaliderApresEcriture(client, ministereId)
      },
      ajouterCalcul: async (ministereId, entree, remplaceId) => {
        await ajouterCalcul(entree, remplaceId)
        await invaliderApresEcriture(client, ministereId)
      },
      corriger: async (ministereId, indicateurId, entree) => {
        await corrigerIndicateur(indicateurId, entree)
        await invaliderApresEcriture(client, ministereId)
      },
      retirer: async (ministereId, indicateurId, motif) => {
        const calculs = await retirerIndicateur(indicateurId, motif)
        await invaliderApresEcriture(client, ministereId)
        return calculs
      },
      verifier: verifierLibelle,
      limites: lireLimites,
      termes: lireTermes,
    }),
    [client],
  )
}
