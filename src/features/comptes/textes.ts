// Textes de l'écran 13, « Ministères et comptes » (lot L1). Aucun composant n'écrit un de ces
// textes en dur. Sources : maquette 13 ; BRIEF, section 9 (« Ministères et comptes (13) ») ;
// LISEZMOI des maquettes (« États », écarts de 13) ; configuration-indicateurs.md, 7.1.
// « Proposé » : texte que ni le BRIEF ni la maquette ne donnent (états vides, messages de
// réussite, confirmation d'un compte personnel), reporté dans LISEZMOI.md (écarts de 13 et
// section « États »).

import type { EtatCompte } from '@/lib/base'
import { formaterJourCourt } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

export const TEXTES_COMPTES = {
  titre: 'Ministères et comptes',
  /** Ce que fait l'écran, sans le fonctionnement interne (T66, t264 ; guide, exemple 7). */
  introduction: 'Chaque compte créé reçoit une invitation par email.',
  /** Administration de l'église, en lecture (décision T60) : la phrase remplace l'introduction. */
  introductionLecture:
    'EJP Tech crée et gère les ministères et les comptes. Adressez-lui vos demandes.',

  chargement: 'Chargement des ministères et des comptes',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',

  // Sections
  titreMinisteres: 'Ministères',
  titreBergerConseil: 'Berger et conseil',
  titreEjpTech: 'EJP Tech',
  titreListes: 'Listes',

  // Colonnes
  colonneMinistere: 'Ministère',
  colonneEmailMinistere: 'Email de connexion',
  colonneIndicateurs: 'Indicateurs propres',
  colonneEtat: 'Double authentification',
  colonneCompte: 'Compte',
  colonneEmailPersonnel: 'Email personnel',
  colonneActions: 'Actions',

  /** Le ministère FIJ saisit aussi ses chiffres par département (BRIEF, colonne de 13 ; T66). */
  fijParDepartement: 'et les chiffres par département',

  // Listes (maquette 13)
  statutsEvenement: "Statuts d'événement",
  noteStatuts: 'Pour changer cette liste, demandez à EJP Tech.',
  /** Pour EJP Tech, qui gère l'écran (T60, Proposé) : il ne se demande rien à lui-même. */
  noteStatutsGestion: "Liste commune à toute l'église.",

  // Pas de compte pour un ministère actif (FIJ, Coordination en production) : colonne Email (T66)
  pasDeCompte: 'Aucune adresse',

  // Boutons
  ajouterMinistere: 'Ajouter un ministère',
  ajouterConseil: 'Ajouter un membre du conseil',
  ajouterBerger: 'Ajouter le compte du berger',
  ajouterEjpTech: 'Ajouter un compte EJP Tech',
  creerCompte: 'Créer le compte',
  relancer: "Renvoyer l'invitation",
  refaireActivation: "Refaire l'activation",
  desactiver: 'Désactiver',
  reactiver: 'Réactiver',
  annuler: 'Annuler',
  /**
   * Pendant l'envoi, le bouton dit ce qui se fait (T66, m202) : une entrée par action d'une
   * ligne (`ActionLigne`), la création servant aussi aux panneaux d'ajout.
   */
  enCours: {
    creer: 'Création en cours',
    relancer: 'Envoi en cours',
    refaire: 'Réinitialisation en cours',
    desactiver: 'Désactivation en cours',
    reactiver: 'Réactivation en cours',
  },
  /** À la place des boutons, sur la ligne du compte connecté (T60, Proposé). */
  votreCompte: 'Votre compte',

  // Panneaux
  panneauMinistere: 'Ajouter un ministère',
  panneauCompteMinistere: (nom: string) => `Créer le compte de ${nom}`,
  panneauConseil: 'Ajouter un membre du conseil',
  panneauBerger: 'Ajouter le compte du berger',
  panneauEjpTech: 'Ajouter un compte EJP Tech',
  surtitrePanneau: 'Ministères et comptes',
  champNom: 'Nom du ministère',
  champDescription: 'Description (facultatif)',
  champEmailMinistere: 'Email partagé du ministère',
  /** Indication sous l'email d'un ministère (ancienne bulle `comptes.emailMinistere`, T66 t277). */
  indicationEmailMinistere:
    "Une boîte mail partagée par le ministère, pas l'adresse d'une personne.",
  champEmailPersonnel: 'Email personnel',
  /** Libellé imposé du compte, jamais tapé (BRIEF, section 6). */
  nomAffiche: (libelle: string) => `Nom affiché : ${libelle}`,
  /** Un seul libellé pour le ministère et le compte (T66, t279). */
  boutonCreerMinistere: "Créer et envoyer l'invitation",
  boutonCreerCompte: "Créer et envoyer l'invitation",

  // Confirmations (BRIEF, section 9)
  boutonDesactiverMinistere: 'Désactiver le ministère',
  boutonDesactiverCompte: 'Désactiver le compte',
  boutonRefaireActivation: "Refaire l'activation",
} as const

