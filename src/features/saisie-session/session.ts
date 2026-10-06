// Métier de la saisie d'une session (maquette 09, BRIEF section 9, « Saisie d'une session ») :
// ligne calculée, phrase de complétude, lignes de « Choisir la session » et adresses. Fonctions
// pures : les nombres viennent des vues (`v_session_completude`, `v_participation_courante`).

import type { ChampsSession } from '@/features/saisie-session/schemas'
import type { TypeSession } from '@/lib/base'
import {
  formaterHeure,
  formaterJourCourt,
  formaterJourSemaine,
  heureDeParis,
  jourDeParis,
} from '@/lib/metier/dates'
import type { DateIso, Instant } from '@/lib/metier/dates'
import { nomSession, sessionDu } from '@/lib/metier/phrases'
import { accorder, listeNoms, nombre, terminerPhrase } from '@/lib/metier/texte'

/**
 * Textes des états de la saisie d'une session (« Proposé » : plan de l'étape 4, E4, sur le
 * modèle de T22 ; T36 pour les six situations).
 */
export const TEXTES_SESSION = {
  /** En attente des autres : l'administration n'a déclaré aucune session passée. */
  aucuneSession: 'Aucune session à saisir.',
  quiDeclare: "L'administration de l'église déclare les sessions.",
  /** Tout est fait : chaque session récente a sa saisie. */
  toutesSaisies:
    'Toutes les sessions récentes sont saisies. Ouvrez une session pour corriger sa saisie.',
  choisir: 'Choisissez la session à saisir.',
  /** Aucun résultat : identifiant inconnu dans l'adresse. */
  introuvable: "Cette session n'existe pas ou n'est plus proposée.",
  /** En attente : une session future n'accepte aucune saisie (BRIEF, règle 5). */
  future: "Cette session n'a pas encore eu lieu. Sa saisie ouvrira le jour de la session.",
  autreSession: 'Choisir une autre session',
  titreChoix: 'Choisir la session',
} as const

/** « Choisir la session » : `/saisir/session/:id` avec ce mot à la place d'un identifiant. */
export const CHOIX_SESSION = 'choisir'

/** Adresse de la saisie d'une session, ou du choix de la session sans identifiant. */
export function adresseSaisieSession(sessionId: string = CHOIX_SESSION): string {
  return `/saisir/session/${sessionId}`
}

/**
 * « Saisir une session » (accueil 07, lot E7) : la saisie de la session si une seule attend le
 * ministère, sinon le panneau « Choisir la session » (BRIEF, section 9).
 */
export function adresseSaisirUneSession(sessionsASaisir: readonly string[]): string {
  const [seule] = sessionsASaisir
  return sessionsASaisir.length === 1 && seule !== undefined
    ? adresseSaisieSession(seule)
    : adresseSaisieSession()
}

/** Nombre écrit dans un champ, ou null s'il est vide. */
function lire(texte: string): number | null {
  return texte === '' ? null : Number(texte)
}

/**
 * « Comptés dans le total de l'église : 11. » : présents moins déjà comptés par leur ministère
 * principal (BRIEF, règle 5). Null tant que les présents manquent ou que la saisie est impossible
 * (déjà comptés au-delà des présents) : la ligne ne montre jamais un nombre faux.
 */
export function comptesDansTotal(champs: ChampsSession): number | null {
  const presents = lire(champs.presents)
  const dejaComptes = lire(champs.dejaComptes) ?? 0
  if (presents === null || dejaComptes > presents) return null
  return presents - dejaComptes
}

export function ligneComptesDansTotal(champs: ChampsSession): string {
  const comptes = comptesDansTotal(champs)
  return comptes === null
    ? "Comptés dans le total de l'église : saisissez d'abord les présents."
    : `Comptés dans le total de l'église : ${nombre(comptes)}.`
}

/** Phrase de complétude de la session : début en texte, puis les manquants mis en valeur. */
export interface PhraseCompletudeSession {
  texte: string
  /** « Intégration et Coordination » ; null si personne ne manque. */
  manquants: string | null
}

