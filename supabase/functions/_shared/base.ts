// Appel des fonctions serveur de la base (migration comptes_fonctions_serveur), réservées à la
// clé secrète. Leurs refus portent un code court, traduit ici en réponse HTTP ; toute autre
// erreur devient 500 sans détail.
import type { SupabaseClient } from '@supabase/supabase-js'
import { consigner, ErreurFonction, type CodeErreur, type StatutErreur } from './http.ts'

export type FonctionServeur =
  | 'serveur_controler_creation_compte'
  | 'serveur_controler_cible'
  | 'serveur_creer_compte'
  | 'serveur_desactiver_compte'
  | 'serveur_reinitialiser_2fa'

const refusConnus = new Map<string, [StatutErreur, CodeErreur]>([
  ['appelant_non_autorise', [403, 'acces_refuse']],
  ['requete_invalide', [400, 'requete_invalide']],
  ['type_interdit', [400, 'type_interdit']],
  ['ministere_inconnu', [400, 'ministere_inconnu']],
  ['compte_inconnu', [400, 'compte_inconnu']],
  ['propre_compte', [403, 'propre_compte']],
  ['adresse_deja_utilisee', [409, 'adresse_deja_utilisee']],
  ['ministere_a_deja_un_compte', [409, 'ministere_a_deja_un_compte']],
  ['nom_ministere_deja_pris', [409, 'nom_ministere_deja_pris']],
  ['berger_deja_actif', [409, 'berger_deja_actif']],
  ['compte_desactive', [409, 'compte_desactive']],
])

export function traduireErreurBase(erreur: { code?: string; message?: string }): ErreurFonction {
  const connu = erreur.message === undefined ? undefined : refusConnus.get(erreur.message)
  if (connu) return new ErreurFonction(connu[0], connu[1])
  // Contrainte unique touchée hors des contrôles (écriture faite ailleurs entre-temps).
  if (erreur.code === '23505') return new ErreurFonction(409, 'conflit')
  return new ErreurFonction(500, 'erreur_interne')
}

export async function appelerBase(
  admin: SupabaseClient,
  fonction: string,
  serveur: FonctionServeur,
  parametres: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.rpc(serveur, parametres)
  if (!error) return
  const traduite = traduireErreurBase(error)
  if (traduite.statut === 500) consigner(fonction, serveur, error.code)
  throw traduite
}
