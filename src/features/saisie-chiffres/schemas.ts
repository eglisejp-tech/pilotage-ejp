import { z } from 'zod'
import { LONGUEUR_TEXTE_MAX, LONGUEUR_TEXTE_MIN } from '@/features/indicateurs/schemas'
import { messageSommeDepasse, TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import { estDateIso, jourDeLaSemaine } from '@/lib/metier/dates'
import { estMois } from '@/lib/metier/periodes'
import { PLAFOND_UNITE } from '@/lib/metier/unites'

// Schémas des saisies des chiffres (lot E3), partagés entre les formulaires et les appels à la
// base (`src/data/saisies.ts`, CLAUDE.md : validation Zod partagée). Les bornes sont celles de la
// base : `controler_mesure` (plafond de l'unité, B1) et `saisir_chiffres_mois` (B8 : 1 à 30
// lignes sans doublon, catégories de 0 à 9 999 dont la somme ne dépasse pas le total, précision de
// 10 à 280 caractères après `trim`). La base reste l'autorité ; le schéma évite l'aller-retour.

/** Un envoi compte 30 chiffres au plus (limite des lignes d'une fiche, `saisir_chiffres_mois`). */
export const LIGNES_MAX = 30

/** Valeur d'une catégorie de répartition : de 0 à 9 999 (B8). */
export const CATEGORIE_MAX = 9999

/** Plus haut plafond d'unité : la borne exacte de chaque unité se contrôle champ par champ. */
const VALEUR_MAX = Math.max(...Object.values(PLAFOND_UNITE))

const MESSAGE_CATEGORIE = 'Entre 0 et 9 999.'

/**
 * Précision d'un total sensible (P46) : 10 à 280 caractères après suppression des blancs autour.
 * Les caractères se comptent comme la base (`char_length`), pas en unités UTF-16. Un champ vide
 * n'est pas une précision : le formulaire ne l'envoie pas (`lirePrecision`).
 */
export const schemaPrecision = z
  .string()
  .trim()
  .superRefine((texte, contexte) => {
    const longueur = Array.from(texte).length
    if (longueur < LONGUEUR_TEXTE_MIN) {
      contexte.addIssue({ code: 'custom', message: TEXTES_CHIFFRES.precisionTropCourte })
    } else if (longueur > LONGUEUR_TEXTE_MAX) {
      contexte.addIssue({ code: 'custom', message: TEXTES_CHIFFRES.precisionTropLongue })
    }
  })

/** Valeur d'une catégorie : un entier de 0 à 9 999. */
export const schemaValeurCategorie = z
  .number({ error: 'Saisissez un nombre.' })
  .int('Saisissez un nombre entier.')
  .min(0, MESSAGE_CATEGORIE)
  .max(CATEGORIE_MAX, MESSAGE_CATEGORIE)

/** Répartition d'un total : valeur par code de catégorie (`categorie_sensible.code`). */
export const schemaCategories = z.record(
  z.string().regex(/^[a-z_]{1,30}$/, 'Catégorie inconnue.'),
  schemaValeurCategorie,
)

/** Somme des catégories d'une répartition. */
export function sommeCategories(categories: Readonly<Record<string, number>>): number {
  return Object.values(categories).reduce((somme, valeur) => somme + valeur, 0)
}

/** Un élément de `p_lignes` de `saisir_chiffres_mois` (contrat, section 7). */
export const schemaLigneMois = z
  .object({
    indicateur_id: z.string().min(1),
    valeur: z
      .number({ error: 'Saisissez un nombre.' })
      .int('Saisissez un nombre entier.')
      .min(0)
      .max(VALEUR_MAX),
    categories: schemaCategories.optional(),
    precision: schemaPrecision.optional(),
  })
  .superRefine((ligne, contexte) => {
    if (ligne.categories === undefined) return
    const somme = sommeCategories(ligne.categories)
    if (somme > ligne.valeur) {
      contexte.addIssue({
        code: 'custom',
        path: ['categories'],
        message: messageSommeDepasse(somme, ligne.valeur),
      })
    }
  })

/** Lignes sans doublon d'indicateur. */
function sansDoublon<T>(cle: (element: T) => string) {
  return (lignes: readonly T[], contexte: z.RefinementCtx) => {
    const vus = new Set<string>()
    for (const ligne of lignes) {
      const id = cle(ligne)
      if (vus.has(id)) {
        contexte.addIssue({ code: 'custom', message: "Un indicateur ne se saisit qu'une fois." })
        return
      }
      vus.add(id)
    }
  }
}

/** « Chiffres du mois » : tout le mois en un appel, tout ou rien (B8). */
export const schemaSaisieMois = z.object({
  mois: z.string().refine(estMois, 'Choisissez un mois.'),
  lignes: z
    .array(schemaLigneMois)
    .min(1, TEXTES_CHIFFRES.aucunChiffre)
    .max(LIGNES_MAX, `Un envoi compte ${LIGNES_MAX} chiffres au plus.`)
    .superRefine(sansDoublon((ligne) => ligne.indicateur_id)),
})

/** Une valeur de la saisie du dimanche : l'indicateur et son entier. */
export const schemaLigneDimanche = z.object({
  indicateurId: z.string().min(1),
  valeur: z
    .number({ error: 'Saisissez un nombre.' })
    .int('Saisissez un nombre entier.')
    .min(0)
    .max(VALEUR_MAX),
})

/**
 * Saisie du dimanche : un dimanche (la base refuse un dimanche futur), le ministère du compte et
 * ses valeurs, en une seule instruction `insert` (BRIEF, section 9).
 */
export const schemaSaisieDimanche = z.object({
  ministereId: z.string().min(1),
  dimanche: z
    .string()
    .refine(
      (date) => estDateIso(date) && jourDeLaSemaine(date) === 7,
      'La date doit être un dimanche.',
    ),
  lignes: z
    .array(schemaLigneDimanche)
    .min(1, TEXTES_CHIFFRES.aucunChiffre)
    .max(LIGNES_MAX, `Un envoi compte ${LIGNES_MAX} chiffres au plus.`)
    .superRefine(sansDoublon((ligne) => ligne.indicateurId)),
})

export type LigneMois = z.infer<typeof schemaLigneMois>
export type SaisieMois = z.input<typeof schemaSaisieMois>
export type SaisieDimanche = z.input<typeof schemaSaisieDimanche>
