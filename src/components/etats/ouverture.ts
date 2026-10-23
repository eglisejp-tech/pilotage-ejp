import { useEffect, useState } from 'react'

// L'ouverture (le monogramme qui se dessine, la flamme qui s'allume) ne joue qu'une fois par
// chargement de l'application : à la première vérification de la session.
let ouvertureJouee = false

/**
 * Vrai pour la première vérification de la session depuis le chargement de l'application (T65,
 * moment 1 ; T67) : son écran d'attente joue l'ouverture, tout de suite et en entier (2,5 s), sauf
 * avec moins d'animations. Les vérifications suivantes (autre zone, nouvelle connexion, changement
 * de page) suivent la règle de toute attente : rien pendant 300 ms, puis la flamme vivante.
 *
 * Le choix se fait au premier rendu de l'écran, si une lecture est en cours. L'ouverture est alors
 * notée comme jouée dès qu'elle commence, même si la lecture finit avant l'effet. L'état garde le
 * choix : le double montage de StrictMode, qui rejoue les effets sans refaire l'état, ne change
 * rien à l'ouverture en cours.
 */
export function useOuverture(enChargement: boolean): boolean {
  const [aJouer] = useState(() => enChargement && !ouvertureJouee)
  useEffect(() => {
    if (aJouer) ouvertureJouee = true
  }, [aJouer])
  return aJouer
}

/** Pour les tests : l'application vient d'être chargée, l'ouverture n'a pas encore joué. */
export function oublierOuverture() {
  ouvertureJouee = false
}

/**
 * Pour les tests : l'ouverture a déjà joué. Les tests qui ne la vérifient pas n'attendent pas ses
 * 2,5 s (src/test/setup.ts).
 */
export function passerOuverture() {
  ouvertureJouee = true
}
