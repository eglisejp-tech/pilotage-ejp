import { z } from 'zod'
import {
  LONGUEUR_MAX_POURQUOI,
  LONGUEUR_MIN_POURQUOI,
  MESSAGES_BASE_SUGGESTION,
} from '@/features/mes-indicateurs/textes'
import { longueurEnCaracteres } from '@/lib/metier/texte'

// Schémas partagés entre le formulaire « Pourquoi cet indicateur ? » et l'appel de
// `ajouter_suggestion` (`src/data/validationIndicateurs.ts`) : CLAUDE.md, « validation Zod
// partagée ». Ils disent ce que la base accepte (validation-metier.md, 2.2) : 10 à 280 caractères
// après `btrim`, comptés comme `char_length`. Les données personnelles et les crochets restent à la
// base, qui les refuse avec son message : l'écran le reprend tel quel sous le champ. Aucun rappel
// sur les données personnelles sous ce champ (exception voulue, T30).

/** « Pourquoi cet indicateur ? » : 10 à 280 caractères après `trim`. */
const pourquoi = z
  .string()
  .trim()
  .refine((texte) => longueurEnCaracteres(texte) >= LONGUEUR_MIN_POURQUOI, {
    error: MESSAGES_BASE_SUGGESTION.pourquoiCourt,
  })
  .refine((texte) => longueurEnCaracteres(texte) <= LONGUEUR_MAX_POURQUOI, {
    error: MESSAGES_BASE_SUGGESTION.pourquoiLong,
  })

/** Le formulaire : le « Pourquoi » seul (la suggestion et le ministère sont ceux de l'écran). */
export const schemaFormulaireSuggestion = z.object({ pourquoi })

export type ValeursFormulaireSuggestion = z.input<typeof schemaFormulaireSuggestion>
export type FormulaireSuggestion = z.output<typeof schemaFormulaireSuggestion>

/** Ce que reçoit `ajouter_suggestion` : le ministère, le code du catalogue et le « Pourquoi ». */
export const schemaSuggestion = z.object({
  ministereId: z.uuid(),
  code: z.string().min(1).max(60),
  pourquoi,
})

export type SuggestionEnvoyee = z.output<typeof schemaSuggestion>
