import { useEffect, useState } from 'react'

// L'ouverture (le monogramme qui se dessine, la flamme qui s'allume) ne joue qu'une fois par
// chargement de l'application : à la première vérification de la session.
let ouvertureJouee = false

/**
 * Vrai pour la première vérification de la session depuis le chargement de l'application : son
 * écran d'attente joue l'ouverture (T65, moment 1), s'il dure plus de 300 ms. Les vérifications
 * suivantes (autre zone, nouvelle connexion) montrent directement la flamme vivante.
 */
export function useOuverture(enChargement: boolean): boolean {
  const [aJouer] = useState(() => !ouvertureJouee)
  useEffect(() => {
    if (enChargement) ouvertureJouee = true
  }, [enChargement])
  return aJouer
}

/** Pour les tests : l'application vient d'être chargée, l'ouverture n'a pas encore joué. */
export function oublierOuverture() {
  ouvertureJouee = false
}
