import { z } from 'zod'
import { estDateIso } from '@/lib/metier/dates'
import { longueurEnCaracteres } from '@/lib/metier/texte'

// Schémas de l'écran 14 « Sessions » (lot L2), partagés entre le formulaire et l'appel à la base
// (CLAUDE.md : validation Zod partagée). La base reste l'autorité : `declarer_session` refuse un
// type ou une date absents, un nom de plus de 80 caractères, un nom sur un type qui n'en porte
// pas, aucun ministère coché et une session déjà déclarée.

export const TYPES_SESSION = ['batir', 'anti_dispersion', 'autre'] as const

/** Longueur maximale du nom d'un autre rassemblement (colonne `session.intitule`). */
export const LONGUEUR_MAX_NOM_RASSEMBLEMENT = 80

export const MESSAGES_SESSIONS = {
  type: 'Choisissez le type de la session.',
  date: 'Choisissez la date de la session.',
  nom: 'Donnez un nom au rassemblement.',
  nomTropLong: 'Le nom du rassemblement fait 80 caractères au plus.',
  ministeres: 'Cochez au moins un ministère.',
} as const

const identifiant = z.guid()

/** Les ministères attendus : au moins un, sans doublon. */
export const schemaMinisteresAttendus = z
  .array(identifiant, { error: MESSAGES_SESSIONS.ministeres })
  .min(1, MESSAGES_SESSIONS.ministeres)
  .transform((ids) => Array.from(new Set(ids)))

/** Valeurs du formulaire « Déclarer une session », avant validation. */
export interface ValeursDeclaration {
  type: (typeof TYPES_SESSION)[number]
  date: string
  nom: string
  ministeres: string[]
}

/**
 * Déclaration d'une session. Le nom n'existe que pour « Autre rassemblement » : il est
 * obligatoire pour ce type, et rendu `null` pour les deux autres.
 */
export const schemaDeclaration = z
  .object({
    type: z.enum(TYPES_SESSION, { error: MESSAGES_SESSIONS.type }),
    date: z.string().refine(estDateIso, MESSAGES_SESSIONS.date),
    nom: z.string(),
    ministeres: schemaMinisteresAttendus,
  })
  .transform((valeurs, contexte) => {
    const nom = valeurs.nom.trim()
    if (valeurs.type === 'autre') {
      if (nom === '') {
        contexte.addIssue({ code: 'custom', path: ['nom'], message: MESSAGES_SESSIONS.nom })
      } else if (longueurEnCaracteres(nom) > LONGUEUR_MAX_NOM_RASSEMBLEMENT) {
        contexte.addIssue({ code: 'custom', path: ['nom'], message: MESSAGES_SESSIONS.nomTropLong })
      }
    }
    return {
      type: valeurs.type,
      date: valeurs.date,
      intitule: valeurs.type === 'autre' ? nom : null,
      ministeres: valeurs.ministeres,
    }
  })

export type Declaration = z.output<typeof schemaDeclaration>

/** Identifiant d'une session pour une modification ou une suppression. */
export const schemaIdentifiantSession = identifiant
