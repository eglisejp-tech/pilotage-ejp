import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// « Lecture impossible » (guide des messages, 10.10) : une page, un bloc ou un panneau n'a pas pu
// lire ses données. Premier échec : « La connexion a échoué. Réessayez. » et « Réessayer ».
// Échec qui revient après « Réessayer » (m250) : la même phrase, suivie du recours commun.
//
// Pendant le nouvel essai, l'écran d'erreur laisse la place au chargement : l'échec qui suit est
// un nouvel écran, qui ne sait rien du précédent. Le clic sur « Réessayer » est donc noté ici, avec
// l'adresse de la page, et le premier écran d'erreur qui s'affiche ensuite sur cette page le
// reprend (et l'efface : un autre bloc qui échouerait plus tard reçoit la phrase commune).

export const LECTURE_IMPOSSIBLE = 'La connexion a échoué. Réessayez.'

/** Deuxième échec de suite, après « Réessayer » (m250). */
export const LECTURE_IMPOSSIBLE_RECOURS =
  'La connexion a échoué. Réessayez, et si le problème revient, prévenez EJP Tech.'

/**
 * Une lecture abandonne après 10 s (DELAI_MAX_REQUETE) : un échec affiché moins de 15 s après un
 * « Réessayer » est celui du nouvel essai.
 */
const FENETRE_REESSAI_MS = 15_000

let dernierReessai: { instant: number; adresse: string } | null = null

/** À appeler au clic sur « Réessayer » d'une lecture. */
export function noterReessai() {
  dernierReessai = { instant: Date.now(), adresse: window.location.pathname }
}

/** Plus aucun « Réessayer » en mémoire (il a servi, ou entre deux tests). */
export function oublierReessai() {
  dernierReessai = null
}

function reessaiRecent(): boolean {
  return (
    dernierReessai !== null &&
    dernierReessai.adresse === window.location.pathname &&
    Date.now() - dernierReessai.instant < FENETRE_REESSAI_MS
  )
}

/**
 * Vrai quand l'échec affiché suit un « Réessayer » : l'écran d'erreur apparaît juste après un
 * nouvel essai sur la même page (l'écran est passé par « Chargement »), ou il est resté affiché
 * pendant un nouvel essai (`enCours` repasse à faux sans que la lecture ait réussi).
 */
export function useEchecRepete(enCours = false): boolean {
  const [repete, setRepete] = useState(reessaiRecent)
  const [enCoursPrecedent, setEnCoursPrecedent] = useState(enCours)
  if (enCoursPrecedent !== enCours) {
    setEnCoursPrecedent(enCours)
    if (enCoursPrecedent && !enCours) setRepete(true)
  }
  // Le « Réessayer » noté sert à ce seul écran d'erreur.
  useEffect(() => {
    if (repete) oublierReessai()
  }, [repete])
  return repete
}

/**
 * Texte d'une lecture en échec : la phrase commune devient celle du recours quand l'échec revient
 * après « Réessayer ». Une autre phrase (un message propre à l'écran) reste telle quelle.
 */
export function texteLecture(texte: ReactNode, repete: boolean): ReactNode {
  return repete && texte === LECTURE_IMPOSSIBLE ? LECTURE_IMPOSSIBLE_RECOURS : texte
}
