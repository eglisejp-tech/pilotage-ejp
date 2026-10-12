// Textes des boutons et des fenêtres « Changer le statut » et « Marquer traité » (étape 5, lot P1 ;
// BRIEF section 9, « Marquer traité » et « Changer le statut »). Textes proposés : le BRIEF fixe
// les titres, les libellés et les boutons ; les phrases de note sont « Proposé » jusqu'à leur
// validation par la coordination (liste : `docs/conception/textes-points-actions.md`). Le rappel sur les données personnelles et la phrase de connexion
// perdue viennent des briques de `src/features/saisie/`.

import type { StatutChoisi } from '@/data/pointsEcriture'
import { LIBELLE_STATUT } from '@/lib/metier/points'

export const TEXTES_ACTIONS_POINT = {
  /** Boutons posés sur un point (À décider, fiches 04 et 12, Vos points, écran 05). */
  boutonStatut: 'Changer le statut',
  boutonTraite: 'Marquer traité',
  boutonMentions: 'Modifier les mentions',

  statut: {
    titre: 'Changer le statut',
    /** Titre du groupe des trois statuts, avec son aide `point.statut`. */
    libelle: 'Statut',
    /** Texte visible sous les statuts : l'effet du statut « En attente de décision ». */
    note: 'Un point « En attente de décision » passe avant les autres dans « À décider ».',
    bouton: 'Enregistrer le statut',
    boutonEnCours: 'Envoi en cours',
    annuler: 'Annuler',
    /** Connexion perdue : le statut choisi reste dans le formulaire. */
    erreurConnexion:
      'La connexion a échoué. Votre choix est encore dans le formulaire : réessayez.',
  },

  /**
   * Fenêtre « Modifier les mentions » (T54, ministère créateur, berger et conseil, point non
   * traité). Textes proposés, à valider avec ceux de la liste de `docs/conception/textes-points-actions.md`.
   */
  mentions: {
    titre: 'Modifier les mentions',
    /** Titre du groupe de cases. */
    libelle: 'Ministères mentionnés',
    /** Texte visible sous les cases : ce que voit un ministère ajouté, et un ministère retiré. */
    notes: [
      'Un ministère mentionné voit ce point, et seulement ce point. Un ministère retiré ne le voit plus.',
      'Le berger et le conseil voient tous les points.',
    ],
    bouton: 'Enregistrer les mentions',
    boutonEnCours: 'Envoi en cours',
    annuler: 'Annuler',
    /** Suffixe d'un ministère désactivé qui reste mentionné : on peut le retirer, plus l'ajouter. */
    desactive: '(désactivé)',
    erreurConnexion: 'La connexion a échoué. Vos choix sont encore dans le formulaire : réessayez.',
  },

  traite: {
    titre: 'Marquer traité',
    /** Champ du ministère (créateur ou mentionné) : obligatoire, 10 à 280 caractères. */
    libelleMinistere: 'Ce qui a été traité, et comment',
    /** Champ du berger et du conseil : facultatif. */
    libelleDecideur: 'Commentaire (facultatif)',
    /** Qui lit le commentaire : texte visible, jamais une aide en bulle (BRIEF section 8). */
    noteLecteurs:
      "Le commentaire s'affiche sur le point. Les ministères liés au point, le berger, le conseil et EJP Tech le lisent.",
    /** Le point ne revient pas : texte visible, juste au-dessus des boutons (BRIEF section 9). */
    nonRouvert: 'Un point traité ne se rouvre pas.',
    bouton: 'Marquer traité',
    boutonEnCours: 'Envoi en cours',
    annuler: 'Annuler',
    erreurConnexion:
      'La connexion a échoué. Votre commentaire est encore dans le formulaire : réessayez.',
  },
} as const

/** Statuts qu'on peut choisir, dans l'ordre d'affichage, avec leur libellé de `LIBELLE_STATUT`. */
export const CHOIX_STATUT: readonly { valeur: StatutChoisi; libelle: string }[] = [
  { valeur: 'a_traiter', libelle: LIBELLE_STATUT.a_traiter },
  { valeur: 'en_cours', libelle: LIBELLE_STATUT.en_cours },
  { valeur: 'attente_decision', libelle: LIBELLE_STATUT.attente_decision },
]
