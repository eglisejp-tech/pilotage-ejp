// Écritures des points d'attention (étape 5) : les fonctions de l'API `creer_point`,
// `changer_statut_point`, `marquer_traite` et `modifier_mentions_point` (T54). Aucune écriture directe dans `point_attention`,
// `point_mention` ni `point_suivi` (CLAUDE.md : les points passent par des fonctions). Chaque
// écriture valide ses valeurs par les schémas de base de ce fichier, les mêmes que ceux des
// formulaires des lots P1 et P2 : une valeur invalide lève une erreur avant tout appel à la base.
// Les lectures des points sont dans `points.ts` (« À décider ») et `pointsListe.ts` (écran 05).

import { z } from 'zod'
import { lireEchec } from '@/data/echecEnvoi'
import type { EchecLu } from '@/data/echecEnvoi'
import { envoyer } from '@/data/envoi'
import { MESSAGES_COMMUNS } from '@/data/messagesBase'
import type { Priorite, StatutPoint } from '@/lib/base'
import { estDateIso } from '@/lib/metier/dates'
import { COMMENTAIRE_TRAITE_MAX, COMMENTAIRE_TRAITE_MIN_MINISTERE } from '@/lib/metier/droitsPoint'
import { longueurEnCaracteres } from '@/lib/metier/texte'
import { supabase } from '@/lib/supabase'

/** Longueurs fixées par la base (`private.creer_point`). */
export const LONGUEUR_TITRE_POINT = 80
export const LONGUEUR_DESCRIPTION_POINT = 280
export const LONGUEUR_ATTENDU_POINT = 80

/**
 * Messages des fonctions de points. `controle` est ce que les formulaires disent avant l'envoi
 * (refonte des textes, T66). `refus` reprend, mot pour mot, les messages que la base lève (erreur
 * `P0001`) : ce sont les clés de la table de traduction (`src/data/messagesBase.ts`), qui leur
 * donne les textes de `controle` (T66, m137 à m151) ; ils ne s'affichent pas tels quels. `refus`
 * garde aussi les phrases que l'écran dit pour un refus de droit (`creationAcces`, `acces`).
 * `reussite` est ce que l'écran dit après une écriture (« Point créé. »).
 */
export const MESSAGES_POINT = {
  controle: {
    titreVide: 'Donnez un titre au point.',
    titreLong: 'Raccourcissez le titre : 80 caractères au plus.',
    description: 'Raccourcissez ce texte : 280 caractères au plus.',
    attendu: 'Raccourcissez ce texte : 80 caractères au plus.',
    /** La base reçoit une date, jamais un autre texte : ce contrôle n'existe qu'à l'écran. */
    echeanceFormat: 'Choisissez une date, ou laissez le champ vide.',
    echeancePassee: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
    /**
     * Un seul texte pour un ministère qu'on ne peut plus mentionner, avant l'envoi comme après le
     * refus de la base : en pratique, il a été désactivé (T66, m124, qui corrige t243).
     */
    mentionRefusee: 'Un ministère coché a été désactivé. Décochez-le, puis réessayez.',
    commentaireCourt: 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
    commentaireLong: 'Raccourcissez le commentaire : 280 caractères au plus.',
    /** La priorité vient d'une liste fermée : ce contrôle n'existe qu'à l'écran. */
    prioriteVide: 'Choisissez une priorité.',
  },
  refus: {
    titre: 'Donnez un titre au point (80 caractères au plus).',
    description: 'La description dépasse 280 caractères.',
    attendu: "L'action attendue dépasse 80 caractères.",
    echeancePassee: "L'échéance ne peut pas être passée.",
    mentionRefusee: 'Ce ministère ne peut pas être mentionné.',
    pointTraiteStatut: 'Ce point est traité : il ne change plus.',
    pointDejaTraite: 'Ce point est déjà traité.',
    /** `modifier_mentions_point` : le point est traité, ses mentions ne changent plus. */
    pointTraiteMentions: 'Ce point est traité : ses mentions ne changent plus.',
    /**
     * `modifier_mentions_point` : un autre compte a changé les mentions entre-temps (ministère déjà
     * mentionné, ou plus mentionné). Textes de la base, jamais montrés : la table de traduction dit
     * « Les mentions de ce point viennent de changer... » (m157), et la page est relue.
     */
    mentionDejaPresente: 'Ce ministère est déjà mentionné sur ce point.',
    mentionAbsente: "Ce ministère n'est pas mentionné sur ce point.",
    /** `modifier_mentions_point` : la liste n'a pas été envoyée. */
    mentionsVides: 'Choisissez les ministères à mentionner.',
    statutVide: 'Choisissez un statut.',
    statutTraite: 'Utilisez le bouton Marquer traité.',
    commentaireLong: 'Le commentaire dépasse 280 caractères.',
    commentaireCourt: 'Expliquez ce qui a été traité et comment (10 caractères au moins).',
    /** Refus de droit (42501) de `creer_point` : le compte n'est pas un compte de ministère. */
    creationReservee: 'Seul un compte de ministère peut créer un point.',
    /**
     * Phrase de l'écran pour tout autre refus de droit (42501) de `creer_point` : le cas le plus
     * courant est une connexion expirée (T66, m141).
     */
    creationAcces: MESSAGES_COMMUNS.connexionExpiree,
    /**
     * Phrase de l'écran pour un refus de droit (42501) d'une action sur un point : il est sorti de
     * la portée du compte, la page se relit à la fermeture (T66, m149).
     */
    acces: 'Ce point est introuvable. Fermez cette fenêtre pour mettre la page à jour.',
  },
  reussite: {
    creation: 'Point créé.',
    traite: 'Point marqué traité.',
    statut: (libelle: string) => `Statut enregistré : ${libelle}.`,
    mentions: 'Mentions enregistrées.',
  },
} as const

