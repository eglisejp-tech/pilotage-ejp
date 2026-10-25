// supprimer-ministere (décision T74 ; BRIEF, section 8, « Les Edge Functions ») : EJP Tech (T60),
// en aal2, supprime un ministère vide (aucune donnée, aucun compte activé, jamais FIJ ni
// Coordination), ses indicateurs, ses liens et ses comptes, puis les utilisateurs Auth de ces
// comptes. Le journal garde toutes ses lignes et une ligne ministere_supprime avec le nom.
// Ordre :
//   1. contrôles en base, sans écriture ;
//   2. base, en une transaction : journal, indicateurs, lien à la liste des prévus, places dans
//      les sessions sans saisie, sessions et lignes des comptes, ministère ; elle rend les
//      identifiants des comptes supprimés ;
//   3. Auth : suppression de leurs utilisateurs (la clé étrangère de compte l'interdit avant).
// Une panne à l'étape 3 laisse un utilisateur Auth sans compte, qui n'ouvre rien : la réponse
// suppression_incomplete dit de l'effacer au tableau de bord (docs/exploitation.md).
import { z } from 'zod'
import type { Appelant } from '../_shared/appelant.ts'
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { schemaCibleMinistere, type DemandeCibleMinistere } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'supprimer-ministere'

const comptesSupprimes = z.array(z.uuid())

export async function supprimerMinistere(
  { ministere_id: ministere }: DemandeCibleMinistere,
  appelant: Appelant,
): Promise<void> {
  const parametres = { p_ministere_id: ministere }

  // 1. Contrôles sans écriture.
  await appelerBase(appelant, FONCTION, 'serveur_controler_suppression_ministere', parametres)

  // 2. Suppression en base, au nom de l'appelant.
  const reponse = await appelerBase(appelant, FONCTION, 'serveur_supprimer_ministere', parametres)
  const comptes = comptesSupprimes.safeParse(reponse ?? [])
  if (!comptes.success) {
    consigner(FONCTION, 'reponse_base')
    throw new ErreurFonction(500, 'suppression_incomplete')
  }

  // 3. Utilisateurs Auth des comptes supprimés.
  let echec = false
  for (const utilisateur of comptes.data) {
    const { error } = await appelant.admin.auth.admin.deleteUser(utilisateur)
    // Déjà absent d'Auth : rien à effacer.
    if (error && error.status !== 404) {
      consigner(FONCTION, 'suppression_utilisateur', error.code)
      echec = true
    }
  }
  if (echec) throw new ErreurFonction(500, 'suppression_incomplete')
}

export default servir({
  nom: FONCTION,
  schema: schemaCibleMinistere,
  action: supprimerMinistere,
})
