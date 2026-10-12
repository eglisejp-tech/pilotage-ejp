// Libellés des actions du journal (BRIEF, section 6, colonne « Action » de l'écran 06) et actions
// que chaque profil peut lire. L'ordre est celui du tableau du brief : c'est celui du filtre
// « Action ». Les libellés des codes de l'étape 4 (indicateurs, chiffres par département,
// signalements) ne sont pas dans le brief : ils sont « Proposé », écrits sur le même modèle.

import type { TypeCompte } from '@/lib/base'

export const LIBELLES_ACTIONS = {
  mesure_saisie: 'A saisi des chiffres',
  fij_saisie: 'A saisi la carte des FIJ',
  fij_statistiques_saisies: 'A saisi les chiffres par département',
  participation_saisie: 'A saisi une présence',
  evenement_ajoute: 'A ajouté un événement',
  evenement_modifie: 'A mis à jour un événement',
  reunion_saisie: 'A renseigné la prochaine réunion',
  point_cree: 'A créé un point',
  point_statut: "A changé le statut d'un point",
  point_traite: 'A marqué traité',
  session_declaree: 'A déclaré une session',
  session_modifiee: 'A modifié une session',
  session_supprimee: 'A supprimé une session',
  ministere_cree: 'A créé un ministère',
  compte_cree: 'A créé un compte',
  invitation_relancee: 'A relancé une invitation',
  compte_desactive: 'A désactivé un compte',
  compte_reactive: 'A réactivé un compte',
  double_auth_reinitialisee: "A refait l'activation",
  indicateur_cree: 'A créé un indicateur',
  indicateurs_prevus_crees: 'A créé les indicateurs prévus',
  indicateur_corrige: 'A corrigé un indicateur',
  indicateur_valide: 'A validé un indicateur',
  indicateur_refuse: 'A refusé un indicateur',
  indicateur_retire: 'A retiré un indicateur',
  difficulte_signalee: 'A signalé une difficulté',
  signalement_clos: 'A clos un signalement',
  texte_relu: 'A relu un texte',
  texte_masque: 'A masqué un texte',
} as const

/** Code d'une action du journal (`journal.action`). */
export type CodeAction = keyof typeof LIBELLES_ACTIONS

/** Dit quand une ligne porte une action que cet écran ne connaît pas encore. */
export const LIBELLE_ACTION_INCONNUE = 'Action enregistrée'

export const CODES_ACTIONS = Object.keys(LIBELLES_ACTIONS) as CodeAction[]

export function estCodeAction(valeur: string): valeur is CodeAction {
  return Object.hasOwn(LIBELLES_ACTIONS, valeur)
}

/** « A saisi des chiffres » ; une action inconnue garde un libellé neutre, jamais son code. */
export function libelleAction(code: string): string {
  return estCodeAction(code) ? LIBELLES_ACTIONS[code] : LIBELLE_ACTION_INCONNUE
}

/** Les signalements ne se lisent que par le ministère concerné et par EJP Tech (T39). */
const ACTIONS_DES_SIGNALEMENTS: readonly CodeAction[] = ['difficulte_signalee', 'signalement_clos']

/** Ce qu'un ministère ne fait pas : il ne déclare aucune session (sa liste n'en porte aucune). */
const ACTIONS_DES_SESSIONS: readonly CodeAction[] = [
  'session_declaree',
  'session_modifiee',
  'session_supprimee',
]

/**
 * Actions que la liste fermée de l'administration de l'église laisse lire (BRIEF, section 7,
 * `private.journal_lisible_administration`) : ni événements, ni réunions, ni points, ni chiffres
 * par département, ni signalements.
 */
export const ACTIONS_HORS_ADMINISTRATION: readonly CodeAction[] = [
  'fij_statistiques_saisies',
  'evenement_ajoute',
  'evenement_modifie',
  'reunion_saisie',
  'point_cree',
  'point_statut',
  'point_traite',
  ...ACTIONS_DES_SIGNALEMENTS,
]

/**
 * Les actions que le filtre « Action » propose à un profil : seulement celles dont une ligne peut
 * exister pour lui. Le filtre n'est qu'une commodité : la base ne rend jamais une ligne de plus.
 */
export function actionsDuProfil(profil: TypeCompte): CodeAction[] {
  const ecartees: readonly CodeAction[] = {
    ministere: ACTIONS_DES_SESSIONS,
    berger: ACTIONS_DES_SIGNALEMENTS,
    conseil: ACTIONS_DES_SIGNALEMENTS,
    admin_eglise: ACTIONS_HORS_ADMINISTRATION,
    admin_plateforme: [],
  }[profil]
  return CODES_ACTIONS.filter((code) => !ecartees.includes(code))
}
