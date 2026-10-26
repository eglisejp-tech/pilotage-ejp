import { z } from 'zod'
import {
  LONGUEUR_MAX_SIGNALEMENT,
  LONGUEUR_MIN_SIGNALEMENT,
  TEXTES_REPONSE,
  TEXTES_SIGNALEMENT,
} from '@/features/signalement/textes'
import type { EcranSignalement } from '@/lib/base'

// Schémas partagés entre les formulaires « Signaler une difficulté », les réponses du suivi (T77),
// « Clore le signalement », et les appels de `src/data/signalements.ts` (CLAUDE.md : validation
// Zod partagée). Ils disent ce que la base accepte (B7, T77) : texte de 10 à 280 caractères après
// `trim`, ni crochets ni « texte masqué » (T43) ; une réponse est toujours obligatoire, celle de
// « Clore le signalement » comprise (la base l'accepte encore vide pour l'ancien site). Les
// familles « données personnelles » (« @ », 5 chiffres de suite, civilité suivie d'un nom)
// restent à la base, qui les refuse : la
// table de traduction donne la phrase, sous le champ. Les messages avant l'envoi sont ceux de
// `TEXTES_SIGNALEMENT` (T66).

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

/**
 * Longueur en caractères, comme `char_length` de la base : un émoji compte pour un, là où
 * `String.length` en compte deux (unités UTF-16). Sert au compteur et aux schémas.
 */
export function longueurEnCaracteres(texte: string): number {
  return Array.from(texte).length
}

/** Un texte libre de 10 à 280 caractères après `trim`, sans marqueur de la modération. */
function texteLibre(messageCourt: string, messageLong: string) {
  return z
    .string()
    .trim()
    .refine((texte) => longueurEnCaracteres(texte) >= LONGUEUR_MIN_SIGNALEMENT, messageCourt)
    .refine((texte) => longueurEnCaracteres(texte) <= LONGUEUR_MAX_SIGNALEMENT, messageLong)
    .refine((texte) => !contientMarqueurModeration(texte), TEXTES_SIGNALEMENT.erreurCrochets)
}

/** Ce que reçoit `signaler_difficulte` : un écran de la liste et le texte. */
export const schemaSignalement = z.object({
  ecran: z.enum(ECRANS_SIGNALEMENT, { error: TEXTES_SIGNALEMENT.erreurEcran }),
  texte: texteLibre(TEXTES_SIGNALEMENT.erreurChamp, TEXTES_SIGNALEMENT.erreurLong),
})

/** Valeurs du formulaire (texte brut, écran venu de l'adresse). */
export type ValeursSignalement = z.input<typeof schemaSignalement>
/** Signalement validé, prêt pour la base (texte sans espaces autour). */
export type Signalement = z.output<typeof schemaSignalement>

/** Une réponse du suivi (T77) : obligatoire, 10 à 280 caractères après `trim`. */
const schemaTexteReponse = texteLibre(TEXTES_REPONSE.erreurCourt, TEXTES_REPONSE.erreurLong)

/** Un signalement, désigné par son identifiant (« Prendre en charge », « Oui, c'est réglé »). */
export const schemaIdentifiantSignalement = z.uuid()

/** Ce que reçoit `clore_signalement` à l'écran : le signalement et la réponse, obligatoire. */
export const schemaCloture = z.object({
  signalementId: z.uuid(),
  commentaire: schemaTexteReponse,
})

export type Cloture = z.output<typeof schemaCloture>

/**
 * Ce que reçoivent `repondre_au_ministere` (EJP Tech) et `repondre_a_ejp_tech` (le ministère) :
 * le signalement et la réponse.
 */
export const schemaReponse = z.object({
  signalementId: z.uuid(),
  texte: schemaTexteReponse,
})

export type Reponse = z.output<typeof schemaReponse>

/** Le panneau de réponse : le texte seul. */
export const schemaFormulaireReponse = z.object({ texte: schemaTexteReponse })

export type ValeursFormulaireReponse = z.input<typeof schemaFormulaireReponse>
export type FormulaireReponse = z.output<typeof schemaFormulaireReponse>
