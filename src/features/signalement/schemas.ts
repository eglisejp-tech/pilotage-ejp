import { z } from 'zod'
import {
  LONGUEUR_MAX_SIGNALEMENT,
  LONGUEUR_MIN_SIGNALEMENT,
  MESSAGES_BASE_SIGNALEMENT,
} from '@/features/signalement/textes'
import type { EcranSignalement } from '@/lib/base'

// Schémas partagés entre les formulaires « Signaler une difficulté » et « Clore le signalement »
// et les appels de `src/data/signalements.ts` (CLAUDE.md : validation Zod partagée). Ils disent ce
// que la base accepte (B7) : texte de 10 à 280 caractères après `trim`, commentaire vide ou de 10
// à 280 caractères, ni crochets ni « texte masqué » (T43). Les familles « données personnelles »
// (« @ », 5 chiffres de suite, civilité suivie d'un nom) restent à la base, qui les refuse avec
// son message : l'écran le reprend tel quel sous le champ.

/** Les codes d'écran, dans l'ordre de `private.ecrans_signalement()` (B7). */
export const ECRANS_SIGNALEMENT = [
  'saisie_dimanche',
  'saisie_mois',
  'saisie_session',
  'saisie_fij',
  'saisie_fij_statistiques',
  'saisie_evenement',
  'saisie_reunion',
  'autre',
] as const satisfies readonly EcranSignalement[]

/** Code d'écran de l'adresse (`?ecran=`) : un code inconnu ou absent devient « autre ». */
export function lireEcran(valeur: string | null): EcranSignalement {
  return ECRANS_SIGNALEMENT.find((ecran) => ecran === valeur) ?? 'autre'
}

/** « [ » ou « texte masqué » : réservés au marqueur de la modération (T43, comme la base). */
export function contientMarqueurModeration(texte: string): boolean {
  return texte.includes('[') || /texte masqu/i.test(texte)
}

/** Un texte libre de 10 à 280 caractères après `trim`, sans marqueur de la modération. */
function texteLibre(messageCourt: string, messageLong: string) {
  return z
    .string()
    .trim()
    .min(LONGUEUR_MIN_SIGNALEMENT, messageCourt)
    .max(LONGUEUR_MAX_SIGNALEMENT, messageLong)
    .refine((texte) => !contientMarqueurModeration(texte), MESSAGES_BASE_SIGNALEMENT.crochets)
}

/** Ce que reçoit `signaler_difficulte` : un écran de la liste et le texte. */
export const schemaSignalement = z.object({
  ecran: z.enum(ECRANS_SIGNALEMENT, { error: MESSAGES_BASE_SIGNALEMENT.ecran }),
  texte: texteLibre(MESSAGES_BASE_SIGNALEMENT.texteCourt, MESSAGES_BASE_SIGNALEMENT.texteLong),
})

/** Valeurs du formulaire (texte brut, écran venu de l'adresse). */
export type ValeursSignalement = z.input<typeof schemaSignalement>
/** Signalement validé, prêt pour la base (texte sans espaces autour). */
export type Signalement = z.output<typeof schemaSignalement>

/**
 * Commentaire de clôture facultatif : vide (espaces seuls compris) devient null, sinon 10 à 280
 * caractères après `trim`, sans marqueur de la modération.
 */
const schemaCommentaire = z
  .string()
  .trim()
  .transform((texte) => (texte === '' ? null : texte))
  .pipe(
    texteLibre(
      MESSAGES_BASE_SIGNALEMENT.commentaireCourt,
      MESSAGES_BASE_SIGNALEMENT.commentaireLong,
    ).nullable(),
  )

/** Ce que reçoit `clore_signalement` : le signalement et le commentaire (null sans commentaire). */
export const schemaCloture = z.object({
  signalementId: z.uuid(),
  commentaire: schemaCommentaire.nullable(),
})

export type Cloture = z.output<typeof schemaCloture>

/** Le formulaire de clôture : le commentaire seul (le signalement est celui de la ligne). */
export const schemaFormulaireCloture = z.object({ commentaire: schemaCommentaire })

export type ValeursFormulaireCloture = z.input<typeof schemaFormulaireCloture>
export type FormulaireCloture = z.output<typeof schemaFormulaireCloture>
