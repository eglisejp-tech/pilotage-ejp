// Textes du calendrier et de la prochaine réunion de la fiche (maquettes 04 et 12, lot E6).
// Sources : docs/conception/validation-metier.md, 4.4 et 4.5 ; LISEZMOI des maquettes, « États »
// et « Écarts connus » ; BRIEF, section 9. « Proposé » : texte que ni le BRIEF ni LISEZMOI ne
// donnent encore (à reporter dans LISEZMOI à la fin de l'étape). Aucun titre d'événement n'entre
// dans une phrase : un texte libre n'est jamais recopié dans un message.

import { nombreEnDebutDePhrase } from '@/lib/metier/texte'

export const TEXTES_CALENDRIER = {
  titre: 'Calendrier prévisionnel',
  colonneDate: 'Date',
  colonneEvenement: 'Événement',
  colonneStatut: 'Statut',
  /** Maquette 12, au ministère seulement. */
  ajouter: 'Ajouter un événement',
  /** Bouton de chaque événement que le ministère porte. */
  metteAJour: 'Mettre à jour',
  /** LISEZMOI, « États » : vide du calendrier. */
  aucun: 'Aucun événement prévu.',
  /** « Mentionné par Communication » : un événement qui mentionne ce ministère (T32). */
  mentionnePar: (nom: string) => `Mentionné par ${nom}`,
  /** « Reporté du sam. 3 oct. » : l'ancienne date, lue dans l'historique (K10b). Proposé. */
  reporteDu: (jour: string) => `Reporté du ${jour}`,
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const

/**
 * Bandeau de la fiche (T31, proposition d'affichage). Une phrase visible, sans bulle, jamais en
 * `role="alert"` (réservé aux erreurs de page). Proposé : T31 écrit un texte par événement ; le
 * bandeau en compte plusieurs sans reprendre aucun titre.
 */
export const TEXTES_BANDEAU = {
  /** Mot en tête, pour que le bandeau ne tienne pas à sa couleur. */
  etiquette: 'À confirmer',
  /** Le ministère qui porte l'événement. */
  porteur: (n: number) =>
    n === 1
      ? 'Un événement est encore en attente de validation et sa date approche ou est passée. Mettez à jour son statut.'
      : `${nombreEnDebutDePhrase(n)} événements sont encore en attente de validation et leur date approche ou est passée. Mettez à jour leur statut.`,
  /** Un ministère mentionné : il lit, il ne change pas le statut. */
  mentionne: (n: number) =>
    n === 1
      ? 'Un événement qui vous mentionne est encore en attente de validation. Le ministère qui le porte met à jour son statut.'
      : `${nombreEnDebutDePhrase(n)} événements qui vous mentionnent sont encore en attente de validation. Les ministères qui les portent mettent à jour leur statut.`,
  /** Berger, conseil et EJP Tech, sur la fiche d'un ministère. */
  lecteur: (n: number) =>
    n === 1
      ? 'Un événement est encore en attente de validation et sa date approche ou est passée. Le ministère qui le porte met à jour son statut.'
      : `${nombreEnDebutDePhrase(n)} événements sont encore en attente de validation et leur date approche ou est passée. Le ministère qui les porte met à jour leur statut.`,
} as const

export const TEXTES_REUNION_FICHE = {
  libelle: 'Prochaine réunion',
  /** Berger, conseil et EJP Tech : rien n'est déclaré (plan de l'étape 4, E6). */
  nonRenseignee: 'Non renseignée.',
  renseigner: 'Renseigner',
  modifier: 'Modifier',
  decisionAttendue: 'Décision attendue',
  erreur: 'La connexion a échoué.',
  reessayer: 'Réessayer',
} as const
