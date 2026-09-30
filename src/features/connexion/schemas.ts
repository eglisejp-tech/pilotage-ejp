import { z } from 'zod'

// Schémas partagés entre les formulaires de connexion et, à l'étape 2, les appels à Supabase Auth
// (CLAUDE.md : validation Zod partagée entre formulaire et appel base). BRIEF section 8.

/** Longueur minimale d'un mot de passe (BRIEF section 8, `minimum_password_length = 12`). */
export const LONGUEUR_MIN_MOT_DE_PASSE = 12
/** Supabase Auth refuse au-delà de 72 caractères (limite du hachage bcrypt). */
export const LONGUEUR_MAX_MOT_DE_PASSE = 72
/** Code TOTP de l'application d'authentification. */
export const LONGUEUR_CODE = 6

export const schemaEmail = z
  .string()
  .trim()
  .min(1, 'Saisissez votre adresse email.')
  .pipe(z.email('Saisissez une adresse email complète, par exemple nom@exemple.fr.'))

export const schemaConnexion = z.object({
  email: schemaEmail,
  // À la connexion, on ne rappelle pas la règle de longueur : le mot de passe existe déjà.
  motDePasse: z.string().min(1, 'Saisissez votre mot de passe.'),
})

export const schemaMotDePasseOublie = z.object({
  email: schemaEmail,
})

export const schemaNouveauMotDePasse = z.object({
  motDePasse: z
    .string()
    .min(
      LONGUEUR_MIN_MOT_DE_PASSE,
      `Choisissez un mot de passe de ${LONGUEUR_MIN_MOT_DE_PASSE} caractères au moins.`,
    )
    .max(
      LONGUEUR_MAX_MOT_DE_PASSE,
      `Choisissez un mot de passe de ${LONGUEUR_MAX_MOT_DE_PASSE} caractères au plus.`,
    ),
})

export const schemaCode = z.object({
  code: z
    .string()
    .regex(new RegExp(`^\\d{${LONGUEUR_CODE}}$`), 'Saisissez les 6 chiffres du code.'),
})

export type ValeursConnexion = z.infer<typeof schemaConnexion>
export type ValeursMotDePasseOublie = z.infer<typeof schemaMotDePasseOublie>
export type ValeursNouveauMotDePasse = z.infer<typeof schemaNouveauMotDePasse>
export type ValeursCode = z.infer<typeof schemaCode>

/** Garde les chiffres d'un texte saisi ou collé (« 482 913 » devient « 482913 »), 6 au plus. */
export function chiffresDuCode(texte: string): string {
  return texte.replace(/\D/g, '').slice(0, LONGUEUR_CODE)
}