/** Écriture qui a échoué : la création d'un point, ou une action sur un point existant. */
export type ContexteRefusPoint = 'creation' | 'action'

/**
 * Échec d'une écriture sur un point, par le classement unique (`src/data/echecEnvoi.ts`, T76) :
 *
 * - valeur refusée avant l'appel (`ZodError`, levée par `creerPoint`, `changerStatutPoint` ou
 *   `marquerTraite`) : la consigne de son premier problème ; les formulaires valident d'abord
 *   avec les schémas de ce fichier, ce cas reste un filet ;
 * - refus de la base (`P0001`) : sa phrase dans la table ; absent de la table, le repli ;
 * - double authentification absente, jeton expiré : « Votre connexion a expiré » ; compte
 *   désactivé : « Ce compte est désactivé » (m271, m272) ;
 * - autre refus de droit (`42501`) : sans dire pourquoi (point hors de portée). La création
 *   réservée aux ministères garde son texte ; sinon `creationAcces` pour la création, `acces`
 *   pour une action sur un point ;
 * - création dont l'issue est inconnue (aucune réponse, réponse perdue, délai) : le point est
 *   peut-être créé, vérifier la liste avant de réessayer (m259) ; une action se refait sans
 *   doublon : « Votre saisie est encore dans le formulaire : réessayez. » ;
 * - un échec technique porte sa référence.
 */
export function lireEchecPoint(erreur: unknown, contexte: ContexteRefusPoint = 'action'): EchecLu {
  return lireEchec(erreur, {
    nature: contexte === 'creation' ? 'creation' : 'reprise',
    acces:
      contexte === 'creation' ? MESSAGES_POINT.refus.creationAcces : MESSAGES_POINT.refus.acces,
  })
}

const VALEURS_PRIORITE = ['normale', 'haute', 'urgente'] as const satisfies readonly Priorite[]

/** Statuts qu'on choisit dans « Changer le statut » : « traite » passe par `marquer_traite`. */
export const STATUTS_CHOISIS = [
  'a_traiter',
  'en_cours',
  'attente_decision',
] as const satisfies readonly StatutPoint[]

export type StatutChoisi = (typeof STATUTS_CHOISIS)[number]

/**
 * Texte de `min` à `max` caractères, blancs de bord retirés avant l'envoi (la base applique
 * ensuite `btrim`). Les caractères se comptent comme `char_length` de la base : un émoji vaut un.
 */
function texteBorne(min: number, max: number, messageCourt: string, messageLong: string) {
  return z
    .string({ error: messageCourt })
    .trim()
    .superRefine((texte, contexte) => {
      const longueur = longueurEnCaracteres(texte)
      if (longueur < min) contexte.addIssue({ code: 'custom', message: messageCourt })
      else if (longueur > max) contexte.addIssue({ code: 'custom', message: messageLong })
    })
}

/**
 * Texte facultatif : blancs de bord retirés avant l'envoi (la base applique ensuite `btrim`), vide
 * devenu null, `max` caractères au plus. Rend null ou un texte de 1 à `max` caractères.
 */
function texteFacultatif(max: number, message: string) {
  return texteBorne(0, max, message, message)
    .transform((texte) => (texte === '' ? null : texte))
    .nullable()
}

/** Identifiants de ministères mentionnés : des uuid, sans doublon. */
const schemaMentions = z
  .array(z.uuid(MESSAGES_POINT.controle.mentionRefusee))
  .transform((ids) => [...new Set(ids)])

/** Ce que `modifier_mentions_point` reçoit : la liste voulue des ministères mentionnés (vide : aucun). */
export const schemaBaseMentionsPoint = schemaMentions

