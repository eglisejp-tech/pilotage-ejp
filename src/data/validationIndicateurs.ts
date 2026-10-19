// Validation des indicateurs créés par les ministères (étape 6, lot L4 ; validation-metier.md,
// section 6) : une fonction typée par requête. Un ministère envoie une suggestion avec son
// « Pourquoi » (`ajouter_suggestion`) et lit ses propres demandes ; EJP Tech lit la file
// (`v_a_valider`, avec le « Pourquoi ») et décide (`valider_indicateur`) ; l'administration lit
// seulement l'attente, sans « Pourquoi » ni valeur (la RLS de `demande_indicateur` ne lui ouvre
// rien : elle passe par `indicateur` et `v_usage_indicateurs`). Rien n'est recompté ici : les jours
// d'attente et le retard viennent de la base, à l'heure de Paris. Chaque écriture valide ses valeurs
// par les schémas des formulaires avant tout appel.

import { lireSemaine } from '@/data/eglise'
import { schemaDecision } from '@/features/indicateurs/validation/schemas'
import type { Decision } from '@/features/indicateurs/validation/schemas'
import { schemaRetrait, schemaSuggestion } from '@/features/mes-indicateurs/schemas'
import type { RetraitEnvoye, SuggestionEnvoyee } from '@/features/mes-indicateurs/schemas'
import { debutDeJourParis } from '@/features/journal/periodes'
import type { LigneTable } from '@/lib/base'
import { ajouterJours } from '@/lib/metier/dates'
import { supabase } from '@/lib/supabase'

/** Nombre de jours que garde la liste « Décidées » d'EJP Tech (validation-metier.md, 5.1). */
export const JOURS_DECISIONS = 30

/** Au plus ce nombre de décisions lues : la liste est repliée, 30 jours d'un petit volume. */
const LIMITE_DECISIONS = 100

// Écritures

/**
 * Envoie une suggestion du catalogue au nom du ministère connecté, avec son « Pourquoi » : elle
 * naît « à valider ». Rend l'identifiant de l'indicateur créé. La base refuse au-delà de 3 ajouts
 * ou de 30 lignes, un « Pourquoi » trop court ou trop long, une donnée personnelle, un libellé déjà
 * pris : son message est repris tel quel par l'écran.
 */
export async function ajouterSuggestion(brut: SuggestionEnvoyee): Promise<string> {
  const suggestion = schemaSuggestion.parse(brut)
  const { data, error } = await supabase().rpc('ajouter_suggestion', {
    p_ministere_id: suggestion.ministereId,
    p_code: suggestion.code,
    p_pourquoi: suggestion.pourquoi,
  })
  if (error) throw error
  return data
}

/**
 * Retrait d'un ajout par le ministère qui l'a fait (T62) : à valider (« Retirer la demande ») ou
 * validé (« Retirer »), avec un motif de 10 à 280 caractères. Les saisies restent. La base refuse
 * un prévu de la coordination, un ajout d'EJP Tech, la source d'un calcul suivi, un indicateur
 * déjà retiré, et un motif trop court, trop long ou qui contient une donnée personnelle.
 */
export async function retirerMonIndicateur(brut: RetraitEnvoye): Promise<void> {
  const retrait = schemaRetrait.parse(brut)
  const { error } = await supabase().rpc('retirer_mon_indicateur', {
    p_indicateur_id: retrait.indicateurId,
    p_motif: retrait.motif,
  })
  if (error) throw error
}

/**
 * Décision d'EJP Tech sur une demande : « Valider » sans motif, « Refuser » avec un motif de 10 à
 * 280 caractères. Une décision est définitive (une seule par demande).
 */
export async function validerIndicateur(brut: Decision): Promise<void> {
  const decision = schemaDecision.parse(brut)
  const { error } = await supabase().rpc('valider_indicateur', {
    p_demande_id: decision.demandeId,
    p_decision: decision.decision,
    p_motif: decision.decision === 'refuse' ? decision.motif : null,
  })
  if (error) throw error
}

// Lectures de l'administration de l'église

/** Un ajout qui attend EJP Tech, tel que le lit l'administration : jamais un « Pourquoi ». */
export interface AttenteAdministration {
  indicateur_id: string
  ministere_id: string
  ministere_nom: string
  libelle: string
  definition: string
  nature: LigneTable<'indicateur'>['nature']
  /** Envoi de la demande, à un instant près (même transaction que l'indicateur). */
  cree_le: string
  /** Jours d'attente comptés par la base, à l'heure de Paris ; null si la base n'en rend pas. */
  attente_jours: number | null
}

