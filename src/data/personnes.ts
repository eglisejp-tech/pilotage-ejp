// Observabilité des personnes (T56) : une fonction par requête. La déclaration de la session
// (`v_ma_declaration`) et le jour d'utilisation (`passage`) servent au compte de ministère ; les
// autres lectures et l'effacement ne servent qu'à EJP Tech (la RLS rend vide à tout autre compte).
// Le prénom ne va jamais ailleurs que dans `declarer_intervenant`.

import type { LigneTable, LigneVue } from '@/lib/base'
import { schemaPrenom } from '@/lib/metier/declaration'
import type { Declaration, MotifDeclaration } from '@/lib/metier/declaration'
import { supabase } from '@/lib/supabase'

/** Connexions montrées d'abord, et ajoutées par « Afficher 50 de plus ». */
export const TAILLE_PAGE_CONNEXIONS = 50

/**
 * Dernière déclaration de la session de cet appareil, ou null. Lisible en aal2 seulement ; la base
 * ne rend que celle de la session du jeton, et dit si elle est du jour de Paris (T63).
 */
export async function lireMaDeclaration(): Promise<Declaration | null> {
  const { data, error } = await supabase()
    .from('v_ma_declaration')
    .select('id, prenom, du_jour')
    .maybeSingle()
  if (error) throw error
  return data ? { id: data.id, prenom: data.prenom, duJour: data.du_jour } : null
}

/** Déclare le prénom de la personne sur cette session ; le schéma le nettoie et le contrôle. */
export async function declarerIntervenant(prenom: string, motif: MotifDeclaration): Promise<void> {
  const { error } = await supabase().rpc('declarer_intervenant', {
    p_prenom: schemaPrenom.parse(prenom),
    p_motif: motif,
  })
  if (error) throw error
}

/**
 * Note le jour d'utilisation de la déclaration (une ligne par jour de Paris, imposé par la base ;
 * une seconde fois le même jour ne fait rien).
 */
export async function noterPassage(declarationId: number): Promise<void> {
  const { error } = await supabase()
    .from('passage')
    .upsert(
      { intervenant_id: declarationId },
      { onConflict: 'intervenant_id,jour', ignoreDuplicates: true },
    )
  if (error) throw error
}

export type Personne = LigneVue<'v_personnes'>

/**
 * Les personnes déclarées, par compte et par prénom, de la plus récemment active à la moins, avec
 * la dernière version des conditions que chacune a acceptée (T61).
 */
export async function lirePersonnes(): Promise<Personne[]> {
  const { data, error } = await supabase()
    .from('v_personnes')
    .select(
      'compte, compte_libelle, prenom, intervenant_id, connexions_30_jours, jours_30_jours, actions_30_jours, derniere_activite, declarations_anciennes, version_acceptee, acceptee_le',
    )
    .order('derniere_activite', { ascending: false })
  if (error) throw error
  return data
}

export type Connexion = Pick<LigneTable<'intervenant'>, 'id' | 'compte' | 'prenom' | 'declare_le'>

export interface PageConnexions {
  connexions: Connexion[]
  /** Numéro de la dernière connexion lue, pour « Afficher 50 de plus » ; null : plus rien. */
  suivant: number | null
}

/**
 * Les connexions (premières déclarations des sessions), de la plus récente à la plus ancienne,
 * par pages : celles d'avant `avant` (numéro de déclaration), une de plus pour savoir s'il en reste.
 */
export async function lireConnexions(avant: number | null): Promise<PageConnexions> {
  let requete = supabase()
    .from('intervenant')
    .select('id, compte, prenom, declare_le')
    .eq('motif', 'connexion')
  if (avant !== null) {
    if (!Number.isSafeInteger(avant)) throw new RangeError('Curseur de connexions invalide')
    requete = requete.lt('id', avant)
  }
  const { data, error } = await requete
    .order('id', { ascending: false })
    .limit(TAILLE_PAGE_CONNEXIONS + 1)
  if (error) throw error
  const connexions = data.slice(0, TAILLE_PAGE_CONNEXIONS)
  const derniere = connexions.at(-1)
  return {
    connexions,
    suivant: data.length > TAILLE_PAGE_CONNEXIONS && derniere ? derniere.id : null,
  }
}

/** Libellé de chaque compte (« Ministère Communication »), par identifiant. */
export async function lireLibellesComptes(): Promise<Map<string, string>> {
  const { data, error } = await supabase().from('compte').select('user_id, libelle')
  if (error) throw error
  return new Map(data.map((compte) => [compte.user_id, compte.libelle] as const))
}

/** Efface un prénom (toutes ses déclarations sur le compte) ; rend leur nombre. */
export async function effacerPrenom(intervenantId: number): Promise<number> {
  const { data, error } = await supabase().rpc('effacer_prenom', { p_intervenant: intervenantId })
  if (error) throw error
  return data
}

/** Efface les prénoms déclarés il y a plus de 12 mois ; rend le nombre de déclarations changées. */
export async function effacerPrenomsAnciens(): Promise<number> {
  const { data, error } = await supabase().rpc('effacer_prenoms_anciens', {})
  if (error) throw error
  return data
}

/**
 * Prénom déclaré de chaque ligne de journal lue (Journal technique d'EJP Tech) : le prénom, ou
 * null pour une ligne d'un compte de ministère écrite sans déclaration. Une ligne absente de la
 * carte n'a rien à dire (Système, compte d'un autre profil, ligne d'avant la mise en service).
 */
export async function lirePrenomsDuJournal(
  ids: readonly number[],
): Promise<Map<number, string | null>> {
  const surs = ids.filter((id) => Number.isSafeInteger(id))
  if (surs.length === 0) return new Map()
  const { data, error } = await supabase()
    .from('v_journal_intervenant')
    .select('journal_id, prenom')
    .in('journal_id', surs)
  if (error) throw error
  return new Map(data.map((ligne) => [ligne.journal_id, ligne.prenom] as const))
}
