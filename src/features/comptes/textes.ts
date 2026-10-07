// Textes de l'écran 13, « Ministères et comptes » (lot L1). Aucun composant n'écrit un de ces
// textes en dur. Sources : maquette 13 ; BRIEF, section 9 (« Ministères et comptes (13) ») ;
// LISEZMOI des maquettes (« États », écarts de 13) ; configuration-indicateurs.md, 7.1.
// « Proposé » : texte que ni le BRIEF ni la maquette ne donnent (états vides, messages de
// réussite, confirmation d'un compte personnel), à reporter dans LISEZMOI.md au lot
// d'intégration (le hook de format reformaterait tout le fichier depuis une copie de travail).

import type { EtatCompte } from '@/lib/base'
import { formaterJourCourt } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

export const TEXTES_COMPTES = {
  titre: 'Ministères et comptes',
  introduction:
    "Les comptes sont créés ici, personne ne peut s'inscrire seul. Chacun se connecte avec Google ou un mot de passe, puis un code de double authentification. Désactiver un compte garde tout son historique.",

  chargement: 'Chargement',
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
  colonneIndicateurs: 'Indicateurs',
  colonneEtat: 'Double authentification',
  colonneCompte: 'Compte',
  colonneEmailPersonnel: 'Email personnel',
  colonneActions: 'Actions',

  /** Sous le tableau des ministères (configuration-indicateurs.md, 7.1). */
  noteIndicateurs: 'Pour ajouter ou retirer un indicateur propre, ouvrez',
  lienIndicateurs: "l'écran Indicateurs",
  /** Le ministère FIJ saisit aussi ses chiffres par département (BRIEF, colonne de 13). */
  fijParDepartement: 'et FIJ par département',

  // Listes (maquette 13)
  statutsEvenement: "Statuts d'événement",
  noteStatuts: "Liste commune à toute l'église. Pour la changer, faites une demande à EJP Tech.",

  // Pas de compte pour un ministère actif (FIJ, Coordination en production)
  pasDeCompte: 'Pas encore de compte',

  // Boutons
  ajouterMinistere: 'Ajouter un ministère',
  ajouterConseil: 'Ajouter un membre du conseil',
  ajouterBerger: 'Ajouter le compte du berger',
  ajouterEjpTech: 'Ajouter un compte EJP Tech',
  creerCompte: 'Créer le compte',
  relancer: "Relancer l'invitation",
  refaireActivation: "Refaire l'activation",
  desactiver: 'Désactiver',
  reactiver: 'Réactiver',
  annuler: 'Annuler',
  enCours: 'Envoi en cours',

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
  champEmailPersonnel: 'Email personnel',
  /** Libellé imposé du compte, jamais tapé (BRIEF, section 6). */
  nomAffiche: (libelle: string) => `Nom affiché : ${libelle}`,
  boutonCreerMinistere: "Créer le ministère et envoyer l'invitation",
  boutonCreerCompte: "Créer le compte et envoyer l'invitation",
  /** Ce qui se passe après l'envoi, sous le titre du panneau (Proposé). */
  phraseInvitation:
    "L'adresse reçoit une invitation par email. Le compte choisit son mot de passe, puis active sa double authentification.",

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

/** En-tête de la section des ministères : « 8 actifs, un email partagé chacun ». */
export function complementMinisteres(nbActifs: number): string {
  return `${nombre(nbActifs)} ${accorder(nbActifs, 'actif', 'actifs')}, un email partagé chacun`
}

/** Colonne « Indicateurs » : « Aucun », « 1 indicateur », « 3 indicateurs ». */
export function libelleIndicateurs(nombreIndicateurs: number): string {
  if (nombreIndicateurs === 0) return 'Aucun'
  return `${nombre(nombreIndicateurs)} ${accorder(nombreIndicateurs, 'indicateur', 'indicateurs')}`
}

/** États vides des trois sections (T36 ; Proposé, à reporter dans LISEZMOI.md). */
export const VIDES_COMPTES = {
  ministeres: 'Aucun ministère pour le moment.',
  ministeresSuite: 'Ajoutez le premier : son email partagé reçoit une invitation.',
  bergerConseil: "Aucun compte pour le berger ni pour le conseil pour l'instant.",
  bergerConseilSuite: 'Chaque compte reçoit une invitation à son email personnel.',
  ejpTech: "Aucun compte EJP Tech pour l'instant.",
  ejpTechSuite: "EJP Tech demande son compte à l'administration de l'église.",
} as const

/** Messages de réussite, affichés 6 secondes (Proposé). */
export const REUSSITES_COMPTES = {
  ministereCree: (nom: string, email: string) =>
    `Ministère ${nom} créé. Invitation envoyée à ${email}.`,
  compteCree: (email: string) => `Compte créé. Invitation envoyée à ${email}.`,
  invitationRelancee: (email: string) => `Invitation renvoyée à ${email}.`,
  desactive: (nom: string) => `${nom} désactivé.`,
  reactive: (nom: string) => `${nom} réactivé.`,
  activationARefaire: (nom: string) =>
    `Activation à refaire pour ${nom}. La personne choisit « Mot de passe oublié », puis active un nouveau code.`,
} as const

/** Contenu d'une fenêtre de confirmation : titre, texte et bouton d'action. */
export interface TexteConfirmation {
  titre: string
  texte: string
  bouton: string
}

/** « Désactiver Communication ? » (BRIEF, section 9). */
export function confirmationDesactiverMinistere(
  nom: string,
  email: string | null,
): TexteConfirmation {
  const qui = email === null ? 'cette adresse' : email
  return {
    titre: `Désactiver ${nom} ?`,
    texte: `Plus personne ne pourra se connecter avec ${qui}. À partir d'aujourd'hui, ${nom} ne compte plus dans les totaux ni dans la complétude. Ses saisies et son historique restent.`,
    bouton: TEXTES_COMPTES.boutonDesactiverMinistere,
  }
}

/** « Désactiver Conseil, compte 3 ? » (titre et bouton du BRIEF ; texte Proposé). */
export function confirmationDesactiverCompte(nom: string, email: string | null): TexteConfirmation {
  const qui = email === null ? 'cette adresse' : email
  return {
    titre: `Désactiver ${nom} ?`,
    texte: `Plus personne ne pourra se connecter avec ${qui}. Son historique reste.`,
    bouton: TEXTES_COMPTES.boutonDesactiverCompte,
  }
}

/**
 * « Refaire l'activation de Communication ? » (BRIEF, section 9, pour un ministère ; texte
 * Proposé pour un compte personnel).
 */
export function confirmationRefaireActivation(nom: string, ministere: boolean): TexteConfirmation {
  return {
    titre: `Refaire l'activation de ${nom} ?`,
    texte: ministere
      ? "À faire quand une personne quitte ou rejoint le ministère, ou perd son téléphone. Changez d'abord le mot de passe de la boîte mail du ministère."
      : 'À faire quand la personne perd son téléphone. Elle choisit ensuite « Mot de passe oublié », puis active un nouveau code.',
    bouton: TEXTES_COMPTES.boutonRefaireActivation,
  }
}