// L'attente se construit à partir des trois lectures de l'écran Indicateurs (indicateurs propres,
// usage, ministères : `src/data/indicateursConfiguration.ts`, mêmes clés de requête que le tableau
// de L3a), par `construireAttentesAdministration` : aucune lecture de plus.
//
// Lectures d'EJP Tech : la file `v_a_valider` (avec le « Pourquoi ») se lit par `lireAValider` de
// `src/data/indicateurs.ts`.

/** Une décision de ces 30 derniers jours : le ministère, l'indicateur, la décision et son motif. */
export interface DecisionRecente {
  validation_id: string
  ministere_nom: string
  libelle: string
  decision: LigneTable<'validation'>['decision']
  /** Motif d'un refus (ou le texte de masquage) ; null pour une validation. */
  motif: string | null
  saisi_le: string
}

/**
 * Décisions d'EJP Tech des 30 derniers jours, de la plus récente à la plus ancienne. Le jour de
 * départ se lit dans `v_semaine` (heure de Paris), jamais dans la date du navigateur ; la borne
 * envoyée est minuit, heure de Paris, de ce jour (un instant explicite : une date nue serait lue
 * à minuit dans le fuseau de la base, à 1 ou 2 heures de là). La lecture de `validation` est celle
 * d'EJP Tech ; les demandes donnent le nom de l'indicateur envoyé.
 */
export async function lireDecisionsRecentes(): Promise<DecisionRecente[]> {
  const semaine = await lireSemaine()
  if (semaine === null) throw new Error('Lecture sans donnée.')
  const depuis = debutDeJourParis(ajouterJours(semaine.aujourdhui, -JOURS_DECISIONS))
  const decisions = await supabase()
    .from('validation')
    .select('id, demande_id, ministere_id, decision, motif, saisi_le')
    .gte('saisi_le', depuis)
    .order('saisi_le', { ascending: false })
    .limit(LIMITE_DECISIONS)
  if (decisions.error) throw decisions.error
  if (decisions.data.length === 0) return []
  const demandeIds = decisions.data.map((decision) => decision.demande_id)
  const [demandes, ministeres] = await Promise.all([
    supabase().from('demande_indicateur').select('id, libelle').in('id', demandeIds),
    supabase().from('ministere').select('id, nom'),
  ])
  if (demandes.error) throw demandes.error
  if (ministeres.error) throw ministeres.error
  const libelles = new Map(demandes.data.map((demande) => [demande.id, demande.libelle]))
  const noms = new Map(ministeres.data.map((ministere) => [ministere.id, ministere.nom]))
  return decisions.data.map((decision) => ({
    validation_id: decision.id,
    ministere_nom: noms.get(decision.ministere_id) ?? '',
    libelle: libelles.get(decision.demande_id) ?? '',
    decision: decision.decision,
    motif: decision.motif,
    saisi_le: decision.saisi_le,
  }))
}

/**
 * Un retrait d'un ajout par son ministère, des 30 derniers jours (T62) : le ministère,
 * l'indicateur, son état avant le retrait et le motif écrit (ou le texte de masquage).
 */
export interface RetraitRecent {
  retrait_id: string
  ministere_nom: string
  libelle: string
  etat_avant: LigneTable<'retrait_indicateur'>['etat_avant']
  motif: string
  saisi_le: string
}

/**
 * Retraits des ministères des 30 derniers jours, du plus récent au plus ancien (EJP Tech : la RLS
 * de `retrait_indicateur` ne rend à un ministère que ses propres lignes, rien aux autres profils).
 * Même borne que les décisions : minuit, heure de Paris, du jour lu dans `v_semaine`.
 */
