import { z } from 'zod'
import {
  LONGUEUR_MAX_MOTIF,
  LONGUEUR_MIN_MOTIF,
  MESSAGES_BASE_VALIDATION,
} from '@/features/indicateurs/validation/textes'
import { longueurEnCaracteres } from '@/lib/metier/texte'

// Schémas partagés entre la fenêtre « Refuser » et l'appel de `valider_indicateur`
// (`src/data/validationIndicateurs.ts`) : CLAUDE.md, « validation Zod partagée ». Ils disent ce que
// la base accepte (validation-metier.md, 2.4) : un motif de 10 à 280 caractères après `btrim`.
// Les données personnelles et les crochets restent à la base, qui les refuse avec son message :
// l'écran le reprend tel quel sous le champ.

/** Motif d'un refus : 10 à 280 caractères après `trim`, comptés comme `char_length` de la base. */
const motifRefus = z
  .string()
  .trim()
  .refine((motif) => longueurEnCaracteres(motif) >= LONGUEUR_MIN_MOTIF, {
    error: MESSAGES_BASE_VALIDATION.motifCourt,
  })
  .refine((motif) => longueurEnCaracteres(motif) <= LONGUEUR_MAX_MOTIF, {
    error: MESSAGES_BASE_VALIDATION.motifLong,
  })

/** Le formulaire de la fenêtre « Refuser » : le motif seul (la demande est celle de la ligne). */
export const schemaFormulaireRefus = z.object({ motif: motifRefus })

export type ValeursFormulaireRefus = z.input<typeof schemaFormulaireRefus>
export type FormulaireRefus = z.output<typeof schemaFormulaireRefus>

/** Ce que reçoit `valider_indicateur` : valider sans motif, refuser avec un motif. */
export const schemaDecision = z.discriminatedUnion('decision', [
  z.object({ demandeId: z.uuid(), decision: z.literal('valide') }),
  z.object({ demandeId: z.uuid(), decision: z.literal('refuse'), motif: motifRefus }),
])

export type Decision = z.output<typeof schemaDecision>
