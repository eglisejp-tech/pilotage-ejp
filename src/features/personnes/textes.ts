// Textes de l'onglet « Personnes » d'EJP Tech (décisions T56 et T61). Aucun texte n'explique la
// mécanique : l'écran dit qui a utilisé l'outil, quand, quelles conditions chaque personne a
// acceptées, et comment effacer un prénom.

import { PRENOM_EFFACE } from '@/lib/metier/declaration'
import { accorder, nombre } from '@/lib/metier/texte'

// Sans surtitre « Administration de la plateforme » : le menu situe l'écran (T66, intention de
// t345 pour la modération, appliquée à cet écran né après l'inventaire).
export const TEXTES_PERSONNES = {
  introduction: 'Les prénoms indiqués sur les comptes partagés des ministères.',
  titreActives: 'Actives sur 30 jours',
  colonnes: {
    connexions: 'Connexions',
    jours: "Jours d'utilisation",
    actions: 'Actions faites',
    derniere: 'Dernière activité',
  },
  activesVide: "Personne n'a utilisé un compte de ministère depuis 30 jours.",
  /** « Conditions du 12 octobre 2026 acceptées le 13 oct., 9 h. » (T61) */
  conditionsAcceptees: (version: string, quand: string) =>
    `Conditions du ${version} acceptées le ${quand}.`,
  /** Une version plus ancienne que celle en cours : la personne l'acceptera à sa prochaine connexion. */
  conditionsAnciennes: (version: string, quand: string, courante: string) =>
    `Conditions du ${version} acceptées le ${quand}. Pas encore celles du ${courante}.`,
  conditionsAucune: 'Conditions pas encore acceptées.',
  titreSansActivite: 'Sans activité depuis 30 jours',
  titreConnexions: 'Dernières connexions',
  connexionsVide: 'Aucune connexion pour le moment.',
  /** « Dim. 11 oct., 11 h : Ministère Communication, Marie D. » */
  connexion: (quand: string, compte: string, prenom: string) => `${quand} : ${compte}, ${prenom}`,
  compteInconnu: 'Compte inconnu',
  plus: 'Afficher 50 de plus',
  /** Pendant la lecture des 50 suivantes, avec la petite flamme : ce qui charge (T65, Proposé). */
  plusEnCours: 'Chargement des connexions',
  anciens: (n: number) => `${nombre(n)} ${accorder(n, 'prénom a', 'prénoms ont')} plus de 12 mois.`,
  effacerAnciens: 'Effacer les prénoms de plus de 12 mois',
  effacer: 'Effacer ce prénom',
  chargement: 'Chargement des personnes',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
  reussiteUn: 'Prénom effacé.',
  reussiteAnciens: (n: number) =>
    n === 0
      ? 'Aucun prénom à effacer.'
      : `${nombre(n)} ${accorder(n, 'prénom effacé', 'prénoms effacés')}.`,
} as const

/**
 * Fenêtre de confirmation, sur le modèle de « Masquer ce texte ? » (T66, m218 ; guide 10.7) : un
 * titre en question, la conséquence suivie de « C'est définitif. », un bouton qui reprend le verbe.
 */
export const TEXTES_FENETRE_EFFACEMENT = {
  titreUn: 'Effacer ce prénom ?',
  titreAnciens: 'Effacer les prénoms de plus de 12 mois ?',
  avertissementUn: `Ce prénom sera remplacé par « ${PRENOM_EFFACE} » partout. C'est définitif.`,
  avertissementAnciens: `Ces prénoms seront remplacés par « ${PRENOM_EFFACE} » partout. C'est définitif.`,
  annuler: 'Annuler',
  boutonUn: 'Effacer le prénom',
  boutonAnciens: 'Effacer les prénoms',
  boutonEnCours: 'Effacement en cours',
  erreur: 'La connexion a échoué. Réessayez.',
} as const
