import { z } from 'zod'
import { TEXTES_EVENEMENT, TEXTES_REUNION, LONGUEUR_MAX_COURT } from '@/features/evenements/textes'
import { TEXTES_PLAGES } from '@/features/evenements/textesPlages'
import type { Quand } from '@/features/evenements/textesPlages'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import type { StatutEvenement } from '@/lib/base'
import { ajouterJours, estDateIso } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import {
  DATES_MAX_SERIE,
  DATES_MIN_SERIE,
  datesDeSerie,
  ECART_MAX_JOURS,
  unAnApres,
} from '@/lib/metier/plages'
import { heureDepuisMinutes, minutesDepuisHeure, PLAFOND_UNITE } from '@/lib/metier/unites'

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

/**
 * Heure d'un événement telle que la base la reçoit (T68) : minutes depuis minuit, heure de Paris,
 * de 0 à 1439, ou null. Null à l'ajout : aucune heure prévue ; à la mise à jour : la base reprend
 * l'heure du dernier état (une heure enregistrée se corrige, elle ne s'efface pas).
 */
const minutesDeBase = z
  .number({ error: TEXTES_EVENEMENT.erreurHeure })
  .int(TEXTES_EVENEMENT.erreurHeure)
  .min(0, TEXTES_EVENEMENT.erreurHeure)
  .max(PLAFOND_UNITE.heure, TEXTES_EVENEMENT.erreurHeure)
  .nullable()

/**
 * Champ heure d'un formulaire d'événement (`type="time"`, « 19:05 ») : vide devient null, une
 * heure devient des minutes depuis minuit (« 19:05 » donne 1145).
 */
const champHeureEvenement = z
  .string()
  .trim()
  .refine((heure) => heure === '' || MOTIF_HEURE.test(heure), TEXTES_EVENEMENT.erreurHeure)
  .transform((heure) => (heure === '' ? null : minutesDeLaSaisie(heure)))

/** « 19:05 » (déjà contrôlé par `MOTIF_HEURE`) en minutes depuis minuit. */
function minutesDeLaSaisie(heure: string): number | null {
  const [heures = '', minutes = ''] = heure.split(':')
  return minutesDepuisHeure(Number(heures), Number(minutes))
}

/** Minutes depuis minuit en valeur d'un champ `type="time"` (« 19:05 ») ; null donne un champ vide. */
export function valeurChampHeure(minutes: number | null): string {
  if (minutes === null) return ''
  const { heures, minutes: reste } = heureDepuisMinutes(minutes)
  return `${String(heures).padStart(2, '0')}:${String(reste).padStart(2, '0')}`
}

/**
 * L'heure de début ne va qu'avec le statut Terminé (T68, E2) : dite sous le champ, avec la même
 * phrase que la traduction du refus de la base.
 */
function heureDebutAvecTermine(
  valeurs: { statut: string; heure_debut: number | null },
  contexte: z.RefinementCtx,
) {
  if (valeurs.heure_debut !== null && valeurs.statut !== 'termine') {
    contexte.addIssue({
      code: 'custom',
      path: ['heure_debut'],
      message: TEXTES_EVENEMENT.erreurHeureDebutSansTermine,
    })
  }
}

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

/**
 * Dernier jour d'un événement (T78, lot 2) : null pour un seul jour ; sinon du premier jour (le
 * même jour ramène à un seul jour) à 30 jours après. Même règle que la base.
 */
function finDansLaPlage(
  valeurs: { date: string; date_fin?: string | null },
  contexte: z.RefinementCtx,
) {
  const fin = valeurs.date_fin ?? null
  if (fin === null || !estDateIso(valeurs.date)) return
  if (fin < valeurs.date) {
    contexte.addIssue({
      code: 'custom',
      path: ['date_fin'],
      message: TEXTES_PLAGES.erreurFinAvantDebut,
    })
  } else if (fin > ajouterJours(valeurs.date, ECART_MAX_JOURS)) {
    contexte.addIssue({ code: 'custom', path: ['date_fin'], message: TEXTES_PLAGES.erreurTropLong })
  }
}

/**
 * Ce que `ajouter_evenement` reçoit (version à huit arguments, T78 lot 2) : le dernier jour et
 * l'heure de fin sont null pour un événement d'un jour sans heure de fin.
 */
export const schemaBaseAjoutEvenement = z
  .object({
    date: dateDeBase(TEXTES_EVENEMENT.erreurDateVide),
    date_fin: dateDeBase(TEXTES_PLAGES.erreurDernierJourVide).nullable().default(null),
    titre: schemaTitre,
    statut: schemaStatut,
    mentions: schemaMentions,
    heure_prevue: minutesDeBase,
    heure_fin: minutesDeBase.default(null),
  })
  .superRefine(finDansLaPlage)

/**
 * Ce que `ajouter_evenements_serie` reçoit (T78, lot 2) : 2 à 31 dates (la base les trie, retire
 * les doublons et refuse une date passée ou plus de 12 mois).
 */
