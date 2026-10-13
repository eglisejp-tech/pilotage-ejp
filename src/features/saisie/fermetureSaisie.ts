import { createContext, useContext } from 'react'

// Fermeture d'un panneau de saisie (m265) : « Retour », Échap, le fond et les boutons « Annuler »
// des formulaires passent par le panneau, qui demande une confirmation si un champ a changé.

export interface FermetureSaisie {
  /** Ferme avec `fermer`, après « Fermer sans enregistrer ? » si un champ a changé. */
  demander: (fermer: () => void) => void
  /** Une saisie vient d'être enregistrée : ce qui est dans les champs n'est plus à perdre. */
  enregistree: () => void
}

export const ContexteFermetureSaisie = createContext<FermetureSaisie | null>(null)

/**
 * Pour un bouton « Annuler » de formulaire : dans un panneau de saisie, la fermeture passe par la
 * confirmation ; ailleurs, `fermer` s'appelle directement.
 */
export function useFermetureSaisie(fermer: () => void): () => void {
  const contexte = useContext(ContexteFermetureSaisie)
  return contexte ? () => contexte.demander(fermer) : fermer
}

/** Pour une réussite affichée : dit au panneau que la saisie est enregistrée (ou rien, hors panneau). */
export function useSaisieEnregistree(): () => void {
  const contexte = useContext(ContexteFermetureSaisie)
  return contexte?.enregistree ?? rien
}

function rien() {}
