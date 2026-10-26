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
import type { LigneVue } from '@/lib/base'
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