/** Ce que `creer_point` reçoit (la base contrôle le titre, l'échéance et les mentions). */
export const schemaBaseNouveauPoint = z.object({
  titre: texteBorne(
    1,
    LONGUEUR_TITRE_POINT,
    MESSAGES_POINT.controle.titreVide,
    MESSAGES_POINT.controle.titreLong,
  ),
  description: texteFacultatif(LONGUEUR_DESCRIPTION_POINT, MESSAGES_POINT.controle.description),
  attendu: texteFacultatif(LONGUEUR_ATTENDU_POINT, MESSAGES_POINT.controle.attendu),
  priorite: z.enum(VALEURS_PRIORITE, { error: MESSAGES_POINT.controle.prioriteVide }),
  /** Jour de Paris au format AAAA-MM-JJ, ou null : sans échéance. */
  echeance: z
    .string({ error: MESSAGES_POINT.controle.echeanceFormat })
    .refine(estDateIso, MESSAGES_POINT.controle.echeanceFormat)
    .nullable(),
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
  MESSAGES_POINT.controle.commentaireLong,
)

/**
 * Commentaire d'un ministère lié au point (créateur ou mentionné), pour le formulaire du lot P1 :
 * 10 à 280 caractères (comptés comme `char_length`), blancs de bord retirés avant l'envoi (la base
 * applique ensuite `btrim`).
 */
export const schemaCommentaireTraiteMinistere = texteBorne(
  COMMENTAIRE_TRAITE_MIN_MINISTERE,
  COMMENTAIRE_TRAITE_MAX,
  MESSAGES_POINT.controle.commentaireCourt,
  MESSAGES_POINT.controle.commentaireLong,
)

/** Identifiant d'un point : un uuid, sinon le point n'est pas accessible. */
const schemaIdentifiant = z.uuid({ error: MESSAGES_POINT.refus.acces })

export type NouveauPoint = z.output<typeof schemaBaseNouveauPoint>

/**
 * Crée un point du ministère connecté, avec ses mentions : il naît « À traiter ». La base refuse
 * une échéance passée et un ministère qu'on ne peut pas mentionner (messages de `MESSAGES_POINT`).
 * Rend l'identifiant du point.
 */
export async function creerPoint(brut: NouveauPoint): Promise<string> {
  const point = schemaBaseNouveauPoint.parse(brut)
  const { data, error } = await envoyer('rpc/creer_point', () =>
    supabase().rpc('creer_point', {
      p_titre: point.titre,
      p_description: point.description,
      p_action_attendue: point.attendu,
      p_priorite: point.priorite,
      p_echeance: point.echeance,
      p_mentions: point.mentions,
    }),
  )
  if (error) throw error
  return data
}

/**
 * Passe un point d'un statut ouvert à un autre (ministère créateur ou mentionné). Le même statut
 * n'écrit rien. La base refuse un point déjà traité.
 */
export async function changerStatutPoint(pointId: string, statut: StatutChoisi): Promise<void> {
  const { error } = await envoyer('rpc/changer_statut_point', () =>
    supabase().rpc('changer_statut_point', {
      p_point_id: schemaIdentifiant.parse(pointId),
      p_statut: schemaBaseStatutPoint.parse(statut),
    }),
  )
  if (error) throw error
}

/**
 * Marque un point traité, pour de bon. `commentaire` est null quand le berger ou le conseil n'en
 * écrit pas ; un ministère en écrit un de 10 à 280 caractères (la base le refuse sinon).
 */
export async function marquerTraite(pointId: string, commentaire: string | null): Promise<void> {
  const { error } = await envoyer('rpc/marquer_traite', () =>
    supabase().rpc('marquer_traite', {
      p_point_id: schemaIdentifiant.parse(pointId),
      p_commentaire: schemaBaseCommentaireTraite.parse(commentaire),
    }),
  )
  if (error) throw error
}

/**
 * Remplace les mentions d'un point non traité par la liste voulue (ministère créateur, berger ou
 * conseil) : la base retire ceux qui n'y sont plus et ajoute les nouveaux, en une transaction, avec
 * une ligne de journal par ajout et par retrait. Une liste vide retire toutes les mentions. La base
 * refuse un point traité, un ministère qu'on ne peut pas mentionner (créateur, désactivé, inconnu)
 * et un compte qui n'a pas ce droit (messages de `MESSAGES_POINT`).
 */
export async function modifierMentionsPoint(pointId: string, mentions: string[]): Promise<void> {
  const { error } = await envoyer('rpc/modifier_mentions_point', () =>
    supabase().rpc('modifier_mentions_point', {
      p_point_id: schemaIdentifiant.parse(pointId),
      p_mentions: schemaBaseMentionsPoint.parse(mentions),
    }),
  )
  if (error) throw error
}
