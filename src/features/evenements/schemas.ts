import { z } from 'zod'
import { TEXTES_EVENEMENT, TEXTES_REUNION, LONGUEUR_MAX_COURT } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import type { StatutEvenement } from '@/lib/base'
import { estDateIso } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

// Schémas partagés entre les formulaires d'événement et de réunion et les appels de
// `src/data/evenementsEcriture.ts` et `src/data/reunions.ts` (CLAUDE.md : validation Zod
// partagée). Deux étages :
// - les schémas « de base » (`schemaBase...`) disent ce que la base accepte, sans contexte :
//   les fonctions de `src/data/` les appliquent à chaque appel, quel que soit l'appelant
//   (formulaire, calendrier, « Vos saisies ») ;
// - les schémas des formulaires (`schemaAjoutEvenement`, ...) ajoutent le plancher `aujourdhui`
//   et lisent les champs tels qu'ils sont saisis (chaînes, vide pour « rien »).
// La base reste la garde (règle 14, T37 ; politique d'ajout de `reunion`). « Aujourd'hui » vient
// toujours de `v_semaine.aujourdhui` (heure de Paris), jamais de la date du navigateur.

const VALEURS_STATUT = [
  'brouillon',
  'attente_validation',
  'valide',
  'preparation',
  'termine',
  'annule',
] as const satisfies readonly StatutEvenement[]

const MOTIF_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Un statut parmi la liste fixe ; le formulaire part sans choix (chaîne vide) à l'ajout. */
const schemaStatut = z
  .string()
  .pipe(z.enum(VALEURS_STATUT, { error: TEXTES_EVENEMENT.erreurStatut }))

/** Une date au format AAAA-MM-JJ, sans plancher. */
function dateDeBase(messageVide: string) {
  return z.string().refine(estDateIso, messageVide)
}

const schemaTitre = z
  .string()
  .trim()
  .min(1, TEXTES_EVENEMENT.erreurNomVide)
  .max(LONGUEUR_MAX_COURT, TEXTES_EVENEMENT.erreurNomLong)

/** Identifiants de ministères mentionnés : des uuid, sans doublon (la base refuse un autre texte). */
const schemaMentions = z
  .array(z.uuid(TEXTES_EVENEMENT.erreurMention))
  .transform((ids) => [...new Set(ids)])

const schemaIdentifiant = z.uuid()

/** Heure HH:MM facultative, telle que la base la reçoit (null : aucune heure). */
const heureDeBase = z.string().regex(MOTIF_HEURE, TEXTES_REUNION.erreurHeure).nullable()

/** Texte court facultatif tel que la base le reçoit (null : aucun texte). */
function texteCourtDeBase(messageLong: string) {
  return z.string().min(1).max(LONGUEUR_MAX_COURT, messageLong).nullable()
}

/**
 * Champ date d'un formulaire : vide refusé ; une date avant `aujourdhui` refusée avec
 * `messagePassee`, sauf si elle est égale à `dateActuelle` (une date inchangée, même passée,
 * reste permise à la mise à jour, T37). Une seule erreur à la fois.
 */
function champDate(options: {
  aujourdhui: DateIso
  messageVide: string
  messagePassee: string
  dateActuelle?: DateIso
}) {
  return z.string().superRefine((valeur, contexte) => {
    if (!estDateIso(valeur)) {
      contexte.addIssue({ code: 'custom', message: options.messageVide })
    } else if (valeur !== options.dateActuelle && valeur < options.aujourdhui) {
      contexte.addIssue({ code: 'custom', message: options.messagePassee })
    }
  })
}

/** Texte court facultatif d'un formulaire (objet, décision attendue) : vide devient null. */
function texteCourtFacultatif(messageLong: string) {
  return z
    .string()
    .trim()
    .transform((texte) => (texte === '' ? null : texte))
    .pipe(texteCourtDeBase(messageLong))
}

// ---------------------------------------------------------------------------------------------
// Schémas de base : appliqués par `src/data/` à chaque appel d'écriture.
// ---------------------------------------------------------------------------------------------

