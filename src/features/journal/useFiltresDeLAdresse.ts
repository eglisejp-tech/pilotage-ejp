import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { ecrireFiltres, lireFiltres } from '@/features/journal/filtres'
import type { FiltresJournal } from '@/features/journal/filtres'

/**
 * Les filtres de l'écran 06, dans l'adresse (`compte`, `action`, `periode`, `ministere`). Changer
 * un filtre ajoute une entrée d'historique : le bouton « Retour » du navigateur le défait.
 */
export function useFiltresDeLAdresse(): [FiltresJournal, (suivants: FiltresJournal) => void] {
  const [parametres, setParametres] = useSearchParams()
  const filtres = useMemo(() => lireFiltres(parametres), [parametres])
  const changer = useCallback(
    (suivants: FiltresJournal) => setParametres(ecrireFiltres(parametres, suivants)),
    [parametres, setParametres],
  )
  return [filtres, changer]
}
