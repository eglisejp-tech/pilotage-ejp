// Textes de « Signaler une difficulté » (T39, question 14 : oui ; docs/conception/aides-
// contextuelles.md, section 7). Statut : « Proposé ». Écrits une fois par W0 pour les lots E3 à E5
// (lien et messages de date refusée) et E8 (formulaire et bloc), qui ne les réécrivent pas.
//
// Qui lit un signalement : le ministère qui l'a écrit et EJP Tech, jamais l'administration de
// l'église, le berger ni le conseil. Tout texte qui le dit emploie `LECTEUR_SIGNALEMENT`.

import type { EcranSignalement } from '@/lib/base'

/** La phrase qui dit qui lit le signalement, partout où l'on en parle. */
export const LECTEUR_SIGNALEMENT = 'EJP Tech lit votre signalement.'

export const TEXTES_SIGNALEMENT = {
  lien: 'Signaler une difficulté',
  titre: 'Signaler une difficulté',
  /** Phrase sous le titre du panneau : qui lit, puis ce qu'on demande. */
  phraseTitre: `${LECTEUR_SIGNALEMENT} Décrivez ce qui vous bloque en une ou deux phrases.`,
  /** Ligne de contexte, remplie par l'outil : « Écran concerné : Ajouter un événement ». */
  ligneContexte: (ecran: EcranSignalement) => `Écran concerné : ${LIBELLES_ECRAN[ecran]}`,
  libelleChamp: 'Quelle difficulté rencontrez-vous ?',
  erreurChamp: 'Décrivez la difficulté (10 caractères au moins).',
  boutonEnvoyer: 'Envoyer le signalement',
  boutonEnCours: 'Envoi en cours',
  boutonAnnuler: 'Annuler',
  confirmation: 'Signalement envoyé. EJP Tech le lira.',
  /** Sous le champ date de l'ajout d'un événement, avant le lien « Signaler une difficulté ». */
  dateRefuseeAjout: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
  /** Sous le champ date de la mise à jour d'un événement, avant le lien. */
  dateRefuseeMiseAJour: "La nouvelle date doit être aujourd'hui ou plus tard.",
  questionDate: 'Vous ne pouvez pas choisir de date ?',
  /** Ligne identique à l'état actuel, sous le bouton : sans lien. */
  ligneIdentique: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
  bloc: {
    titre: 'Signalements',
    sousTitre: 'Difficultés signalées par les ministères',
    /** Situation « tout est fait » : le bloc garde sa place. */
    vide: 'Aucun signalement. Les difficultés signalées par les ministères arriveront ici.',
  },
} as const

/** Nom de l'écran d'origine, tel qu'il s'écrit dans « Écran concerné : ... ». */
export const LIBELLES_ECRAN: Readonly<Record<EcranSignalement, string>> = {
  saisie_dimanche: 'Chiffres du dimanche',
  saisie_mois: 'Chiffres du mois',
  saisie_session: 'Présence à une session',
  saisie_fij: 'Carte des FIJ',
  saisie_fij_statistiques: 'Chiffres par département',
  saisie_evenement: 'Ajouter un événement',
  saisie_reunion: 'Prochaine réunion',
  autre: 'Autre écran',
}