/** Libellé de l'état d'un compte (BRIEF, section 9 ; LISEZMOI, écarts de 13). */
export function libelleEtat(etat: EtatCompte | 'sans_compte', desactiveLe: DateIso | null): string {
  switch (etat) {
    case 'activee':
      return 'Activée'
    case 'a_activer':
      return 'À activer'
    case 'invitation_envoyee':
      return 'Invitation envoyée'
    case 'desactive':
      return desactiveLe === null ? 'Désactivé' : `Désactivé le ${formaterJourCourt(desactiveLe)}`
    case 'sans_compte':
      return 'Sans compte'
  }
}

/** En-tête de la section des ministères : « 8 actifs » (T66, t265). */
export function complementMinisteres(nbActifs: number): string {
  return `${nombre(nbActifs)} ${accorder(nbActifs, 'actif', 'actifs')}`
}

/** Colonne « Indicateurs » : « Aucun », « 1 indicateur », « 3 indicateurs ». */
export function libelleIndicateurs(nombreIndicateurs: number): string {
  if (nombreIndicateurs === 0) return 'Aucun'
  return `${nombre(nombreIndicateurs)} ${accorder(nombreIndicateurs, 'indicateur', 'indicateurs')}`
}

/**
 * États vides des trois sections (T36 ; T66, t273 à t275) : la phrase seule pour EJP Tech, qui a
 * le bouton d'ajout en tête de la section ; l'administration de l'église, qui lit (T60), garde
 * la phrase qui dit qui ajoute.
 */
export const VIDES_COMPTES = {
  ministeres: 'Aucun ministère.',
  /** En lecture (administration, T60). */
  ministeresSuiteLecture: 'EJP Tech ajoute les ministères.',
  bergerConseil: 'Aucun compte pour le berger ni le conseil.',
  ejpTech: 'Aucun compte EJP Tech.',
  /**
   * En lecture (administration, T60) : EJP Tech crée les comptes ; son premier compte se crée à
   * l'installation.
   */
  ejpTechSuite: "Le premier compte EJP Tech se crée à l'installation de l'outil.",
} as const

/** Messages de réussite, affichés 6 secondes (Proposé). */
export const REUSSITES_COMPTES = {
  ministereCree: (nom: string, email: string) =>
    `Ministère ${nom} créé. Invitation envoyée à ${email}.`,
  compteCree: (email: string) => `Compte créé. Invitation envoyée à ${email}.`,
  invitationRelancee: (email: string) => `Invitation renvoyée à ${email}.`,
  desactive: (nom: string) => `${nom} désactivé.`,
  reactive: (nom: string) => `${nom} réactivé.`,
  /** La consigne à transmettre, en une phrase : le message disparaît après 6 s (T66, m182). */
  activationARefaire: (nom: string) =>
    `Activation à refaire pour ${nom}. Dites-lui de choisir « Mot de passe oublié ».`,
} as const

/**
 * Contenu d'une fenêtre de confirmation : titre, texte, bouton d'action et ce que le bouton dit
 * pendant l'envoi (« Désactivation en cours », T66 m202).
 */
export interface TexteConfirmation {
  titre: string
  texte: string
  bouton: string
  enCours: string
}

/** « Désactiver Communication ? » (BRIEF, section 9). */
export function confirmationDesactiverMinistere(
  nom: string,
  email: string | null,
): TexteConfirmation {
  const qui = email === null ? 'cette adresse' : email
  return {
    titre: `Désactiver ${nom} ?`,
    texte: `Plus personne ne pourra se connecter avec ${qui}. Dès aujourd'hui, ${nom} ne compte plus dans les totaux.`,
    bouton: TEXTES_COMPTES.boutonDesactiverMinistere,
    enCours: TEXTES_COMPTES.enCours.desactiver,
  }
}

/** « Désactiver Conseil, compte 3 ? » (titre et bouton du BRIEF ; texte Proposé). */
export function confirmationDesactiverCompte(nom: string, email: string | null): TexteConfirmation {
  const qui = email === null ? 'cette adresse' : email
  return {
    titre: `Désactiver ${nom} ?`,
    texte: `Plus personne ne pourra se connecter avec ${qui}. Vous pourrez le réactiver.`,
    bouton: TEXTES_COMPTES.boutonDesactiverCompte,
    enCours: TEXTES_COMPTES.enCours.desactiver,
  }
}

/**
 * « Refaire l'activation de Communication ? » (BRIEF, section 9, pour un ministère ; texte
 * Proposé pour un compte personnel).
 */
export function confirmationRefaireActivation(nom: string, ministere: boolean): TexteConfirmation {
  return {
    titre: `Refaire l'activation de ${nom} ?`,
    // Ce qui va se passer, dont la déconnexion (T66, m200 et m201).
    texte: ministere
      ? "Le ministère sera déconnecté et devra activer un nouveau code. Changez d'abord le mot de passe de sa boîte mail."
      : 'La personne sera déconnectée. Elle devra choisir « Mot de passe oublié », puis activer un nouveau code.',
    bouton: TEXTES_COMPTES.boutonRefaireActivation,
    enCours: TEXTES_COMPTES.enCours.refaire,
  }
}
