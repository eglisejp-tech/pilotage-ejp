import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { LigneCompte } from '@/features/comptes/types'

/** Ce qu'un bouton d'une ligne déclenche. */
export type ActionLigne =
  'creer' | 'relancer' | 'corriger' | 'refaire' | 'desactiver' | 'reactiver' | 'supprimer'

/**
 * Boutons d'une ligne selon son état (BRIEF, section 9 ; LISEZMOI, écarts de 13) : « Renvoyer
 * l'invitation » tant que l'adresse n'est pas confirmée, « Corriger l'adresse » tant que le compte
 * n'est pas activé (T74), « Refaire l'activation » une fois le code activé, « Réactiver » pour un
 * compte désactivé, « Créer le compte » pour un ministère actif qui n'en a pas. « Désactiver » sur
 * tout compte actif ; « Supprimer » en dernier sur chaque ministère, qu'il se supprime ou non :
 * la fenêtre dit pourquoi s'il ne se supprime pas (T75).
 */
export function actionsDeLaLigne(ligne: Pick<LigneCompte, 'etat' | 'suppression'>): ActionLigne[] {
  const suppression: ActionLigne[] = ligne.suppression === null ? [] : ['supprimer']
  switch (ligne.etat) {
    case 'sans_compte':
      return ['creer', ...suppression]
    case 'invitation_envoyee':
      return ['relancer', 'corriger', 'desactiver', ...suppression]
    case 'a_activer':
      return ['corriger', 'desactiver', ...suppression]
    case 'activee':
      return ['refaire', 'desactiver', ...suppression]
    case 'desactive':
      return ['reactiver', ...suppression]
  }
}

export const LIBELLES_ACTIONS: Readonly<Record<ActionLigne, string>> = {
  creer: TEXTES_COMPTES.creerCompte,
  relancer: TEXTES_COMPTES.relancer,
  corriger: TEXTES_COMPTES.corrigerAdresse,
  refaire: TEXTES_COMPTES.refaireActivation,
  desactiver: TEXTES_COMPTES.desactiver,
  reactiver: TEXTES_COMPTES.reactiver,
  supprimer: TEXTES_COMPTES.supprimer,
}
