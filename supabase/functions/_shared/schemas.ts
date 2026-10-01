// Schémas Zod des Edge Functions de comptes, partagés avec les formulaires de l'écran 13
// (BRIEF, section 8, « Contrat commun »). Ce fichier n'importe que zod : il se charge aussi bien
// dans Deno (carte d'import deno.json) que dans le navigateur (node_modules).
import { z } from 'zod'

// « Ministère <nom> » doit tenir dans les 60 caractères du libellé du compte.
export const LONGUEUR_MAX_NOM_MINISTERE = 50
export const LONGUEUR_MAX_DESCRIPTION_MINISTERE = 280

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Cette adresse email est trop longue.')
  .pipe(z.email('Saisissez une adresse email valide.'))

const ministereExistant = z.strictObject({
  id: z.uuid('Choisissez un ministère dans la liste.'),
})

const nouveauMinistere = z.strictObject({
  nom: z
    .string()
    .trim()
    .min(1, 'Donnez un nom au ministère.')
    .max(LONGUEUR_MAX_NOM_MINISTERE, 'Le nom du ministère tient en 50 caractères au plus.'),
  description: z
    .string()
    .trim()
    .max(LONGUEUR_MAX_DESCRIPTION_MINISTERE, 'La description tient en 280 caractères au plus.')
    .optional(),
})

// Jamais le type admin_eglise : ce compte s'amorce une seule fois, à la main (BRIEF, section 8).
export const schemaCreerCompte = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('ministere'),
    email,
    ministere: z.union([ministereExistant, nouveauMinistere]),
  }),
  z.strictObject({ type: z.literal('berger'), email }),
  z.strictObject({ type: z.literal('conseil'), email }),
  z.strictObject({ type: z.literal('admin_plateforme'), email }),
])
export type DemandeCreerCompte = z.infer<typeof schemaCreerCompte>

// desactiver-compte et reinitialiser-2fa visent un compte par son identifiant.
export const schemaCibleCompte = z.strictObject({
  user_id: z.uuid('Ce compte est introuvable.'),
})
export type DemandeCibleCompte = z.infer<typeof schemaCibleCompte>
