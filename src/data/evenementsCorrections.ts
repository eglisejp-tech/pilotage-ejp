// Corrections d'un événement (T78, lot 1 ; docs/conception/calendrier-evenements.md, sections 6.1
// à 6.3) : corriger le nom, modifier les mentions, retirer un événement créé par erreur. Trois
// fonctions de la base, chacune écrit des lignes nouvelles (rien n'est modifié ni effacé), par
// `envoyer` (src/data/envoi.ts) ; un échec se lit par le classement unique de T76
// (`lireEchecCorrection`). Refaire ne double rien (même nom, même liste, déjà retiré : la base
// n'écrit rien) : une connexion perdue dit de réessayer. Et la lecture du retrait d'un événement,
// pour le panneau ouvert par un ancien lien (« Cet événement a été retiré le 26 oct. »).

import { lireEchec } from '@/data/echecEnvoi'
import type { EchecLu } from '@/data/echecEnvoi'
import { envoyer } from '@/data/envoi'
import { verifierIdentifiant } from '@/features/evenements/schemas'
import {
  schemaMentionsEvenement,
  schemaNomEvenement,
} from '@/features/evenements/schemasCorrections'
import type { LigneVue, StatutEvenement } from '@/lib/base'
import { jourDeParis } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { supabase } from '@/lib/supabase'

/** Le nom avant la dernière correction et le jour (Paris) de cette correction, ou null. */
export type NomCorrige = Pick<LigneVue<'v_evenement'>, 'titre_precedent' | 'titre_corrige_le'>

/**
 * Corrige le nom d'un événement du ministère connecté : une ligne de `evenement_titre`, l'ancien
 * nom reste. La base refuse un événement retiré ou d'un autre ministère.
 */
export async function corrigerNomEvenement(evenementId: string, titre: string): Promise<void> {
  const identifiant = verifierIdentifiant(evenementId)
  const nom = schemaNomEvenement.parse({ titre }).titre
  const { error } = await envoyer('rpc/corriger_titre_evenement', () =>
    supabase().rpc('corriger_titre_evenement', { p_evenement_id: identifiant, p_titre: nom }),
  )
  if (error) throw error
}

/**
 * Remplace les mentions d'un événement du ministère connecté par la liste voulue : la base écrit
 * les retraits et les ajouts. Elle refuse après la date de l'événement, et un ministère désactivé
 * ajouté.
 */
export async function modifierMentionsEvenement(
  evenementId: string,
  mentions: readonly string[],
): Promise<void> {
  const identifiant = verifierIdentifiant(evenementId)
  const liste = schemaMentionsEvenement.parse({ mentions: [...mentions] }).mentions
  const { error } = await envoyer('rpc/modifier_mentions_evenement', () =>
    supabase().rpc('modifier_mentions_evenement', {
      p_evenement_id: identifiant,
      p_mentions: liste,
    }),
  )
  if (error) throw error
}

/**
 * Retire un événement créé par erreur : il sort du calendrier et des comptages, il reste en base
 * et au journal. Le porteur jusqu'à la date de l'événement, EJP Tech à tout moment ; définitif.
 */
export async function retirerEvenement(evenementId: string): Promise<void> {
  const identifiant = verifierIdentifiant(evenementId)
  const { error } = await envoyer('rpc/retirer_evenement', () =>
    supabase().rpc('retirer_evenement', { p_evenement_id: identifiant }),
  )
  if (error) throw error
}

/**
 * « Toute la série » (T78, lot 2, Q8) : le nom de toutes les dates non retirées de la série. Même
 * contrôle que pour un événement ; la base n'écrit rien pour une date qui a déjà ce nom.
 */
export async function corrigerNomSerie(serieId: string, titre: string): Promise<void> {
  const identifiant = verifierIdentifiant(serieId)
  const nom = schemaNomEvenement.parse({ titre }).titre
  const { error } = await envoyer('rpc/corriger_titre_serie', () =>
    supabase().rpc('corriger_titre_serie', { p_serie_id: identifiant, p_titre: nom }),
  )
  if (error) throw error
}