/** Ce que `ajouter_evenement` reçoit. */
export const schemaBaseAjoutEvenement = z.object({
  date: dateDeBase(TEXTES_EVENEMENT.erreurDateVide),
  titre: schemaTitre,
  statut: schemaStatut,
  mentions: schemaMentions,
})

/** Ce que la ligne d'état d'un événement reçoit (la base contrôle la date et la ligne identique). */
export const schemaBaseMiseAJourEvenement = z.object({
  date: dateDeBase(TEXTES_EVENEMENT.erreurDateVide),
  statut: schemaStatut,
})

/** Ce que la table `reunion` reçoit (la politique d'ajout contrôle la date). */
export const schemaBaseReunion = z.object({
  date: dateDeBase(TEXTES_REUNION.erreurDateVide),
  heure: heureDeBase,
  objet: texteCourtDeBase(TEXTES_REUNION.erreurObjetLong),
  decision: texteCourtDeBase(TEXTES_REUNION.erreurDecisionLongue),
})

/** Identifiant d'un événement ou d'un ministère, avant tout appel qui le porte. */
export function verifierIdentifiant(valeur: string): string {
  return schemaIdentifiant.parse(valeur)
}

// ---------------------------------------------------------------------------------------------
// Schémas des formulaires.
// ---------------------------------------------------------------------------------------------

/** Ajout d'un événement (maquette 11) : `ministereId` est celui du compte, jamais mentionné. */
export function schemaAjoutEvenement(contexte: { aujourdhui: DateIso; ministereId: string }) {
  return z.object({
    date: champDate({
      aujourdhui: contexte.aujourdhui,
      messageVide: TEXTES_EVENEMENT.erreurDateVide,
      messagePassee: TEXTES_SIGNALEMENT.dateRefuseeAjout,
    }),
    titre: schemaTitre,
    statut: schemaStatut,
    // Mentions sans doublon, jamais le ministère lui-même (T32 ; la base refuse aussi).
    mentions: schemaMentions.refine(
      (ids) => !ids.includes(contexte.ministereId),
      TEXTES_EVENEMENT.erreurMention,
    ),
  })
}

/**
 * Mise à jour d'un événement (panneau dérivé de 11) : une nouvelle date passée est refusée, la
 * date actuelle reste permise même passée (T37). Une ligne identique au dernier état part à la
 * base, qui la refuse avec son message (affiché sous le bouton).
 */
export function schemaMiseAJourEvenement(contexte: { aujourdhui: DateIso; dateActuelle: DateIso }) {
  return z.object({
    date: champDate({
      aujourdhui: contexte.aujourdhui,
      dateActuelle: contexte.dateActuelle,
      messageVide: TEXTES_EVENEMENT.erreurDateVide,
      messagePassee: TEXTES_SIGNALEMENT.dateRefuseeMiseAJour,
    }),
    statut: schemaStatut,
  })
}

/** Prochaine réunion (panneau dérivé de 11) : date du jour ou à venir, le reste facultatif. */
export function schemaReunion(contexte: { aujourdhui: DateIso }) {
  return z.object({
    date: champDate({
      aujourdhui: contexte.aujourdhui,
      messageVide: TEXTES_REUNION.erreurDateVide,
      messagePassee: TEXTES_REUNION.erreurDatePassee,
    }),
    heure: z
      .string()
      .trim()
      .transform((heure) => (heure === '' ? null : heure))
      .pipe(heureDeBase),
    objet: texteCourtFacultatif(TEXTES_REUNION.erreurObjetLong),
    decision: texteCourtFacultatif(TEXTES_REUNION.erreurDecisionLongue),
  })
}

export type ValeursAjoutEvenement = z.input<ReturnType<typeof schemaAjoutEvenement>>
export type AjoutEvenement = z.output<typeof schemaBaseAjoutEvenement>
export type ValeursMiseAJourEvenement = z.input<ReturnType<typeof schemaMiseAJourEvenement>>
export type MiseAJourEvenement = z.output<typeof schemaBaseMiseAJourEvenement>
export type ValeursReunion = z.input<ReturnType<typeof schemaReunion>>
export type Reunion = z.output<typeof schemaBaseReunion>