/**
 * « 6 ministères sur 8 ont déjà saisi. Il manque Intégration et Coordination. » (maquette 09).
 * Les manquants viennent de la vue, dans l'ordre alphabétique.
 */
export function phraseCompletudeSession(
  nbSaisis: number,
  nbAttendus: number,
  manquants: readonly string[],
): PhraseCompletudeSession {
  if (nbAttendus === 0) {
    return { texte: "Aucun ministère n'est attendu à cette session.", manquants: null }
  }
  if (nbSaisis >= nbAttendus) {
    const tous =
      nbAttendus === 1
        ? 'Le ministère attendu a saisi.'
        : `Les ${nombre(nbAttendus)} ministères attendus ont saisi.`
    return { texte: tous, manquants: null }
  }
  const debut =
    nbSaisis === 0
      ? `Aucun des ${nombre(nbAttendus)} ministères attendus n'a encore saisi.`
      : `${nombre(nbSaisis)} ${accorder(nbSaisis, 'ministère', 'ministères')} sur ${nombre(nbAttendus)} ${accorder(nbSaisis, 'a', 'ont')} déjà saisi.`
  return {
    texte: manquants.length > 0 ? `${debut} Il manque ` : debut,
    manquants: manquants.length > 0 ? listeNoms(manquants) : null,
  }
}

/** Une session de « Choisir la session », avec la saisie du ministère. */
export interface SessionAChoisir {
  sessionId: string
  type: TypeSession
  intitule: string | null
  date: DateIso
  /** Présents saisis par le ministère (sa saisie la plus récente) ; null : à saisir. */
  presentsSaisis: number | null
}

export interface LigneChoixSession {
  sessionId: string
  /** « Bâtir l'Église, samedi 26 sept. » */
  libelle: string
  /** « à saisir », « 12 présents saisis » */
  etat: string
  aSaisir: boolean
  vers: string
}

/**
 * Lignes du panneau « Choisir la session » : les plus récentes d'abord, « Bâtir l'Église, samedi
 * 26 sept. : à saisir » ou « : 12 présents saisis » (BRIEF, section 9).
 */
export function lignesChoixSession(sessions: readonly SessionAChoisir[]): LigneChoixSession[] {
  return [...sessions]
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    .map((session) => ({
      sessionId: session.sessionId,
      libelle: `${nomSession(session.type, session.intitule)}, ${formaterJourSemaine(session.date)}`,
      etat:
        session.presentsSaisis === null
          ? 'à saisir'
          : `${nombre(session.presentsSaisis)} ${accorder(session.presentsSaisis, 'présent saisi', 'présents saisis')}`,
      aSaisir: session.presentsSaisis === null,
      vers: adresseSaisieSession(session.sessionId),
    }))
}

/** « le 27 sept. à 18 h 30 » : jour et heure de Paris d'une saisie. */
export function leJourAHeure(instant: Instant): string {
  return `le ${formaterJourCourt(jourDeParis(instant))} à ${formaterHeure(heureDeParis(instant))}`
}

/**
 * « Déjà saisi : 13 présents, dont 2 déjà comptés, le 27 sept. à 18 h 30. Votre saisie la
 * remplacera dans les totaux. » (comme « Déjà saisi » de la saisie du dimanche, BRIEF section 9).
 */
export function ligneDejaSaisi(saisie: {
  valeur: number
  deja_comptes: number
  saisi_le: string
}): string {
  const presents = `${nombre(saisie.valeur)} ${accorder(saisie.valeur, 'présent', 'présents')}`
  const dont = saisie.deja_comptes > 0 ? `, dont ${nombre(saisie.deja_comptes)} déjà comptés` : ''
  return `Déjà saisi : ${presents}${dont}, ${leJourAHeure(saisie.saisi_le)}. Votre saisie la remplacera dans les totaux.`
}

/** « Présence enregistrée pour Bâtir l'Église du 26 sept. » (LISEZMOI, « Réussite »). */
export function messageReussiteSession(
  type: TypeSession,
  intitule: string | null,
  date: DateIso,
): string {
  return terminerPhrase(`Présence enregistrée pour ${sessionDu(type, intitule, date)}`)
}