/** « Toute la série » : les mentions des dates à venir de la série (dernier jour compris). */
export async function modifierMentionsSerie(
  serieId: string,
  mentions: readonly string[],
): Promise<void> {
  const identifiant = verifierIdentifiant(serieId)
  const liste = schemaMentionsEvenement.parse({ mentions: [...mentions] }).mentions
  const { error } = await envoyer('rpc/modifier_mentions_serie', () =>
    supabase().rpc('modifier_mentions_serie', { p_serie_id: identifiant, p_mentions: liste }),
  )
  if (error) throw error
}

/**
 * « Toute la série » : le porteur retire les dates à venir sans « Terminé » ni « Annulé » (les
 * autres restent au calendrier) ; EJP Tech retire toutes les dates.
 */
export async function retirerSerie(serieId: string): Promise<void> {
  const identifiant = verifierIdentifiant(serieId)
  const { error } = await envoyer('rpc/retirer_serie', () =>
    supabase().rpc('retirer_serie', { p_serie_id: identifiant }),
  )
  if (error) throw error
}

/** Les états finals d'un événement : une fois l'un d'eux enregistré, seul EJP Tech le retire. */
export type EtatFinal = Extract<StatutEvenement, 'termine' | 'annule'>

const ETATS_FINALS = ['termine', 'annule'] as const satisfies readonly EtatFinal[]

/** Vrai pour « Terminé » et « Annulé ». */
export function estEtatFinal(statut: StatutEvenement): statut is EtatFinal {
  return (ETATS_FINALS as readonly StatutEvenement[]).includes(statut)
}

/**
 * Une date d'une série, telle que le panneau la compte (T78, lot 2). `etat_final_enregistre` :
 * « Terminé » ou « Annulé » a été enregistré, même remplacé depuis ; la date reste alors au
 * calendrier quand le porteur retire la série (décision du 27 octobre 2026, comme la base).
 */
export type DateDeSerie = Pick<LigneVue<'v_evenement'>, 'id' | 'statut' | 'jours_fin'> & {
  etat_final_enregistre: boolean
}

/** Les dates non retirées d'une série que le compte lit (`v_evenement`), et leurs états finals. */
export async function lireDatesSerie(serieId: string): Promise<DateDeSerie[]> {
  const { data, error } = await supabase()
    .from('v_evenement')
    .select('id, statut, jours_fin')
    .eq('serie_id', serieId)
  if (error) throw error
  if (data.length === 0) return []
  const finals = await supabase()
    .from('evenement_etat')
    .select('evenement_id')
    .in(
      'evenement_id',
      data.map((date) => date.id),
    )
    .in('statut', [...ETATS_FINALS])
  if (finals.error) throw finals.error
  const avecEtatFinal = new Set(finals.data.map((ligne) => ligne.evenement_id))
  return data.map((date) => ({ ...date, etat_final_enregistre: avecEtatFinal.has(date.id) }))
}

/**
 * Le dernier état final (« Terminé » ou « Annulé ») enregistré pour un événement que le compte
 * lit, même remplacé depuis par un autre état, ou null (décision du 27 octobre 2026) : la base
 * refuse alors le retrait au porteur (`retirer_evenement`), l'écran le dit sous le bouton.
 */
export async function lireEtatFinalEvenement(evenementId: string): Promise<EtatFinal | null> {
  const { data, error } = await supabase()
    .from('evenement_etat')
    .select('statut')
    .eq('evenement_id', evenementId)
    .in('statut', [...ETATS_FINALS])
    .order('saisi_le', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data !== null && estEtatFinal(data.statut) ? data.statut : null
}

/**
 * Jour (heure de Paris) du retrait d'un événement que le compte lit, ou null s'il n'est pas retiré
 * (ou pas lisible).
 */
export async function lireRetraitEvenement(evenementId: string): Promise<DateIso | null> {
  const { data, error } = await supabase()
    .from('evenement_retrait')
    .select('saisi_le')
    .eq('evenement_id', evenementId)
    .maybeSingle()
  if (error) throw error
  return data === null ? null : jourDeParis(data.saisi_le)
}

/** Phrase d'un échec d'une correction : refaire ne crée rien de plus (`reprise`). */
export function lireEchecCorrection(erreur: unknown): EchecLu {
  return lireEchec(erreur, { nature: 'reprise' })
}
