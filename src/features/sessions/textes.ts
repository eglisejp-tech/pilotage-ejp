// Textes de l'écran 14, « Sessions » (lot L2). Aucun composant n'écrit un de ces textes en dur.
// Sources : maquette 14 ; BRIEF, section 9 (« Sessions (14) ») ; LISEZMOI des maquettes (écart de
// 14 : troisième type, « Modifier » et « Supprimer »). « Proposé » : texte que ni le BRIEF ni la
// maquette ne donnent (état vide, confirmation, messages de réussite), reporté dans LISEZMOI.md.

import type { TypeSession } from '@/lib/base'
import { ajouterJours, jourDeLaSemaine } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { libelleCompletude } from '@/lib/metier/completude'
import { accorder, listeNoms, trierNoms } from '@/lib/metier/texte'

export const TEXTES_SESSIONS = {
  titre: 'Sessions',
  introduction:
    "Déclarez chaque session de Bâtir l'Église et d'Anti-Dispersion, ou un autre rassemblement. Les ministères attendus y saisiront le nombre de leurs STARs présents.",
  titreListe: 'Sessions déclarées',
  /** État vide (T36, « premier usage »). */
  vide: 'Aucune session déclarée. Déclarez la première avec le panneau.',
  chargement: 'Chargement',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',

  colonneDate: 'Date',
  colonneSession: 'Session',
  colonneAttendus: 'Attendus',
  colonneSaisies: 'Saisies',
  colonneActions: 'Actions',
  pasEncoreEuLieu: 'Pas encore eu lieu',

  // Formulaire (maquette 14, colonne « Déclarer une session »)
  declarer: 'Déclarer une session',
  surtitre: 'Sessions',
  legendeType: 'Type',
  champDate: 'Date',
  champNom: 'Nom du rassemblement',
  titreMinisteres: 'Ministères attendus',
  boutonDeclarer: 'Déclarer la session',
  boutonEnregistrer: 'Enregistrer les ministères attendus',
  enCours: 'Envoi en cours',
  annuler: 'Annuler',
  /** Sous le titre d'une modification : seul le choix des ministères change. */
  noteModification:
    'Le type, la date et le nom ne changent plus. Choisissez les ministères attendus.',
  aucunMinistere: 'Aucun ministère actif.',

  modifier: 'Modifier',
  supprimer: 'Supprimer',
  boutonSupprimer: 'Supprimer la session',
  erreurConnexion: 'La connexion a échoué. Vos choix sont encore dans le formulaire : réessayez.',
  erreurAcces: "Cette session n'existe pas ou vous n'y avez pas accès.",
  erreurConnexionSuppression: 'La connexion a échoué. Réessayez.',
} as const

/** Libellé court d'un type, sur les trois choix du formulaire. */
export const LIBELLES_TYPES: Record<TypeSession, string> = {
  batir: "Bâtir l'Église",
  anti_dispersion: 'Anti-Dispersion',
  autre: 'Autre rassemblement',
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
  declaree: (session: string) => `Session ${session} déclarée.`,
  modifiee: (session: string) => `Ministères attendus de ${session} enregistrés.`,
  supprimee: (session: string) => `Session ${session} supprimée.`,
} as const

/** Confirmation de suppression (texte Proposé). */
export function confirmationSupprimer(session: string) {
  return {
    titre: `Supprimer ${session} ?`,
    texte:
      "Aucun ministère n'a encore saisi cette session. Elle quitte la liste et ne peut plus être saisie.",
    bouton: TEXTES_SESSIONS.boutonSupprimer,
  }
}
