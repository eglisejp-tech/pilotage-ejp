import { z } from 'zod'

// Schéma partagé par le formulaire d'acceptation des conditions (T53) : la case doit être cochée.

export const MESSAGE_CASE_A_COCHER = 'Cochez la case pour continuer.'

export const schemaAcceptation = z.object({
  accepte: z.boolean().refine((valeur) => valeur, MESSAGE_CASE_A_COCHER),
})

export type ValeursAcceptation = z.infer<typeof schemaAcceptation>
