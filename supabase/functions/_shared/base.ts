// Appel des fonctions serveur de la base (migrations comptes_*), réservées à la clé secrète.
// Chaque appel porte l'identifiant de l'appelant et sa session (p_appelant, p_session) : la base
// vérifie de nouveau son compte et exige que sa session existe encore en aal2 (décision T15).
// Les refus portent un code court, traduit ici en réponse HTTP ; toute autre erreur devient 500
// sans détail.
import type { Appelant } from './appelant.ts'
import { consigner, ErreurFonction, type CodeErreur, type StatutErreur } from './http.ts'

export type FonctionServeur =
  | 'serveur_controler_creation_compte'
  | 'serveur_controler_cible'
  | 'serveur_creer_compte'
  | 'serveur_desactiver_compte'
  | 'serveur_reinitialiser_2fa'
  | 'serveur_controler_relance'
  | 'serveur_relancer_invitation'
  | 'serveur_controler_reactivation'
  | 'serveur_reactiver_compte'
  | 'serveur_revoquer_sessions'

const refusConnus = new Map<string, [StatutErreur, CodeErreur]>([
  ['appelant_non_autorise', [403, 'acces_refuse']],
  ['session_revoquee', [401, 'session_revoquee']],
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
  ['compte_actif', [409, 'compte_actif']],
  ['invitation_deja_acceptee', [409, 'invitation_deja_acceptee']],
])

export function traduireErreurBase(erreur: { code?: string; message?: string }): ErreurFonction {
  const connu = erreur.message === undefined ? undefined : refusConnus.get(erreur.message)
  if (connu) return new ErreurFonction(connu[0], connu[1])
  // Contrainte unique touchée hors des contrôles (écriture faite ailleurs entre-temps).
  if (erreur.code === '23505') return new ErreurFonction(409, 'conflit')
  return new ErreurFonction(500, 'erreur_interne')
}

export async function appelerBase(
  appelant: Appelant,
  fonction: string,
  serveur: FonctionServeur,
  parametres: Record<string, unknown>,
): Promise<void> {
  const { error } = await appelant.admin.rpc(serveur, {
    ...parametres,
    p_appelant: appelant.id,
    p_session: appelant.session,
  })
  if (!error) return
  const traduite = traduireErreurBase(error)
  if (traduite.statut === 500) consigner(fonction, serveur, error.code)
  throw traduite
}
