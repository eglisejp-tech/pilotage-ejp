import { z } from 'zod'
import type { Departement, RubriqueFij } from '@/lib/base'
import { DEPARTEMENTS_FIJ, RUBRIQUES_FIJ, VALEUR_FIJ_MAX } from '@/features/saisie-fij/departements'
import { estDateIso, jourDeLaSemaine } from '@/lib/metier/dates'

// Schémas de la carte des FIJ et des chiffres par département, partagés entre les formulaires et
// les appels à la base (CLAUDE.md : validation Zod partagée). La base reste l'autorité
// (`fij_departement`, `saisir_fij_statistiques`) : le schéma reprend ses bornes pour éviter
// l'aller-retour.

export const MESSAGES_FIJ = {
  valeurManquante: 'Saisissez un nombre, 0 si aucun.',
  valeurBornes: 'Entre 0 et 9 999.',
  carteIncomplete: 'Saisissez les 8 départements : la carte part en un seul envoi.',
  aucuneValeur: 'Saisissez au moins une valeur.',
  dimanche: 'Choisissez une semaine.',
  doublon: "Chaque rubrique d'un département ne se saisit qu'une fois par envoi.",
} as const

const CODES_DEPARTEMENTS = DEPARTEMENTS_FIJ.map((departement) => departement.code) as [
  Departement,
  ...Departement[],
]
const CODES_RUBRIQUES = RUBRIQUES_FIJ.map((rubrique) => rubrique.code) as [
  RubriqueFij,
  ...RubriqueFij[],
]

/** Une valeur de la carte ou d'une rubrique : un entier de 0 à 9 999. */
export const schemaValeurFij = z
  .number({ error: MESSAGES_FIJ.valeurManquante })
  .int(MESSAGES_FIJ.valeurBornes)
  .min(0, MESSAGES_FIJ.valeurBornes)
  .max(VALEUR_FIJ_MAX, MESSAGES_FIJ.valeurBornes)

/** Carte des FIJ : les 8 départements, chacun une fois, en un seul envoi (BRIEF, section 9). */
export const schemaCarteFij = z
  .array(z.object({ departement: z.enum(CODES_DEPARTEMENTS), valeur: schemaValeurFij }))
  .length(DEPARTEMENTS_FIJ.length, MESSAGES_FIJ.carteIncomplete)
  .refine(
    (valeurs) => new Set(valeurs.map((ligne) => ligne.departement)).size === valeurs.length,
    MESSAGES_FIJ.carteIncomplete,
  )

export type SaisieCarteFij = z.infer<typeof schemaCarteFij>

/** Dimanche d'une semaine (du lundi au dimanche) : « AAAA-MM-JJ », un dimanche. */
const schemaDimanche = z
  .string()
  .refine((jour) => estDateIso(jour) && jourDeLaSemaine(jour) === 7, MESSAGES_FIJ.dimanche)

/**
 * Chiffres par département : 1 à 32 valeurs pour un dimanche, chaque couple (rubrique,
 * département) une fois au plus (`p_valeurs` de `saisir_fij_statistiques`, contrat section 7).
 * Un champ vide n'est pas envoyé : un département absent ne compte jamais pour 0.
 */
export const schemaStatistiquesFij = z.object({
  dimanche: schemaDimanche,
  valeurs: z
    .array(
      z.object({
        rubrique: z.enum(CODES_RUBRIQUES),
        departement: z.enum(CODES_DEPARTEMENTS),
        valeur: schemaValeurFij,
      }),
    )
    .min(1, MESSAGES_FIJ.aucuneValeur)
    .max(RUBRIQUES_FIJ.length * DEPARTEMENTS_FIJ.length)
    .refine(
      (valeurs) =>
        new Set(valeurs.map((ligne) => `${ligne.rubrique} ${ligne.departement}`)).size ===
        valeurs.length,
      MESSAGES_FIJ.doublon,
    ),
})

export type SaisieStatistiquesFij = z.infer<typeof schemaStatistiquesFij>

/** Erreur d'un champ numérique (texte du formulaire) ; null : rien à dire. */
export function erreurValeurFij(texte: string, obligatoire: boolean): string | null {
  if (texte === '') return obligatoire ? MESSAGES_FIJ.valeurManquante : null
  const resultat = schemaValeurFij.safeParse(Number(texte))
  return resultat.success ? null : (resultat.error.issues[0]?.message ?? MESSAGES_FIJ.valeurBornes)
}
