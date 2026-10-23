import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DELAI_INDICATEUR_MS, DUREE_MIN_INDICATEUR_MS } from '@/components/etats/tempsChargement'

export interface Attente {
  /**
   * Vrai tant que l'écran garde son chargement : pendant la lecture, puis, si l'indicateur s'est
   * montré (après 300 ms), jusqu'à ce qu'il ait été vu `dureeMin` (600 ms par défaut).
   */
  attente: boolean
  /** Une lecture a eu lieu depuis l'arrivée de l'écran : le contenu arrive en fondu. */
  fondu: boolean
}

export interface OptionsAttente {
  /**
   * L'indicateur se montre dès l'arrivée de l'écran, sans les 300 ms de vide, et reste `dureeMin`
   * même si la lecture finit avant : l'ouverture de l'outil (T67). Seulement pour la lecture en
   * cours à l'arrivée de l'écran ; les suivantes suivent la règle commune.
   */
  immediat?: boolean
}

/**
 * Règle de temps des chargements (T65) pour l'écran qui choisit entre son chargement et son
 * contenu. Une réponse en moins de 300 ms ne montre rien : le contenu arrive aussitôt. Une réponse
 * plus lente laisse l'indicateur au moins `dureeMin` à l'écran, même si elle arrive juste après
 * lui : rien ne clignote. Une erreur attend de même la fin de ce temps. La durée minimale est
 * celle demandée au moment où l'indicateur apparaît : la changer ensuite ne relance rien.
 */
export function useAttenteChargement(
  enChargement: boolean,
  dureeMin: number = DUREE_MIN_INDICATEUR_MS,
  { immediat = false }: OptionsAttente = {},
): Attente {
  const [precedent, setPrecedent] = useState(enChargement)
  const [montre, setMontre] = useState(() => immediat && enChargement)
  // Durée minimale en cours (en ms) depuis l'apparition de l'indicateur ; null quand elle est finie.
  const [tenue, setTenue] = useState<number | null>(() =>
    immediat && enChargement ? dureeMin : null,
  )
  const [attendu, setAttendu] = useState(enChargement)
  const dureeVoulue = useRef(dureeMin)

  useEffect(() => {
    dureeVoulue.current = dureeMin
  }, [dureeMin])

  // Une nouvelle lecture repart de zéro : rien pendant 300 ms, puis l'indicateur.
  if (precedent !== enChargement) {
    setPrecedent(enChargement)
    if (enChargement) {
      setMontre(false)
      setTenue(null)
      setAttendu(true)
    }
  }

  // Effet de mise en page : la minuterie s'arrête dans le rendu même où la lecture finit. Un effet
  // ordinaire s'arrêterait plus tard, et un fil chargé pourrait alors montrer l'indicateur après
  // le contenu (le contenu, puis la flamme 600 ms, puis le contenu). Un indicateur déjà montré
  // (dès l'arrivée de l'écran) n'attend pas.
  useLayoutEffect(() => {
    if (!enChargement || montre) return
    const minuterie = window.setTimeout(() => {
      setMontre(true)
      setTenue(dureeVoulue.current)
    }, DELAI_INDICATEUR_MS)
    return () => window.clearTimeout(minuterie)
  }, [enChargement, montre])

  // Le temps minimal court depuis l'apparition de l'indicateur, que la lecture finisse ou non.
  // Effet de mise en page lui aussi : sa minuterie part avant celles des effets ordinaires de
  // l'indicateur (l'ouverture passe à la flamme vivante au bout du même temps) ; à durée égale,
  // elle finit donc la première, et le contenu remplace le logo complet sans flamme vivante entre
  // les deux.
  useLayoutEffect(() => {
    if (tenue === null) return
    const minuterie = window.setTimeout(() => setTenue(null), tenue)
    return () => window.clearTimeout(minuterie)
  }, [tenue])

  return { attente: enChargement || (montre && tenue !== null), fondu: attendu }
}
