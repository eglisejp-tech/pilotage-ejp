// Textes de l'écran 15, « Modération » (lot L6 ; BRIEF, « Modération » ; maquette 15). Statut des
// phrases que le BRIEF ne donne pas : « Proposé », notées dans `docs/reference/maquettes/LISEZMOI.md`.
// Aucun texte libre d'un ministère ici : seulement les libellés de l'écran.

import type { CibleMasquable, CibleTexteARelire, MotifMasquage } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

/** Remplace tout le champ masqué (`private.masquer_texte`). */
export { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'

export const TEXTES_MODERATION = {
  surtitre: 'Administration de la plateforme',
  titreFile: 'Champs libres à relire',
  intro:
    "EJP Tech relit les textes libres pour retirer toute information personnelle. Masquer un texte garde une trace dans le journal, avec le motif. EJP Tech ne crée pas de compte et ne décide d'aucun accès.",
  /** À droite du titre de la liste : « 2 textes en attente ». */
  enAttente: (n: number) =>
    n === 0
      ? 'Aucun texte en attente'
      : `${nombre(n)} ${accorder(n, 'texte en attente', 'textes en attente')}`,
  vide: 'Aucun texte à relire.',
  boutonRelu: 'Rien à signaler',
  boutonMasquer: 'Masquer le texte',
  /** « Relu le 29 sept. : rien à signaler » */
  relu: (decisionLe: string) => `Relu le ${jourDecision(decisionLe)} : rien à signaler`,
  /** « Masqué le 29 sept. : nom d'une personne » */
  masque: (decisionLe: string, motif: MotifMasquage | null) =>
    motif === null
      ? `Masqué le ${jourDecision(decisionLe)}`
      : `Masqué le ${jourDecision(decisionLe)} : ${MOTIFS_COURTS[motif]}`,
  reussiteRelu: 'Texte marqué comme relu.',
  reussiteMasque: 'Texte masqué.',
} as const

/** « 29 sept. » : jour de Paris de la décision (jamais la date du navigateur). */
function jourDecision(instant: string): string {
  return formaterJourCourt(jourDeParis(instant))
}

/** Le motif dans une phrase (« Masqué le 29 sept. : nom d'une personne »). */
export const MOTIFS_COURTS: Readonly<Record<MotifMasquage, string>> = {
  nom_personne: "nom d'une personne",
  coordonnees: 'coordonnées',
  situation_personnelle: 'santé ou situation personnelle',
  autre: 'autre information personnelle',
}

/** Les quatre boutons radio de la fenêtre, dans l'ordre du BRIEF. */
export const MOTIFS_RADIO: readonly { code: MotifMasquage; libelle: string }[] = [
  { code: 'nom_personne', libelle: "Nom d'une personne" },
  { code: 'coordonnees', libelle: 'Coordonnées (téléphone, adresse, email)' },
  { code: 'situation_personnelle', libelle: 'Santé ou situation personnelle' },
  { code: 'autre', libelle: 'Autre information personnelle' },
]

/** Nom du type d'élément, en tête de ligne : « Point d'attention, Social ». */
export const LIBELLES_CIBLE: Readonly<Record<CibleMasquable, string>> = {
  point_attention: "Point d'attention",
  point_suivi: 'Commentaire de traitement',
  evenement: 'Événement',
  reunion: 'Réunion',
  precision_sensible: "Précision d'un chiffre",
  demande_indicateur: "Raison d'un indicateur",
  validation: "Motif d'un refus",
  signalement: 'Signalement',
  signalement_suivi: 'Commentaire de clôture',
}

/** Nom d'un champ libre, sur la ligne et dans la fenêtre : « Ce qui se passe ». */
export const LIBELLES_CHAMP: Readonly<Record<string, string>> = {
  titre: 'Titre',
  description: 'Ce qui se passe',
  action_attendue: 'Ce qui est attendu',
  commentaire: 'Commentaire',
  objet: 'Objet',
  decision_attendue: 'Décision attendue',
  texte: 'Texte',
}

/** Ordre d'affichage des champs d'une cible (le même que celui des formulaires). */
export const ORDRE_CHAMPS: Readonly<Record<CibleTexteARelire, readonly string[]>> = {
  point_attention: ['titre', 'description', 'action_attendue'],
  point_suivi: ['commentaire'],
  evenement: ['titre'],
  reunion: ['objet', 'decision_attendue'],
  precision_sensible: ['texte'],
}

/** Nom du champ d'une cible : le titre d'un événement est « Nom », celui d'un point « Titre ». */
export function libelleChamp(cible: CibleMasquable, champ: string): string {
  if (cible === 'evenement' && champ === 'titre') return "Nom de l'événement"
  if (cible === 'precision_sensible' && champ === 'texte') return 'Précision'
  if (cible === 'signalement' && champ === 'texte') return 'Signalement'
  if (cible === 'signalement_suivi' && champ === 'commentaire') return 'Commentaire de clôture'
  return LIBELLES_CHAMP[champ] ?? champ
}

/** La fenêtre « Masquer le texte » (BRIEF, « Modération »). */
export const TEXTES_FENETRE_MASQUAGE = {
  titre: 'Masquer le texte',
  legendeChamp: 'Champ à masquer',
  legendeMotif: 'Motif',
  /** Sous les choix : ce que le masquage fait, et qu'il est définitif. */
  avertissement:
    'Le texte sera remplacé par « [texte masqué par EJP Tech] ». Cette action ne peut pas être annulée.',
  bouton: 'Masquer définitivement',
  boutonEnCours: 'Masquage en cours',
  annuler: 'Annuler',
  erreurChamp: 'Choisissez le champ à masquer.',
  erreurMotif: 'Choisissez un motif dans la liste.',
} as const

/** Messages de la base, repris tels quels (migration 20261009110000). */
export const MESSAGES_BASE_MODERATION = {
  introuvable: 'Texte introuvable, vide ou déjà masqué.',
  dejaRelu: 'Ce texte a déjà été relu.',
  motif: 'Choisissez un motif dans la liste.',
  champ: 'Ce champ ne peut pas être masqué.',
  /** Refus de droit (42501), commun à toutes les fonctions de l'API. */
  acces: "Cet élément n'existe pas ou vous n'y avez pas accès.",
} as const

/** En tête de l'écran : « 2 indicateurs attendent votre validation, le plus ancien depuis 4 jours. » */
export const TEXTES_INDICATEURS_A_VALIDER = {
  /**
   * « 2 indicateurs attendent votre validation, le plus ancien depuis 4 jours. » ; au singulier,
   * « 1 indicateur attend votre validation depuis 4 jours. » ; sans jour d'attente, la phrase
   * s'arrête à « validation ».
   */
  phrase: (n: number, plusAncienJours: number): string => {
    const debut =
      n < 2
        ? `${nombre(n)} indicateur attend votre validation`
        : `${nombre(n)} indicateurs attendent votre validation`
    if (plusAncienJours <= 0) return `${debut}.`
    return n < 2
      ? `${debut} ${depuisJours(plusAncienJours)}.`
      : `${debut}, le plus ancien ${depuisJours(plusAncienJours)}.`
  },
  lien: 'Ouvrir les indicateurs à valider',
} as const

/** « depuis 4 jours », « depuis 1 jour ». */
function depuisJours(jours: number): string {
  return `depuis ${nombre(jours)} ${accorder(jours, 'jour', 'jours')}`
}