export const schemaBaseSerie = z.object({
  dates: z
    .array(dateDeBase(TEXTES_EVENEMENT.erreurDateVide))
    .min(DATES_MIN_SERIE, TEXTES_PLAGES.erreurUneSeuleDate)
    .max(DATES_MAX_SERIE, TEXTES_PLAGES.erreurTropDeDates),
  titre: schemaTitre,
  statut: schemaStatut,
  mentions: schemaMentions,
  heure_prevue: minutesDeBase,
  heure_fin: minutesDeBase,
})

/**
 * Ce que la ligne d'état d'un événement reçoit. La base contrôle la date, l'heure de début sur
 * une date à venir (E1) et la ligne identique ; l'heure de début sans Terminé est refusée ici
 * aussi (E2). Le dernier jour et l'heure de fin (T78, lot 2) sont facultatifs : absents ou null,
 * la base reprend la durée et l'heure de fin du dernier état.
 */
export const schemaBaseMiseAJourEvenement = z
  .object({
    date: dateDeBase(TEXTES_EVENEMENT.erreurDateVide),
    statut: schemaStatut,
    heure_prevue: minutesDeBase,
    heure_debut: minutesDeBase,
    date_fin: dateDeBase(TEXTES_PLAGES.erreurDernierJourVide).nullable().optional(),
    heure_fin: minutesDeBase.optional(),
  })
  .superRefine(heureDebutAvecTermine)
  .superRefine(finDansLaPlage)

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

/** Un refus de plage, sous le champ qu'il vise. */
interface ErreurPlage {
  champ: 'date_fin' | 'jours'
  message: string
}

/**
 * Contrôle de la plage choisie par « Quand ? » (T78, lot 2 ; conception 8.1), une erreur à la
 * fois. « Plusieurs jours » : le dernier jour après le premier, 31 jours au plus. « Se répète » :
 * une dernière date, 12 mois au plus, au moins un jour coché, puis 2 à 31 dates trouvées.
 */
function erreurPlage(valeurs: {
  quand: Quand
  date: string
  date_fin: string
  jours: readonly string[]
}): ErreurPlage | null {
  const { quand, date, date_fin: fin } = valeurs
  if (quand === 'un_jour' || !estDateIso(date)) return null
  const serie = quand === 'repete'
  const enFin = (message: string): ErreurPlage => ({ champ: 'date_fin', message })
  const enJours = (message: string): ErreurPlage => ({ champ: 'jours', message })
  if (!estDateIso(fin)) {
    return enFin(serie ? TEXTES_PLAGES.erreurDerniereDateVide : TEXTES_PLAGES.erreurDernierJourVide)
  }
  if (!serie) {
    if (fin <= date) return enFin(TEXTES_PLAGES.erreurFinAvantDebut)
    if (fin > ajouterJours(date, ECART_MAX_JOURS)) return enFin(TEXTES_PLAGES.erreurTropLong)
    return null
  }
  if (fin < date) return enFin(TEXTES_PLAGES.erreurDerniereDateAvant)
  if (fin > unAnApres(date)) return enFin(TEXTES_PLAGES.erreurDouzeMois)
  if (valeurs.jours.length === 0) return enJours(TEXTES_PLAGES.erreurAucunJour)
  const nombre = datesDeSerie(date, fin, valeurs.jours.map(Number)).length
  if (nombre === 0) return enJours(TEXTES_PLAGES.erreurAucuneDate)
  if (nombre < DATES_MIN_SERIE) return enJours(TEXTES_PLAGES.erreurUneSeuleDate)
  if (nombre > DATES_MAX_SERIE) return enFin(TEXTES_PLAGES.erreurTropDeDates)
  return null
}

/**
 * Ajout d'un événement (maquette 11, étendue par T78 lot 2) : `ministereId` est celui du compte,
 * jamais mentionné. « Quand ? » choisit la forme : un jour (par défaut), plusieurs jours (un
 * événement, du premier au dernier jour) ou une série (un événement par date trouvée, les jours de
 * la semaine cochés entre la première et la dernière date). Le nom, le statut, les mentions et les
 * heures valent pour chaque date. La sortie dit quelle fonction appeler (`forme`).
 */
