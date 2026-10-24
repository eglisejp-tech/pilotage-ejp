import { createContext } from 'react'

/**
 * Ce que la mise en page offre à une saisie en page entière, sous 600 px (proposition 4, T69,
 * écart 2) : l'en-tête simplifié de la maquette 08, « Retour » à gauche et le compte à droite, à
 * la place de l'en-tête complet (nom de l'outil, compte, menu).
 */
export interface EnTeteSaisie {
  /**
   * La saisie prend l'en-tête : « Retour » y appelle `retour` (la fermeture de la saisie, avec
   * « Fermer sans enregistrer ? »). Renvoie la fonction qui rend l'en-tête complet.
   */
  ouvrir: (retour: () => void) => () => void
}

/** Hors de la mise en page connectée (tests, écrans isolés), la saisie garde son « Retour ». */
export const ContexteEnTeteSaisie = createContext<EnTeteSaisie | null>(null)
