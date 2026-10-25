import { z } from 'zod'
import {
  schemaCreerCompte,
  type DemandeCreerCompte,
} from '../../../supabase/functions/_shared/schemas.ts'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import type { CreationCompte } from '@/features/comptes/types'

// Schémas des panneaux de l'écran 13 (CLAUDE.md : validation Zod partagée entre formulaire et
// appel). Chaque champ reprend le schéma même de la fonction `creer-compte`
// (`supabase/functions/_shared/schemas.ts`) : le nom (1 à 50 caractères), la description (280
// au plus, facultative) et l'adresse (minuscules, 254 caractères au plus) se valident à
// l'identique dans le navigateur et dans la fonction. `src/data/comptes.ts` revalide la demande
// complète avec `schemaCreerCompte` (et `schemaCorrigerAdresse`, T74) avant l'appel.

const [optionMinistere] = schemaCreerCompte.options
const [, nouveauMinistere] = optionMinistere.shape.ministere.options

/** Adresse email, comme la fonction la lit (`trim`, minuscules). */
export const champEmail = optionMinistere.shape.email

/** Panneau « Ajouter un ministère ». */
export const schemaNouveauMinistere = z.object({
  nom: nouveauMinistere.shape.nom,
  description: nouveauMinistere.shape.description,
  email: champEmail,
})
export type EntreeNouveauMinistere = z.input<typeof schemaNouveauMinistere>
export type NouveauMinistere = z.output<typeof schemaNouveauMinistere>

/** Panneaux qui ne demandent qu'une adresse (ministère existant, berger, conseil, EJP Tech). */
export const schemaAdresse = z.object({ email: champEmail })
export type EntreeAdresse = z.input<typeof schemaAdresse>
export type Adresse = z.output<typeof schemaAdresse>

/**
 * « Corriger l'adresse » (T74) : la nouvelle adresse, différente de l'actuelle (casse et espaces
 * ignorés, comme la fonction). À la réactivation, l'adresse actuelle est acceptée : elle ne
 * change pas.
 */
export function schemaCorrection(actuelle: string | null, accepterActuelle: boolean) {
  const ancienne = actuelle?.trim().toLowerCase() ?? null
  return z.object({
    email: champEmail.refine((email) => accepterActuelle || email !== ancienne, {
      message: TEXTES_COMPTES.adresseIdentique,
    }),
  })
}

/** Longueur en caractères, comme `char_length` de la base (un émoji compte pour un). */
export function longueurEnCaracteres(texte: string): number {
  return Array.from(texte).length
}

/**
 * Corps de `creer-compte` pour une création du panneau. Une description vide n'est pas envoyée.
 * Un ministère existant (FIJ, Coordination) passe par son identifiant, jamais par son nom.
 */
export function demandeDeCreation(creation: CreationCompte): DemandeCreerCompte {
  switch (creation.type) {
    case 'ministere': {
      const description = creation.description?.trim()
      return {
        type: 'ministere',
        email: creation.email,
        ministere: description ? { nom: creation.nom, description } : { nom: creation.nom },
      }
    }
    case 'ministere_existant':
      return { type: 'ministere', email: creation.email, ministere: { id: creation.ministereId } }
    default:
      return { type: creation.type, email: creation.email }
  }
}
