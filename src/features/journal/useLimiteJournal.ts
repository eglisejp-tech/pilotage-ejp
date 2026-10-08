import { useState } from 'react'
import { TAILLE_PAGE_JOURNAL } from '@/data/journal'
import type { FiltresJournal } from '@/features/journal/filtres'

/**
 * Nombre de lignes demandées : 50 d'abord, puis 50 de plus à chaque « Afficher 50 lignes de plus ».
 * Changer un filtre revient à 50 : le compte est celui des filtres en cours, jamais celui d'avant.
 * La lecture se refait avec la nouvelle limite (une seule lecture, sans doublon ni trou même si le
 * journal a gagné des lignes entre-temps).
 */
export function useLimiteJournal(filtres: FiltresJournal): {
  limite: number
  afficherPlus: () => void
} {
  const cle = JSON.stringify(filtres)
  const [demande, setDemande] = useState({ cle, limite: TAILLE_PAGE_JOURNAL })
  const limite = demande.cle === cle ? demande.limite : TAILLE_PAGE_JOURNAL
  return {
    limite,
    afficherPlus: () => setDemande({ cle, limite: limite + TAILLE_PAGE_JOURNAL }),
  }
}
