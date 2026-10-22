import { useEffect, useState } from 'react'
import { DELAI_INDICATEUR_MS } from '@/components/etats/tempsChargement'

/**
 * Faux au montage, vrai après `delai` (300 ms par défaut, T65) : ce qui accompagne un indicateur
 * de chargement (les places réservées en gris) n'apparaît qu'avec lui.
 */
export function useApresDelai(delai: number = DELAI_INDICATEUR_MS): boolean {
  const [passe, setPasse] = useState(false)
  useEffect(() => {
    const minuterie = window.setTimeout(() => setPasse(true), delai)
    return () => window.clearTimeout(minuterie)
  }, [delai])
  return passe
}
