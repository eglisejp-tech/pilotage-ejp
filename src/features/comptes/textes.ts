// Textes de l'écran 13, « Ministères et comptes » (lot L1). Aucun composant n'écrit un de ces
// textes en dur. Sources : maquette 13 ; BRIEF, section 9 (« Ministères et comptes (13) ») ;
// LISEZMOI des maquettes (« États », écarts de 13) ; configuration-indicateurs.md, 7.1.
// « Proposé » : texte que ni le BRIEF ni la maquette ne donnent (états vides, messages de
// réussite, confirmation d'un compte personnel), reporté dans LISEZMOI.md (écarts de 13 et
// section « États »).

import type { RaisonSuppression } from '@/features/comptes/raisons'
import type { EtatCompte } from '@/lib/base'
import { formaterJourCourt } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

function objetDesactives(nombreDesactives: number, ministeres: boolean): string {
  return ministeres
    ? accorder(nombreDesactives, 'ministère désactivé', 'ministères désactivés')
    : accorder(nombreDesactives, 'compte désactivé', 'comptes désactivés')
}

/** « le ministère désactivé », « les 2 comptes désactivés ». */
function articleDesactives(nombreDesactives: number, ministeres: boolean): string {
  const objet = objetDesactives(nombreDesactives, ministeres)
  return nombreDesactives === 1 ? `le ${objet}` : `les ${nombre(nombreDesactives)} ${objet}`
}

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
  // T74 (Proposé)
  corrigerAdresse: "Corriger l'adresse",
  supprimer: 'Supprimer',
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
    corriger: 'Correction en cours',
    supprimer: 'Suppression en cours',
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

  // Correction d'une adresse et réactivation d'un compte jamais activé (T74, Proposé)
  panneauCorrection: (nom: string) => `Corriger l'adresse de ${nom}`,
  panneauReactivation: (nom: string) => `Réactiver ${nom}`,
  adresseActuelle: (email: string) => `Adresse actuelle : ${email}`,
  champNouvelleAdresse: 'Nouvelle adresse email',
  champAdresseReactivation: 'Adresse email',
  /** Sous l'adresse, à la réactivation : elle se corrige au passage. */
  indicationReactivation: "Corrigez-la si elle est fausse : l'invitation partira vers la nouvelle.",
  adresseIdentique: "Saisissez une adresse différente de l'adresse actuelle.",
  boutonCorriger: "Corriger et envoyer l'invitation",
  boutonReactiverMinistere: 'Réactiver le ministère',
  boutonReactiverCompte: 'Réactiver le compte',
  boutonReactiverEtInviter: "Réactiver et envoyer l'invitation",

  // Section repliée des désactivés (T74, Proposé) : « 2 ministères désactivés », et le bouton
  // « Afficher les 2 ministères désactivés » (« Afficher le compte désactivé » pour un seul).
  desactives: (nombreDesactives: number, ministeres: boolean) =>
    `${nombre(nombreDesactives)} ${objetDesactives(nombreDesactives, ministeres)}`,
  afficherDesactives: (nombreDesactives: number, ministeres: boolean) =>
    `Afficher ${articleDesactives(nombreDesactives, ministeres)}`,
  masquerDesactives: (nombreDesactives: number, ministeres: boolean) =>
    `Masquer ${articleDesactives(nombreDesactives, ministeres)}`,

  // Confirmations (BRIEF, section 9)
  boutonDesactiverMinistere: 'Désactiver le ministère',
  boutonDesactiverCompte: 'Désactiver le compte',
  boutonRefaireActivation: "Refaire l'activation",
  boutonSupprimerMinistere: 'Supprimer le ministère',

  // Fenêtre « impossible » d'une suppression (T75, Proposé dans la conception validée, revu
  // après la revue produit : le ministère nommé comme tel, l'accord ne dépend plus du nom)
  impossible: (nom: string) => `Le ministère ${nom} ne peut pas être supprimé`,
  dejaDesDonnees: "Ce ministère a déjà des données dans l'outil :",
  jamaisSupprimes:
    'Coordination et FIJ sont des ministères de référence : ils ne se suppriment jamais.',
  desactiverAPlace:
    'Désactivez-le à la place : plus personne ne se connecte, son historique reste.',
  dejaDesactive: 'Il est déjà désactivé : plus personne ne se connecte, son historique reste.',
  fermer: 'Fermer',
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
  // T74 (Proposé)
  adresseCorrigee: (email: string) => `Adresse corrigée. Invitation envoyée à ${email}.`,
  reactiveEtInvite: (nom: string, email: string) =>
    `${nom} réactivé. Invitation envoyée à ${email}.`,
  supprime: (nom: string) => `${nom} supprimé.`,
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
  /** Bouton foncé : l'action perd quelque chose pour de bon (suppression, T74). */
  definitif?: boolean
  /** Second paragraphe, annoncé avec le premier (suppression d'un ministère attendu, T75). */
  suite?: string
}

/**
 * « Supprimer Tech ? » (T74, Proposé) : ce qui disparaît (le ministère, ses indicateurs, son
 * compte et son adresse), les sessions dont il sort (T75, validé le 26 octobre 2026 : leur
 * complétude passée ne le compte plus), puis ce qui reste (le journal). Action définitive.
 */
