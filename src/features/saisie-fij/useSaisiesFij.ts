import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { lireCarteFij, lireSemaine } from '@/data/eglise'
import {
  CODE_MINISTERE_FIJ,
  enregistrerCarteFij,
  enregistrerStatistiquesFij,
  lireCodeMinistere,
  lireStatistiquesFij,
} from '@/data/fij'
import type { LigneStatistiqueFij } from '@/data/fij'
import type { SaisieCarteFij, SaisieStatistiquesFij } from '@/features/saisie-fij/schemas'
import type { LigneVue } from '@/lib/base'

/** Premier élément des clés de requête des saisies FIJ. */
const RACINE = 'saisie-fij'

/** Clé de la lecture des chiffres par département, partagée avec le bloc de la fiche. */
export const CLE_STATISTIQUES_FIJ = ['fij', 'statistiques'] as const

/** Le ministère du compte est-il le ministère `fij` ? Les deux saisies FIJ lui sont réservées. */
export type EtatMinistereFij = 'chargement' | 'erreur' | 'fij' | 'autre'

export function useEstMinistereFij(ministereId: string): {
  etat: EtatMinistereFij
  reessayer: () => void
} {
  const code = useQuery({
    queryKey: [RACINE, 'code', ministereId],
    queryFn: () => lireCodeMinistere(ministereId),
  })
  const etat: EtatMinistereFij = code.isError
    ? 'erreur'
    : code.isPending
      ? 'chargement'
      : code.data === CODE_MINISTERE_FIJ
        ? 'fij'
        : 'autre'
  return { etat, reessayer: () => void code.refetch() }
}

export type EtatSaisieCarte =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | {
      etat: 'pret'
      carte: LigneVue<'v_carte_fij'>[]
      enregistrer: (valeurs: SaisieCarteFij) => Promise<void>
    }

/** Lecture de la carte des FIJ (dernière valeur de chaque département) et son envoi. */
export function useSaisieCarte(ministereId: string): EtatSaisieCarte {
  const client = useQueryClient()
  const carte = useQuery({ queryKey: [RACINE, 'carte'], queryFn: lireCarteFij })
  const enregistrer = useCallback(
    async (valeurs: SaisieCarteFij) => {
      await enregistrerCarteFij(ministereId, valeurs)
      await Promise.all([
        client.invalidateQueries({ queryKey: [RACINE] }),
        client.invalidateQueries({ queryKey: ['eglise'] }),
      ])
    },
    [client, ministereId],
  )
  if (carte.isError) return { etat: 'erreur', reessayer: () => void carte.refetch() }
  if (carte.isPending) return { etat: 'chargement' }
  return { etat: 'pret', carte: carte.data, enregistrer }
}

export type EtatSaisieStatistiques =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | {
      etat: 'pret'
      dimancheReference: string
      statistiques: LigneStatistiqueFij[]
      enregistrer: (saisie: SaisieStatistiquesFij) => Promise<void>
    }

/** Lectures des chiffres par département (semaine de référence, 10 dimanches) et leur envoi. */
export function useSaisieStatistiques(): EtatSaisieStatistiques {
  const client = useQueryClient()
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const statistiques = useQuery({ queryKey: CLE_STATISTIQUES_FIJ, queryFn: lireStatistiquesFij })
  const enregistrer = useCallback(
    async (saisie: SaisieStatistiquesFij) => {
      await enregistrerStatistiquesFij(saisie)
      await client.invalidateQueries({ queryKey: CLE_STATISTIQUES_FIJ })
    },
    [client],
  )
  // v_semaine sans ligne (hors aal2) : traité comme un problème passager.
  if (semaine.isError || statistiques.isError || semaine.data === null) {
    return {
      etat: 'erreur',
      reessayer: () => {
        void semaine.refetch()
        void statistiques.refetch()
      },
    }
  }
  if (semaine.isPending || statistiques.isPending) return { etat: 'chargement' }
  return {
    etat: 'pret',
    dimancheReference: semaine.data.dimanche,
    statistiques: statistiques.data,
    enregistrer,
  }
}
