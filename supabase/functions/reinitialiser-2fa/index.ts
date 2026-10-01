// reinitialiser-2fa (BRIEF, section 8, « Les Edge Functions », et P10) : l'administration de
// l'église, en aal2, supprime les facteurs de double authentification d'un compte, remplace son
// mot de passe par une valeur aléatoire que personne ne voit, puis la base supprime ses sessions
// et écrit le journal double_auth_reinitialisee. Le compte refait « Mot de passe oublié » puis
// l'activation. Le compte de l'appelant est refusé.
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { schemaCibleCompte } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'reinitialiser-2fa'

// 52 caractères aléatoires ; le préfixe satisfait toute règle de composition de Supabase
// (minuscule, majuscule, chiffre, symbole). Jamais écrit dans un journal.
function motDePasseAleatoire(): string {
  const octets = crypto.getRandomValues(new Uint8Array(36))
  const base64 = btoa(String.fromCharCode(...octets))
  return `Aa1!${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

export default servir({
  nom: FONCTION,
  schema: schemaCibleCompte,
  async action({ user_id: cible }, appelant) {
    // 1. Contrôles sans écriture : compte existant, actif, autre que l'appelant.
    await appelerBase(appelant.admin, FONCTION, 'serveur_controler_cible', {
      p_appelant: appelant.id,
      p_user_id: cible,
    })

    // 2. Tous les facteurs du compte, vérifiés ou non (seul TOTP est ouvert).
    const { data, error } = await appelant.admin.auth.admin.mfa.listFactors({ userId: cible })
    if (error) {
      consigner(FONCTION, 'liste_facteurs', error.code)
      throw new ErreurFonction(500, 'erreur_interne')
    }
    for (const facteur of data.factors) {
      const { error: erreurSuppression } = await appelant.admin.auth.admin.mfa.deleteFactor({
        id: facteur.id,
        userId: cible,
      })
      if (erreurSuppression) {
        consigner(FONCTION, 'suppression_facteur', erreurSuppression.code)
        throw new ErreurFonction(500, 'erreur_interne')
      }
    }

    // 3. Nouveau mot de passe aléatoire : l'ancien ne sert plus.
    const { error: erreurMotDePasse } = await appelant.admin.auth.admin.updateUserById(cible, {
      password: motDePasseAleatoire(),
    })
    if (erreurMotDePasse) {
      consigner(FONCTION, 'mot_de_passe', erreurMotDePasse.code)
      throw new ErreurFonction(500, 'erreur_interne')
    }

    // 4. Sessions supprimées et journal, au nom de l'appelant. En cas d'échec, l'action peut
    // être relancée : les étapes 2 et 3 se refont sans dommage.
    await appelerBase(appelant.admin, FONCTION, 'serveur_reinitialiser_2fa', {
      p_appelant: appelant.id,
      p_user_id: cible,
    })
  },
})
