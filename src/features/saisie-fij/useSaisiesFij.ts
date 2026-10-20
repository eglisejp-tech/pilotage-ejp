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

/** Ce que la garde décide avant toute lecture de la saisie : attendre, l'échec, ou un autre ministère. */
type AvantSaisie =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  /** Le ministère du compte n'est pas `fij` : la page non disponible, sans autre requête. */
  | { etat: 'autre' }

/**
 * La lecture du code du ministère précède celle de la saisie et compte dans la même attente
 * (T65) : une seule flamme du début à la fin, sans clignoter entre les deux lectures. La saisie
 * ne se lit qu'une fois le ministère `fij` confirmé (`enabled`) ; null quand c'est le cas.
 */
function avantSaisie(garde: { etat: EtatMinistereFij; reessayer: () => void }): AvantSaisie | null {
  if (garde.etat === 'chargement') return { etat: 'chargement' }
  if (garde.etat === 'erreur') return { etat: 'erreur', reessayer: garde.reessayer }
  if (garde.etat === 'autre') return { etat: 'autre' }
  return null
}

export type EtatSaisieCarte =
  | AvantSaisie
  | {
      etat: 'pret'
      carte: LigneVue<'v_carte_fij'>[]
      enregistrer: (valeurs: SaisieCarteFij) => Promise<void>
    }

/**
 * Carte des FIJ, réservée au ministère `fij` : le code du ministère du compte, puis la carte
 * (dernière valeur de chaque département), et son envoi.
 */
export function useSaisieCarte(ministereId: string): EtatSaisieCarte {
  const client = useQueryClient()
  const garde = useEstMinistereFij(ministereId)
  const carte = useQuery({
    queryKey: [RACINE, 'carte'],
    queryFn: lireCarteFij,
    enabled: garde.etat === 'fij',
  })
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
  const avant = avantSaisie(garde)
  if (avant) return avant
  if (carte.isError) return { etat: 'erreur', reessayer: () => void carte.refetch() }
  if (carte.isPending) return { etat: 'chargement' }
  return { etat: 'pret', carte: carte.data, enregistrer }
}

export type EtatSaisieStatistiques =
  | AvantSaisie
  | {
      etat: 'pret'
      dimancheReference: string
      statistiques: LigneStatistiqueFij[]
      enregistrer: (saisie: SaisieStatistiquesFij) => Promise<void>
    }

/**
 * Chiffres par département, réservés au ministère `fij` : le code du ministère du compte, puis
 * la semaine de référence et les 10 dimanches, et leur envoi.
 */
export function useSaisieStatistiques(ministereId: string): EtatSaisieStatistiques {
  const client = useQueryClient()
  const garde = useEstMinistereFij(ministereId)
  const fij = garde.etat === 'fij'
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine, enabled: fij })
  const statistiques = useQuery({
    queryKey: CLE_STATISTIQUES_FIJ,
    queryFn: lireStatistiquesFij,
    enabled: fij,
  })
  const enregistrer = useCallback(
    async (saisie: SaisieStatistiquesFij) => {
      await enregistrerStatistiquesFij(saisie)
      await client.invalidateQueries({ queryKey: CLE_STATISTIQUES_FIJ })
    },
    [client],
  )
  const avant = avantSaisie(garde)
  if (avant) return avant
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
