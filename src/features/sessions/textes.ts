// Textes de l'écran 14, « Sessions » (lot L2). Aucun composant n'écrit un de ces textes en dur.
// Sources : maquette 14 ; BRIEF, section 9 (« Sessions (14) ») ; LISEZMOI des maquettes (écart de
// 14 : troisième type, « Modifier » et « Supprimer »). « Proposé » : texte que ni le BRIEF ni la
// maquette ne donnent (état vide, confirmation, messages de réussite), reporté dans LISEZMOI.md.

import type { TexteConfirmation } from '@/features/comptes/textes'
import type { TypeSession } from '@/lib/base'
import { ajouterJours, jourDeLaSemaine } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { libelleCompletude } from '@/lib/metier/completude'
import { accorder, listeNoms, trierNoms } from '@/lib/metier/texte'

export const TEXTES_SESSIONS = {
  titre: 'Sessions',
  /** Revu par T66 (t298) : « ajouter » et « session », les mots du glossaire. */
  introduction: 'Ajoutez chaque session. Les ministères attendus y saisiront leurs STARs présents.',
  titreListe: 'Toutes les sessions',
  /** État vide (T36, « premier usage ») : le bouton « Ajouter une session » est à côté (T66). */
  vide: 'Aucune session.',
  chargement: 'Chargement des sessions',
  /**
   * Panneau d'une session : la liste des ministères attendus se lit à part, avec la flamme
   * vivante et les places réservées du formulaire (T65, moment 2, `ChargementPage`).
   */
  chargementAttendus: 'Chargement des ministères attendus',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',

  colonneDate: 'Date',
  colonneSession: 'Session',
  colonneAttendus: 'Attendus',
  colonneSaisies: 'Saisies',
  colonneActions: 'Actions',
  pasEncoreEuLieu: 'Pas encore eu lieu',

  // Formulaire (maquette 14, colonne « Déclarer une session », devenue « Ajouter une session »)
  declarer: 'Ajouter une session',
  surtitre: 'Sessions',
  legendeType: 'Type',
  champDate: 'Date',
  champNom: 'Nom de la session',
  titreMinisteres: 'Ministères attendus',
  /** Indication sous « Ministères attendus » (ancienne bulle `sessions.attendus`, T66 t305). */
  indicationMinisteres: 'Décochez les ministères qui ne participent pas.',
  boutonDeclarer: 'Ajouter la session',
  boutonEnregistrer: 'Enregistrer les ministères attendus',
  /** Règle commune : « Enregistrement en cours » (T66, t309). */
  enCours: 'Enregistrement en cours',
  /** Fenêtre « Supprimer la session », pendant l'envoi. */
  suppressionEnCours: 'Suppression en cours',
  annuler: 'Annuler',
  /** Sous le titre d'une modification : seul le choix des ministères change. */
  noteModification: 'Seuls les ministères attendus peuvent changer.',
  /** « Enregistrer » sans changement : rien ne part (m206). */
  dejaEnregistres:
    'Ces ministères attendus sont déjà enregistrés. Cochez ou décochez un ministère.',
  /**
   * Aucun ministère actif, lu par EJP Tech, qui les ajoute dans Ministères et comptes (T66, t306 ;
   * le bouton y dit « Ajouter un ministère »).
   */
  aucunMinistere: 'Aucun ministère actif. Ajoutez-en dans Ministères et comptes.',
  /**
   * Le même cas pour l'administration de l'église, qui ne crée plus de ministère depuis T60 : la
   * phrase de l'écran Indicateurs (`aucunMinistereLecture`).
   */
  aucunMinistereLecture: 'Aucun ministère actif. EJP Tech crée les ministères.',

  modifier: 'Modifier',
  supprimer: 'Supprimer',
  boutonSupprimer: 'Supprimer la session',
  /** La phrase commune des formulaires (T66, m257). */
  erreurConnexion: 'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
  /** Forme commune « introuvable » (T66, t310 et m207). */
  erreurAcces: 'Cette session est introuvable. Rechargez la page.',
  /** Refus de droit d'un ajout : il n'y a pas encore de session (T66, m207). */
  erreurAccesAjout: "Votre compte ne permet pas d'ajouter une session.",
  erreurConnexionSuppression: 'La connexion a échoué. Réessayez.',
} as const

/** Libellé court d'un type, sur les trois choix du formulaire (glossaire « session », T66). */
export const LIBELLES_TYPES: Record<TypeSession, string> = {
  batir: "Bâtir l'Église",
  anti_dispersion: 'Anti-Dispersion',
  autre: 'Autre session',
}

/** « Manquent : A, B et C », « Manque : A » ; null si personne ne manque. */
export function phraseManquants(noms: readonly string[]): string | null {
  if (noms.length === 0) return null
  return `${accorder(noms.length, 'Manque', 'Manquent')} : ${listeNoms(trierNoms(noms))}`
}

/** « 6 sur 8 » : saisies sur ministères attendus. */
export function phraseSaisies(saisis: number, attendus: number): string {
  return libelleCompletude(saisis, attendus)
}

/** « 8 sur 8 » au-dessus des cases : ministères cochés sur ministères proposés. */
export function phraseCoches(coches: number, proposes: number): string {
  return libelleCompletude(coches, proposes)
}

/** Samedi à partir de `aujourdhui` (lui-même s'il est un samedi) : la date proposée par défaut. */
export function prochainSamedi(aujourdhui: DateIso): DateIso {
  const samedi = 6
  return ajouterJours(aujourdhui, (samedi - jourDeLaSemaine(aujourdhui) + 7) % 7)
}

export const REUSSITES_SESSIONS = {
  declaree: (session: string) => `Session ${session} ajoutée.`,
  modifiee: (session: string) => `Ministères attendus de ${session} enregistrés.`,
  supprimee: (session: string) => `Session ${session} supprimée.`,
} as const

/** Confirmation de suppression : ce qui se passe, et que c'est définitif (T66, m211). */
export function confirmationSupprimer(session: string): TexteConfirmation {
  return {
    titre: `Supprimer ${session} ?`,
    texte: "Les ministères ne pourront plus y saisir leurs présents. C'est définitif.",
    bouton: TEXTES_SESSIONS.boutonSupprimer,
    enCours: TEXTES_SESSIONS.suppressionEnCours,
  }
}
