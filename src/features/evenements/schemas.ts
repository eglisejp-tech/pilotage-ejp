import { z } from 'zod'
import { TEXTES_EVENEMENT, TEXTES_REUNION, LONGUEUR_MAX_COURT } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import type { StatutEvenement } from '@/lib/base'
import { estDateIso } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

// Schémas partagés entre les formulaires d'événement et de réunion et les appels de
// `src/data/evenementsEcriture.ts` et `src/data/reunions.ts` (CLAUDE.md : validation Zod
// partagée). Le formulaire contrôle avant l'envoi ce que la base refuserait ; la base reste la
// garde (règle 14, T37 ; politique d'ajout de `reunion`). « Aujourd'hui » vient toujours de
// `v_semaine.aujourdhui` (heure de Paris), jamais de la date du navigateur.

const VALEURS_STATUT = [
  'brouillon',
  'attente_validation',
  'valide',
  'preparation',
  'termine',
  'annule',
] as const satisfies readonly StatutEvenement[]

/** Un statut parmi la liste fixe ; le formulaire part sans choix (chaîne vide) à l'ajout. */
const schemaStatut = z
  .string()
  .pipe(z.enum(VALEURS_STATUT, { error: TEXTES_EVENEMENT.erreurStatut }))

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

/** Texte court facultatif (objet, décision attendue) : espaces retirés, vide devient null. */
function texteCourtFacultatif(messageLong: string) {
  return z
    .string()
    .trim()
    .max(LONGUEUR_MAX_COURT, messageLong)
    .transform((texte) => (texte === '' ? null : texte))
}

/** Ajout d'un événement (maquette 11) : `ministereId` est celui du compte, jamais mentionné. */
export function schemaAjoutEvenement(contexte: { aujourdhui: DateIso; ministereId: string }) {
  return z.object({
    date: champDate({
      aujourdhui: contexte.aujourdhui,
      messageVide: TEXTES_EVENEMENT.erreurDateVide,
      messagePassee: TEXTES_SIGNALEMENT.dateRefuseeAjout,
    }),
    titre: z
      .string()
      .trim()
      .min(1, TEXTES_EVENEMENT.erreurNomVide)
      .max(LONGUEUR_MAX_COURT, TEXTES_EVENEMENT.erreurNomLong),
    statut: schemaStatut,
    // Mentions sans doublon, jamais le ministère lui-même (T32 ; la base refuse aussi).
    mentions: z
      .array(z.string())
      .transform((ids) => [...new Set(ids)])
      .refine((ids) => !ids.includes(contexte.ministereId), TEXTES_EVENEMENT.erreurMention),
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
      .refine(
        (heure) => heure === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(heure),
        TEXTES_REUNION.erreurHeure,
      )
      .transform((heure) => (heure === '' ? null : heure)),
    objet: texteCourtFacultatif(TEXTES_REUNION.erreurObjetLong),
    decision: texteCourtFacultatif(TEXTES_REUNION.erreurDecisionLongue),
  })
}

export type ValeursAjoutEvenement = z.input<ReturnType<typeof schemaAjoutEvenement>>
export type AjoutEvenement = z.output<ReturnType<typeof schemaAjoutEvenement>>
export type ValeursMiseAJourEvenement = z.input<ReturnType<typeof schemaMiseAJourEvenement>>
export type MiseAJourEvenement = z.output<ReturnType<typeof schemaMiseAJourEvenement>>
export type ValeursReunion = z.input<ReturnType<typeof schemaReunion>>
export type Reunion = z.output<ReturnType<typeof schemaReunion>>
