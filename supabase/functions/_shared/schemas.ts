// Schémas Zod des Edge Functions de comptes, partagés avec les formulaires de l'écran 13
// (BRIEF, section 8, « Contrat commun »). Ce fichier n'importe que zod : il se charge aussi bien
// dans Deno (carte d'import deno.json) que dans le navigateur (node_modules).
import { z } from 'zod'

// « Ministère <nom> » doit tenir dans les 60 caractères du libellé du compte.
export const LONGUEUR_MAX_NOM_MINISTERE = 50
export const LONGUEUR_MAX_DESCRIPTION_MINISTERE = 280

// Messages revus par T66 (m006, m195, m196) : les fonctions ne renvoient qu'un code
// (`requete_invalide`), ces phrases ne se lisent que dans les panneaux de l'écran 13. Même texte
// que l'écran de connexion pour une adresse incomplète.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Saisissez l'adresse email.")
  .max(254, "Raccourcissez l'adresse : 254 caractères au plus.")
  .pipe(z.email('Saisissez une adresse email complète, par exemple nom@exemple.fr.'))

const ministereExistant = z.strictObject({
  id: z.uuid('Choisissez un ministère dans la liste.'),
})

const nouveauMinistere = z.strictObject({
  nom: z
    .string()
    .trim()
    .min(1, 'Donnez un nom au ministère.')
    .max(LONGUEUR_MAX_NOM_MINISTERE, 'Raccourcissez le nom : 50 caractères au plus.'),
  description: z
    .string()
    .trim()
    .max(
      LONGUEUR_MAX_DESCRIPTION_MINISTERE,
      'Raccourcissez la description : 280 caractères au plus.',
    )
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

// desactiver-compte et reinitialiser-2fa visent un compte par son identifiant. Le message est dit
// tel quel par l'écran (m197, formule « introuvable »).
export const schemaCibleCompte = z.strictObject({
  user_id: z.uuid('Ce compte est introuvable. Rechargez la page.'),
})
export type DemandeCibleCompte = z.infer<typeof schemaCibleCompte>

// corriger-adresse (T74) : le compte visé et sa nouvelle adresse, lue comme à la création.
export const schemaCorrigerAdresse = z.strictObject({
  user_id: schemaCibleCompte.shape.user_id,
  email,
})
export type DemandeCorrigerAdresse = z.infer<typeof schemaCorrigerAdresse>

// supprimer-ministere (T74) : le ministère visé par son identifiant.
export const schemaCibleMinistere = z.strictObject({
  ministere_id: z.uuid('Ce ministère est introuvable. Rechargez la page.'),
})
export type DemandeCibleMinistere = z.infer<typeof schemaCibleMinistere>
