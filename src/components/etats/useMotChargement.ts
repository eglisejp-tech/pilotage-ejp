import { useEffect, useState } from 'react'
import { MESSAGES_COMMUNS } from '@/data/messagesBase'
import { DELAI_CHARGEMENT_LONG } from '@/lib/requetes'

/** « Chargement » n'apparaît qu'après 300 ms : une réponse rapide ne fait rien clignoter. */
export const DELAI_AFFICHAGE_CHARGEMENT = 300

/**
 * Mot d'une zone `status` de chargement (LISEZMOI, « États » ; guide des messages, 10.6) : rien
 * pendant 300 ms, puis `mot` (« Chargement »), puis, après `DELAI_CHARGEMENT_LONG` (4 s),
 * « Chargement plus long que d'habitude », dans la même zone, sans animation (m248). Les lectures
 * abandonnent à 10 s : l'écran d'erreur prend alors la place.
 */
export function useMotChargement(mot = 'Chargement'): string | null {
  const [etape, setEtape] = useState<'rien' | 'mot' | 'long'>('rien')

  useEffect(() => {
    const affichage = setTimeout(() => setEtape('mot'), DELAI_AFFICHAGE_CHARGEMENT)
    const long = setTimeout(() => setEtape('long'), DELAI_CHARGEMENT_LONG)
    return () => {
      clearTimeout(affichage)
      clearTimeout(long)
    }
  }, [])

  if (etape === 'rien') return null
  return etape === 'mot' ? mot : MESSAGES_COMMUNS.chargementLong
}