export function schemaAjoutEvenement(contexte: { aujourdhui: DateIso; ministereId: string }) {
  return z
    .object({
      quand: z.enum(['un_jour', 'plusieurs_jours', 'repete']).default('un_jour'),
      date: champDate({
        aujourdhui: contexte.aujourdhui,
        messageVide: TEXTES_EVENEMENT.erreurDateVide,
        messagePassee: TEXTES_SIGNALEMENT.dateRefuseeAjout,
      }),
      date_fin: z.string().default(''),
      jours: z.array(z.string()).default([]),
      titre: schemaTitre,
      statut: schemaStatut,
      // Mentions sans doublon, jamais le ministère lui-même (T32 ; la base refuse aussi).
      mentions: schemaMentions.refine(
        (ids) => !ids.includes(contexte.ministereId),
        TEXTES_EVENEMENT.erreurMention,
      ),
      // Heures prévue et de fin facultatives (T68, T78) ; jamais d'heure de début à l'ajout.
      heure_prevue: champHeureEvenement,
      heure_fin: champHeureEvenement.default(null),
    })
    .superRefine((valeurs, contexteZod) => {
      const erreur = erreurPlage(valeurs)
      if (erreur)
        contexteZod.addIssue({ code: 'custom', path: [erreur.champ], message: erreur.message })
    })
    .transform((valeurs): SaisieAjout => {
      const commun = {
        titre: valeurs.titre,
        statut: valeurs.statut,
        mentions: valeurs.mentions,
        heure_prevue: valeurs.heure_prevue,
        heure_fin: valeurs.heure_fin,
      }
      if (valeurs.quand === 'repete') {
        const jours = valeurs.jours.map(Number)
        return {
          forme: 'serie',
          dates: datesDeSerie(valeurs.date, valeurs.date_fin, jours),
          ...commun,
        }
      }
      return {
        forme: 'evenement',
        date: valeurs.date,
        date_fin: valeurs.quand === 'plusieurs_jours' ? valeurs.date_fin : null,
        ...commun,
      }
    })
}

/**
 * Mise à jour d'un événement (panneau dérivé de 11) : une nouvelle date passée est refusée, la
 * date actuelle reste permise même passée (T37). Heures (T68) : vide, la base reprend l'heure
 * enregistrée ; l'heure de fin aussi (T78, lot 2). Le champ « Heure de début » n'existe que pour
 * un Terminé daté au plus `aujourdhui` (`heureDebutPossible`) : sinon sa valeur gardée ne part pas
 * (null), jamais une erreur sous un champ caché ; la base refuse toujours une heure de début sans
 * Terminé (E2) ou à venir (E1). Un événement sur plusieurs jours (`plusieursJours`) a son dernier
 * jour, obligatoire, du premier jour (retour à un seul jour) à 30 jours après ; sinon le dernier
 * jour ne part pas (null : la base garde un seul jour). Une ligne identique au dernier état est
 * arrêtée par le formulaire (m134) ; la base la refuse aussi.
 */
export function schemaMiseAJourEvenement(contexte: {
  aujourdhui: DateIso
  dateActuelle: DateIso
  plusieursJours?: boolean
}) {
  return z
    .object({
      date: champDate({
        aujourdhui: contexte.aujourdhui,
        dateActuelle: contexte.dateActuelle,
        messageVide: TEXTES_EVENEMENT.erreurDateVide,
        messagePassee: TEXTES_SIGNALEMENT.dateRefuseeMiseAJour,
      }),
      date_fin: z.string().default(''),
      statut: schemaStatut,
      heure_prevue: champHeureEvenement,
      heure_debut: champHeureEvenement,
      heure_fin: champHeureEvenement.default(null),
    })
    .superRefine((valeurs, contexteZod) => {
      if (contexte.plusieursJours !== true || !estDateIso(valeurs.date)) return
      const message = !estDateIso(valeurs.date_fin)
        ? TEXTES_PLAGES.erreurDernierJourVide
        : valeurs.date_fin < valeurs.date
          ? TEXTES_PLAGES.erreurFinAvantDebut
          : valeurs.date_fin > ajouterJours(valeurs.date, ECART_MAX_JOURS)
            ? TEXTES_PLAGES.erreurTropLong
            : null
      if (message) contexteZod.addIssue({ code: 'custom', path: ['date_fin'], message })
    })
    .transform((valeurs) => {
      const avecFin = {
        ...valeurs,
        date_fin: contexte.plusieursJours === true ? valeurs.date_fin : null,
      }
      return heureDebutPossible({ ...valeurs, aujourdhui: contexte.aujourdhui })
        ? avecFin
        : { ...avecFin, heure_debut: null }
    })
}

/**
 * L'heure de début se propose pour un événement Terminé dont la date est au plus `aujourdhui`
 * (jour de Paris, `v_semaine.aujourdhui`, jamais la date du navigateur) : avant, la base la
 * refuserait (E1).
 */
export function heureDebutPossible(valeurs: {
  statut: string
  date: string
  aujourdhui: DateIso
}): boolean {
  return (
    valeurs.statut === 'termine' && estDateIso(valeurs.date) && valeurs.date <= valeurs.aujourdhui
  )
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
/** Ce qu'un appelant donne à `ajouterEvenement` : le dernier jour et l'heure de fin facultatifs. */
export type EntreeAjoutEvenement = z.input<typeof schemaBaseAjoutEvenement>
export type AjoutSerie = z.output<typeof schemaBaseSerie>
/** Sortie du formulaire d'ajout : un événement (un ou plusieurs jours) ou une série. */
export type SaisieAjout =
  ({ forme: 'evenement' } & AjoutEvenement) | ({ forme: 'serie' } & AjoutSerie)
export type ValeursMiseAJourEvenement = z.input<ReturnType<typeof schemaMiseAJourEvenement>>
export type MiseAJourEvenement = z.output<typeof schemaBaseMiseAJourEvenement>
export type ValeursReunion = z.input<ReturnType<typeof schemaReunion>>
export type Reunion = z.output<typeof schemaBaseReunion>