export async function lireRetraitsRecents(): Promise<RetraitRecent[]> {
  const semaine = await lireSemaine()
  if (semaine === null) throw new Error('Lecture sans donnée.')
  const depuis = debutDeJourParis(ajouterJours(semaine.aujourdhui, -JOURS_DECISIONS))
  const retraits = await supabase()
    .from('retrait_indicateur')
    .select('id, indicateur_id, ministere_id, etat_avant, motif, saisi_le')
    .gte('saisi_le', depuis)
    .order('saisi_le', { ascending: false })
    .limit(LIMITE_DECISIONS)
  if (retraits.error) throw retraits.error
  if (retraits.data.length === 0) return []
  const indicateurIds = retraits.data.map((retrait) => retrait.indicateur_id)
  const [indicateurs, ministeres] = await Promise.all([
    supabase().from('indicateur').select('id, libelle').in('id', indicateurIds),
    supabase().from('ministere').select('id, nom'),
  ])
  if (indicateurs.error) throw indicateurs.error
  if (ministeres.error) throw ministeres.error
  const libelles = new Map(
    indicateurs.data.map((indicateur) => [indicateur.id, indicateur.libelle]),
  )
  const noms = new Map(ministeres.data.map((ministere) => [ministere.id, ministere.nom]))
  return retraits.data.map((retrait) => ({
    retrait_id: retrait.id,
    ministere_nom: noms.get(retrait.ministere_id) ?? '',
    libelle: libelles.get(retrait.indicateur_id) ?? '',
    etat_avant: retrait.etat_avant,
    motif: retrait.motif,
    saisi_le: retrait.saisi_le,
  }))
}

// Lectures du ministère

/** Un retrait fait par le ministère : l'indicateur, son état d'avant, le motif et le jour. */
export type RetraitLu = Pick<
  LigneTable<'retrait_indicateur'>,
  'indicateur_id' | 'etat_avant' | 'motif' | 'saisi_le'
>

/** Les retraits faits par le ministère (T62) : la RLS ne lui rend que les siens. */
export async function lireMesRetraits(ministereId: string): Promise<RetraitLu[]> {
  const { data, error } = await supabase()
    .from('retrait_indicateur')
    .select('indicateur_id, etat_avant, motif, saisi_le')
    .eq('ministere_id', ministereId)
  if (error) throw error
  return data
}

/** Un indicateur du ministère, tel que le lit « Mes indicateurs » : sa définition et son état. */
export type IndicateurDuMinistere = Pick<
  LigneTable<'indicateur'>,
  | 'id'
  | 'libelle'
  | 'definition'
  | 'nature'
  | 'calcul'
  | 'etat'
  | 'origine'
  | 'modele_code'
  | 'cree_le'
  | 'retire_le'
  | 'retrait_motif'
>

/**
 * Indicateurs propres du ministère, tous états (actif, à valider, retiré), calculs compris. Les
 * chiffres communs n'y sont pas. La base ne rend à un ministère que les siens ; le filtre nomme la
 * fiche voulue.
 */
export async function lireMesIndicateurs(ministereId: string): Promise<IndicateurDuMinistere[]> {
  const { data, error } = await supabase()
    .from('indicateur')
    .select(
      'id, libelle, definition, nature, calcul, etat, origine, modele_code, cree_le, retire_le, retrait_motif',
    )
    .eq('ministere_id', ministereId)
  if (error) throw error
  return data
}

/** Un refus qu'a reçu le ministère : l'indicateur, le jour et le motif écrit par EJP Tech. */
export interface RefusRecu {
  indicateur_id: string
  saisi_le: string
  /** Le motif de 10 à 280 caractères, ou « [texte masqué par EJP Tech] ». */
  motif: string
}

/**
 * Les refus d'EJP Tech sur les ajouts du ministère. Le ministère lit ses demandes et leurs
 * décisions (RLS). Le motif d'un refus se lit aussi par le berger, le conseil, l'administration de
 * l'église et EJP Tech (politique de lecture de `validation`) ; seul le « Pourquoi » de la demande
 * est réservé au ministère et à EJP Tech.
 */
export async function lireMesRefus(ministereId: string): Promise<RefusRecu[]> {
  const [decisions, demandes] = await Promise.all([
    supabase()
      .from('validation')
      .select('demande_id, decision, motif, saisi_le')
      .eq('ministere_id', ministereId)
      .eq('decision', 'refuse'),
    supabase()
      .from('demande_indicateur')
      .select('id, indicateur_id')
      .eq('ministere_id', ministereId),
  ])
  if (decisions.error) throw decisions.error
  if (demandes.error) throw demandes.error
  const indicateurs = new Map(demandes.data.map((demande) => [demande.id, demande.indicateur_id]))
  return decisions.data.flatMap((decision) => {
    const indicateurId = indicateurs.get(decision.demande_id)
    return indicateurId === undefined || decision.motif === null || decision.decision !== 'refuse'
      ? []
      : [{ indicateur_id: indicateurId, saisi_le: decision.saisi_le, motif: decision.motif }]
  })
}
