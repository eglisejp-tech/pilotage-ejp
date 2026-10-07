// Écritures des points d'attention (étape 5) : les trois fonctions de l'API, `creer_point`,
// `changer_statut_point` et `marquer_traite`. Aucune écriture directe dans `point_attention`,
// `point_mention` ni `point_suivi` (CLAUDE.md : les points passent par des fonctions). Chaque
// écriture valide ses valeurs par les schémas de base de ce fichier, les mêmes que ceux des
// formulaires des lots P1 et P2 : une valeur invalide lève une erreur avant tout appel à la base.
// Les lectures des points sont dans `points.ts` (« À décider ») et `pointsListe.ts` (écran 05).

import { z } from 'zod'
import type { Priorite, StatutPoint } from '@/lib/base'
import { estDateIso } from '@/lib/metier/dates'
import { COMMENTAIRE_TRAITE_MAX } from '@/lib/metier/droitsPoint'
import { supabase } from '@/lib/supabase'

/** Longueurs fixées par la base (`private.creer_point`). */
export const LONGUEUR_TITRE_POINT = 80
export const LONGUEUR_DESCRIPTION_POINT = 280
export const LONGUEUR_ATTENDU_POINT = 80

/**
 * Messages des fonctions de points. `refus` reprend, mot pour mot, les messages que la base lève
 * (erreur `P0001`) : un refus se reconnaît à son texte et s'affiche tel quel. `reussite` est ce
 * que l'écran dit après une écriture (« Point créé. », « Statut enregistré : En cours. »).
 */
export const MESSAGES_POINT = {
  refus: {
    titre: 'Donnez un titre au point (80 caractères au plus).',
    description: 'La description dépasse 280 caractères.',
    attendu: "L'action attendue dépasse 80 caractères.",
    echeancePassee: "L'échéance ne peut pas être passée.",
    mentionRefusee: 'Ce ministère ne peut pas être mentionné.',
    pointTraiteStatut: 'Ce point est traité : il ne change plus.',
    pointDejaTraite: 'Ce point est déjà traité.',
    statutVide: 'Choisissez un statut.',
    statutTraite: 'Utilisez le bouton Marquer traité.',
    commentaireLong: 'Le commentaire dépasse 280 caractères.',
    commentaireCourt: 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
    /** Refus de droit (42501), commun à toutes les fonctions de l'API. */
    acces: "Ce point n'existe pas ou vous n'y avez pas accès.",
  },
  reussite: {
    creation: 'Point créé.',
    traite: 'Point marqué traité.',
    statut: (libelle: string) => `Statut enregistré : ${libelle}.`,
  },
} as const

/**
 * Texte à montrer sous le bouton pour un refus de la base, ou null pour un problème de connexion
 * (l'écran garde les valeurs et dit « La connexion a échoué... »). Un refus de droit (42501) dit
 * seulement que le point n'est pas accessible, sans dire pourquoi.
 */
export function messageDeRefusPoint(erreur: unknown): string | null {
  if (typeof erreur !== 'object' || erreur === null) return null
  const { code, message } = erreur as { code?: unknown; message?: unknown }
  if (code === '42501') return MESSAGES_POINT.refus.acces
  if (code !== 'P0001' || typeof message !== 'string') return null
  return message
}

const VALEURS_PRIORITE = ['normale', 'haute', 'urgente'] as const satisfies readonly Priorite[]

/** Statuts qu'on choisit dans « Changer le statut » : « traite » passe par `marquer_traite`. */
export const STATUTS_CHOISIS = [
  'a_traiter',
  'en_cours',
  'attente_decision',
] as const satisfies readonly StatutPoint[]

export type StatutChoisi = (typeof STATUTS_CHOISIS)[number]

/** Texte facultatif tel que la base le reçoit : null (rien) ou 1 à `max` caractères. */
function texteFacultatif(max: number, message: string) {
  return z.string().min(1, message).max(max, message).nullable()
}

/** Identifiants de ministères mentionnés : des uuid, sans doublon. */
const schemaMentions = z
  .array(z.uuid(MESSAGES_POINT.refus.mentionRefusee))
  .transform((ids) => [...new Set(ids)])

/** Ce que `creer_point` reçoit (la base contrôle le titre, l'échéance et les mentions). */
export const schemaBaseNouveauPoint = z.object({
  titre: z
    .string()
    .trim()
    .min(1, MESSAGES_POINT.refus.titre)
    .max(LONGUEUR_TITRE_POINT, MESSAGES_POINT.refus.titre),
  description: texteFacultatif(LONGUEUR_DESCRIPTION_POINT, MESSAGES_POINT.refus.description),
  attendu: texteFacultatif(LONGUEUR_ATTENDU_POINT, MESSAGES_POINT.refus.attendu),
  priorite: z.enum(VALEURS_PRIORITE),
  /** Jour de Paris au format AAAA-MM-JJ, ou null : sans échéance. */
  echeance: z.string().refine(estDateIso, MESSAGES_POINT.refus.echeancePassee).nullable(),
  mentions: schemaMentions,
})

/** Ce que `changer_statut_point` reçoit : un statut ouvert, jamais « traite ». */
export const schemaBaseStatutPoint = z.enum(STATUTS_CHOISIS, {
  error: MESSAGES_POINT.refus.statutVide,
})

/**
 * Commentaire d'un traitement tel que la base le reçoit : null (aucun) ou 1 à 280 caractères.
 * Les 10 caractères d'un ministère se contrôlent dans le formulaire (et dans la base) : ce schéma
 * sert aussi au berger et au conseil, dont le commentaire est facultatif.
 */
export const schemaBaseCommentaireTraite = texteFacultatif(
  COMMENTAIRE_TRAITE_MAX,
  MESSAGES_POINT.refus.commentaireLong,
)

const schemaIdentifiant = z.uuid()

export type NouveauPoint = z.output<typeof schemaBaseNouveauPoint>

/**
 * Crée un point du ministère connecté, avec ses mentions : il naît « À traiter ». La base refuse
 * une échéance passée et un ministère qu'on ne peut pas mentionner (messages de `MESSAGES_POINT`).
 * Rend l'identifiant du point.
 */
export async function creerPoint(brut: NouveauPoint): Promise<string> {
  const point = schemaBaseNouveauPoint.parse(brut)
  const { data, error } = await supabase().rpc('creer_point', {
    p_titre: point.titre,
    p_description: point.description,
    p_action_attendue: point.attendu,
    p_priorite: point.priorite,
    p_echeance: point.echeance,
    p_mentions: point.mentions,
  })
  if (error) throw error
  return data
}

/**
 * Passe un point d'un statut ouvert à un autre (ministère créateur ou mentionné). Le même statut
 * n'écrit rien. La base refuse un point déjà traité.
 */
export async function changerStatutPoint(pointId: string, statut: StatutChoisi): Promise<void> {
  const { error } = await supabase().rpc('changer_statut_point', {
    p_point_id: schemaIdentifiant.parse(pointId),
    p_statut: schemaBaseStatutPoint.parse(statut),
  })
  if (error) throw error
}

/**
 * Marque un point traité, pour de bon. `commentaire` est null quand le berger ou le conseil n'en
 * écrit pas ; un ministère en écrit un de 10 à 280 caractères (la base le refuse sinon).
 */
export async function marquerTraite(pointId: string, commentaire: string | null): Promise<void> {
  const { error } = await supabase().rpc('marquer_traite', {
    p_point_id: schemaIdentifiant.parse(pointId),
    p_commentaire: schemaBaseCommentaireTraite.parse(commentaire),
  })
  if (error) throw error
}
