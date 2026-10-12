import { z } from 'zod'
import { TEXTES_FENETRE_MASQUAGE } from '@/features/moderation/textes'
import type { CibleMasquable, MotifMasquage } from '@/lib/base'

// Schémas partagés entre la fenêtre « Masquer le texte » et les appels de `src/data/moderation.ts`
// (CLAUDE.md : validation Zod partagée). Ils disent ce que la base accepte : une cible connue, un
// champ, un des quatre motifs de la liste. Le texte masqué n'est jamais une saisie : aucun champ
// libre ici, donc aucun rappel sur les données personnelles.

/** Les cibles de `private.masquer_texte` (migration 20261009110000). */
export const CIBLES_MASQUABLES = [
  'point_attention',
  'point_suivi',
  'evenement',
  'reunion',
  'precision_sensible',
  'demande_indicateur',
  'validation',
  'signalement',
  'signalement_suivi',
] as const satisfies readonly CibleMasquable[]

/** Les motifs de la liste, dans l'ordre du BRIEF. */
export const MOTIFS_MASQUAGE = [
  'nom_personne',
  'coordonnees',
  'situation_personnelle',
  'autre',
] as const satisfies readonly MotifMasquage[]

/** Ce que reçoit `masquer_texte`. */
export const schemaMasquage = z.object({
  cible: z.enum(CIBLES_MASQUABLES),
  cibleId: z.uuid(),
  champ: z.string().min(1),
  motif: z.enum(MOTIFS_MASQUAGE, { error: TEXTES_FENETRE_MASQUAGE.erreurMotif }),
})

export type Masquage = z.output<typeof schemaMasquage>

/** Ce que reçoit `marquer_relu`. */
export const schemaRelecture = z.object({
  cible: z.enum(CIBLES_MASQUABLES),
  cibleId: z.uuid(),
})

export type Relecture = z.output<typeof schemaRelecture>

/** Le choix de la fenêtre : un champ de la ligne et un motif (la cible est celle de la ligne). */
export const schemaChoixMasquage = z.object({
  champ: z.string().min(1, { error: TEXTES_FENETRE_MASQUAGE.erreurChamp }),
  motif: z.enum(MOTIFS_MASQUAGE, { error: TEXTES_FENETRE_MASQUAGE.erreurMotif }),
})

export type ChoixMasquage = z.output<typeof schemaChoixMasquage>
