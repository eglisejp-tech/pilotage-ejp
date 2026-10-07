import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'

/** Ce qu'un bouton d'une ligne déclenche. */
export type ActionLigne = 'creer' | 'relancer' | 'refaire' | 'desactiver' | 'reactiver'

/**
 * Boutons d'une ligne selon son état (BRIEF, section 9 ; LISEZMOI, écarts de 13) : « Relancer
 * l'invitation » tant que l'adresse n'est pas confirmée, « Refaire l'activation » une fois le
 * code activé, rien de plus pour « À activer », « Réactiver » pour un compte désactivé, « Créer
 * le compte » pour un ministère actif qui n'en a pas. « Désactiver » sur tout compte actif.
 */
export function actionsDeLaLigne(ligne: Pick<LigneCompte, 'etat'>): ActionLigne[] {
  switch (ligne.etat) {
    case 'sans_compte':
      return ['creer']
    case 'invitation_envoyee':
      return ['relancer', 'desactiver']
    case 'a_activer':
      return ['desactiver']
    case 'activee':
      return ['refaire', 'desactiver']
    case 'desactive':
      return ['reactiver']
  }
}

export const LIBELLES_ACTIONS: Readonly<Record<ActionLigne, string>> = {
  creer: TEXTES_COMPTES.creerCompte,
  relancer: TEXTES_COMPTES.relancer,
  refaire: TEXTES_COMPTES.refaireActivation,
  desactiver: TEXTES_COMPTES.desactiver,
  reactiver: TEXTES_COMPTES.reactiver,
}
