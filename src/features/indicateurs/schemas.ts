import { z } from 'zod'
import type { UniteIndicateur } from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'
import { refusDeMois } from '@/lib/metier/indicateurs'
import type { RefusMois } from '@/lib/metier/indicateurs'
import { nombre } from '@/lib/metier/texte'
import { plafondUnite } from '@/lib/metier/unites'

// Schémas partagés entre les formulaires des indicateurs (saisies, étape 4 ; « Pourquoi » et
// motifs, étape 6) et les appels à la base (CLAUDE.md : validation Zod partagée). Les bornes sont
// celles de la base (`private.controler_mesure`, plan de l'étape 4, B1) : la base reste l'autorité,
// le schéma évite l'aller-retour. Les messages sont ceux de `configuration-indicateurs.md` 7.7.

/** Un « Pourquoi » ou un motif : 10 à 280 caractères après suppression des espaces autour. */
export const LONGUEUR_TEXTE_MIN = 10
export const LONGUEUR_TEXTE_MAX = 280

/** Heures et minutes d'un champ d'heure : de 0 h 00 à 23 h 59 (1439 minutes depuis minuit). */
export const HEURE_MAX = 23
export const MINUTE_MAX = 59

/** Message d'une valeur hors limites : « Entre 0 et 9 999. », « Entre 0 h et 23 h 59. ». */
export function messageBorne(unite: UniteIndicateur): string {
  return unite === 'heure' ? 'Entre 0 h et 23 h 59.' : `Entre 0 et ${nombre(plafondUnite(unite))}.`
}

/**
 * Valeur d'un indicateur : un entier de 0 au plafond de son unité (9 999, 9 999 999, 99 999 jours,
 * 1439 minutes). Pas de décimale (R5). Une absence n'est pas un 0 : un champ vide n'envoie rien.
 */
export function schemaValeur(unite: UniteIndicateur) {
  const borne = messageBorne(unite)
  return z
    .number({ error: 'Saisissez un nombre.' })
    .int('Saisissez un nombre entier.')
    .min(0, borne)
    .max(plafondUnite(unite), borne)
}

/**
 * Heure saisie en heures et minutes (« 10 » et « 42 »), rendue en minutes depuis minuit (642),
 * la valeur que la base enregistre pour l'unité `heure`.
 */
export const schemaHeure = z
  .object({
    heures: z
      .number({ error: 'Saisissez les heures.' })
      .int('Saisissez des heures entières.')
      .min(0, 'Les heures vont de 0 à 23.')
      .max(HEURE_MAX, 'Les heures vont de 0 à 23.'),
    minutes: z
      .number({ error: 'Saisissez les minutes.' })
      .int('Saisissez des minutes entières.')
      .min(0, 'Les minutes vont de 0 à 59.')
      .max(MINUTE_MAX, 'Les minutes vont de 0 à 59.'),
  })
  .transform(({ heures, minutes }) => heures * 60 + minutes)

const MESSAGES_MOIS: Readonly<Record<RefusMois, string>> = {
  invalide: 'Choisissez un mois.',
  futur: "Ce mois n'est pas encore commencé.",
  trop_ancien: 'Ce mois est trop ancien pour être saisi.',
}

/**
 * Mois d'une saisie, au format AAAA-MM : le mois en cours est permis (pour tout indicateur,
 * sensible compris, décision du 6 octobre 2026), jamais un mois futur ni un mois avant le
 * 1er janvier de l'année précédente. `aujourdhui` est le jour de Paris de `v_semaine`, jamais la
 * date du navigateur.
 */
export function schemaMoisSaisie(aujourdhui: DateIso) {
  return z.string({ error: MESSAGES_MOIS.invalide }).superRefine((mois, contexte) => {
    const refus = refusDeMois(mois, aujourdhui)
    if (refus !== null) contexte.addIssue({ code: 'custom', message: MESSAGES_MOIS[refus] })
  })
}

function schemaTexteLibre(messageTropCourt: string) {
  return z
    .string({ error: messageTropCourt })
    .trim()
    .superRefine((texte, contexte) => {
      // Les caractères se comptent comme la base (`char_length`), pas en unités UTF-16.
      const longueur = Array.from(texte).length
      if (longueur < LONGUEUR_TEXTE_MIN) {
        contexte.addIssue({ code: 'custom', message: messageTropCourt })
      } else if (longueur > LONGUEUR_TEXTE_MAX) {
        contexte.addIssue({ code: 'custom', message: `${LONGUEUR_TEXTE_MAX} caractères au plus.` })
      }
    })
}

/** « Pourquoi cet indicateur ? » : 10 à 280 caractères. Aucun rappel sous ce champ (T30). */
export const schemaPourquoi = schemaTexteLibre('Expliquez pourquoi en 10 caractères au moins.')

/** Motif d'un refus ou d'une décision : 10 à 280 caractères. */
export const schemaMotif = schemaTexteLibre('Écrivez le motif en 10 caractères au moins.')

export type ValeurIndicateur = z.infer<ReturnType<typeof schemaValeur>>
export type HeureEnMinutes = z.infer<typeof schemaHeure>
