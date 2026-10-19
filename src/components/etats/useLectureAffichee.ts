import { useState } from 'react'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'

const EN_CHARGEMENT = { etat: 'chargement' } as const

export interface LectureAffichee<T> {
  /**
   * La lecture telle que l'écran doit l'afficher : encore « chargement » tant que l'indicateur
   * tient ses 600 ms (T65), puis la lecture reçue.
   */
  lecture: T | typeof EN_CHARGEMENT
  /** Une lecture a précédé le contenu : il arrive en fondu (`Arrivee`). */
  fondu: boolean
}

/**
 * Règle de temps de T65 pour un écran dont plusieurs endroits dépendent de la même lecture (un
 * bouton dans l'en-tête, un nombre à côté d'un titre, le titre d'un panneau, puis la liste) : tous
 * passent ensemble du chargement au contenu, quand l'indicateur a tenu ses 600 ms. Pendant cette
 * tenue, l'écran reçoit la lecture « chargement » du début de l'attente (avec ses champs), jamais
 * une donnée en avance. La lecture gardée se compare par son état, pas par son identité : un
 * crochet qui rend un nouvel objet à chaque rendu ne relance rien.
 */
export function useLectureAffichee<T extends { etat: string }>(lecture: T): LectureAffichee<T> {
  const enChargement = lecture.etat === 'chargement'
  const { attente, fondu } = useAttenteChargement(enChargement)
  const [gardee, setGardee] = useState<T | null>(enChargement ? lecture : null)
  // Début d'une attente : on garde sa lecture ; fin de la tenue : on l'oublie.
  if (enChargement && gardee === null) setGardee(lecture)
  if (!attente && gardee !== null) setGardee(null)
  if (attente && !enChargement) return { lecture: gardee ?? EN_CHARGEMENT, fondu }
  return { lecture, fondu }
}
