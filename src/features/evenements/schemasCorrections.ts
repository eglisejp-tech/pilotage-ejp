import { z } from 'zod'
import { LONGUEUR_MAX_COURT, TEXTES_EVENEMENT } from '@/features/evenements/textes'

// Schémas des corrections d'un événement (T78, lot 1), partagés entre les fenêtres « Corriger le
// nom » et « Modifier les mentions » et les appels de `src/data/evenementsCorrections.ts`
// (CLAUDE.md : validation Zod partagée). Ils disent ce que la base accepte : un nom de 1 à 80
// caractères (espaces autour retirés, comme à l'ajout) et une liste d'identifiants de ministères
// sans doublon. La base reste la garde (porteur, date, ministères actifs, événement retiré).

/** Nom d'un événement : les mêmes phrases qu'à l'ajout (« Donnez un nom à l'événement. »). */
export const schemaNomEvenement = z.object({
  titre: z
    .string()
    .trim()
    .min(1, TEXTES_EVENEMENT.erreurNomVide)
    .max(LONGUEUR_MAX_COURT, TEXTES_EVENEMENT.erreurNomLong),
})

/** Liste voulue des ministères mentionnés : des uuid, sans doublon, vide permise. */
export const schemaMentionsEvenement = z.object({
  mentions: z.array(z.uuid(TEXTES_EVENEMENT.erreurMention)).transform((ids) => [...new Set(ids)]),
})

export type ValeursNomEvenement = z.input<typeof schemaNomEvenement>
export type NomEvenement = z.output<typeof schemaNomEvenement>