export function confirmationSupprimerMinistere(
  nom: string,
  email: string | null,
  indicateurs: number,
  sessions = 0,
): TexteConfirmation {
  const avec: string[] = []
  if (indicateurs === 1) avec.push('son indicateur')
  if (indicateurs > 1) avec.push(`ses ${nombre(indicateurs)} indicateurs`)
  if (email !== null) avec.push(`son compte (${email})`)
  // « Tech », « Tech et son compte (...) », « Tech, ses 8 indicateurs et son compte (...) ».
  const sujet = avec.length === 2 ? `${nom}, ${avec.join(' et ')}` : [nom, ...avec].join(' et ')
  const disparait = `${sujet} ${avec.length === 0 ? 'disparaît' : 'disparaissent'} de l'outil.`
  const trace = "Le journal garde la trace de la suppression. C'est définitif."
  const confirmation = {
    titre: `Supprimer ${nom} ?`,
    bouton: TEXTES_COMPTES.boutonSupprimerMinistere,
    enCours: TEXTES_COMPTES.enCours.supprimer,
    definitif: true,
  }
  if (sessions === 0) return { ...confirmation, texte: `${disparait} ${trace}` }
  // Attendu par des sessions : elles restent, il n'y est plus attendu (deux paragraphes).
  const attendu = sessions === 1 ? 'dans une session' : `dans ${nombre(sessions)} sessions`
  return {
    ...confirmation,
    texte: `${disparait} ${nom} ne sera plus attendu ${attendu}.`,
    suite: trace,
  }
}

/**
 * Une raison d'un refus de suppression, en mots simples et chiffrés (T75, Proposé dans la
 * conception validée) : « 12 chiffres saisis », « mentionné dans 2 points d'attention », « son
 * compte a déjà été activé ».
 */
export function texteRaison({ code, nombre: n }: RaisonSuppression): string {
  const compte = (singulier: string, pluriel: string) =>
    `${nombre(n)} ${accorder(n, singulier, pluriel)}`
  switch (code) {
    case 'ministere_de_reference':
      return TEXTES_COMPTES.jamaisSupprimes
    case 'compte_deja_active':
      return n > 1
        ? `ses ${nombre(n)} comptes ont déjà été activés`
        : 'son compte a déjà été activé'
    case 'chiffres':
      return compte('chiffre saisi', 'chiffres saisis')
    case 'presences':
      return `des présences saisies pour ${compte('session', 'sessions')}`
    case 'carte_fij':
      return compte('chiffre de la carte des FIJ', 'chiffres de la carte des FIJ')
    case 'statistiques_fij':
      return compte('statistique FIJ par département', 'statistiques FIJ par département')
    case 'repartitions':
      return compte("répartition d'un chiffre sensible", 'répartitions de chiffres sensibles')
    case 'precisions':
      return compte("précision d'un chiffre sensible", 'précisions de chiffres sensibles')
    // Créés par lui, ou qui le mentionnent : deux raisons qui ne se lisent pas l'une pour l'autre.
    case 'points':
      return compte("point d'attention créé", "points d'attention créés")
    case 'mentions_points':
      return `mentionné dans ${compte("point d'attention", "points d'attention")}`
    case 'evenements':
      return compte('événement créé', 'événements créés')
    case 'mentions_evenements':
      return `mentionné dans ${compte('événement', 'événements')}`
    case 'reunions':
      return compte('réunion', 'réunions')
    case 'signalements':
      return compte('signalement', 'signalements')
    case 'demandes':
      return compte("demande d'indicateur", "demandes d'indicateur")
    case 'validations':
      return compte(
        "décision sur ses demandes d'indicateur",
        "décisions sur ses demandes d'indicateur",
      )
    case 'retraits':
      return compte('indicateur retiré par le ministère', 'indicateurs retirés par le ministère')
    case 'autre_donnee':
      return "une autre donnée le relie encore à l'outil"
  }
}

/** Contenu de la fenêtre « impossible » d'une suppression (T75). */
export interface TexteRefusSuppression {
  titre: string
  /** La phrase annoncée avec le titre. */
  texte: string
  /** Les raisons chiffrées, en liste ; vide pour Coordination et FIJ. */
  raisons: string[]
  /** Ce qu'on peut faire à la place, ou ce qui est déjà fait ; null sans compte. */
  suite: string | null
  /** Le bouton « Désactiver » ; null s'il n'y a rien à désactiver. */
  desactiver: string | null
  fermer: string
}

/** Ce que la fenêtre « impossible » propose : désactiver, rien (déjà désactivé), ou rien du tout. */
export type ApresRefus = 'desactiver' | 'deja_desactive' | 'sans_compte'

/** Le compte activé se lit après les données saisies : la raison la moins parlante en dernier. */
function rangAffiche(raison: RaisonSuppression): number {
  return raison.code === 'compte_deja_active' ? 1 : 0
}

/**
 * « Le ministère Communication ne peut pas être supprimé » (T75) : pourquoi (ses données, puis
 * son compte activé), puis « Désactiver » à la place quand un compte actif existe ; déjà
 * désactivé, une phrase le dit ; sans compte, « Fermer » seul. FIJ et Coordination : une seule
 * phrase, sans liste.
 */
export function refusSuppression(
  nom: string,
  raisons: readonly RaisonSuppression[],
  apres: ApresRefus,
): TexteRefusSuppression {
  const reference = raisons.some((raison) => raison.code === 'ministere_de_reference')
  const ordonnees = [...raisons].sort((a, b) => rangAffiche(a) - rangAffiche(b))
  return {
    titre: TEXTES_COMPTES.impossible(nom),
    texte: reference ? TEXTES_COMPTES.jamaisSupprimes : TEXTES_COMPTES.dejaDesDonnees,
    raisons: reference ? [] : ordonnees.map(texteRaison),
    suite:
      apres === 'desactiver'
        ? TEXTES_COMPTES.desactiverAPlace
        : apres === 'deja_desactive'
          ? TEXTES_COMPTES.dejaDesactive
          : null,
    desactiver: apres === 'desactiver' ? TEXTES_COMPTES.desactiver : null,
    fermer: TEXTES_COMPTES.fermer,
  }
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
