import { useMemo, useSyncExternalStore } from 'react'
import { analyserRegistre, EVENEMENT_REGISTRE, lireRegistreBrut } from '@/lib/espaces'
import type { Registre } from '@/lib/espaces'

function abonner(rappel: () => void): () => void {
  window.addEventListener('storage', rappel)
  window.addEventListener(EVENEMENT_REGISTRE, rappel)
  return () => {
    window.removeEventListener('storage', rappel)
    window.removeEventListener(EVENEMENT_REGISTRE, rappel)
  }
}

/** Registre des comptes ouverts sur l'appareil (T73), relu à chaque changement. */
export function useRegistre(): Registre {
  const brut = useSyncExternalStore(abonner, lireRegistreBrut, () => null)
  return useMemo(() => analyserRegistre(brut), [brut])
}
