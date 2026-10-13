// reinitialiser-2fa (BRIEF, section 8, « Les Edge Functions », et P10) : l'administration de
// l'église, en aal2, coupe l'accès d'un compte partagé puis lui fait refaire l'activation.
// Ordre choisi pour qu'aucun échec ne laisse un compte sans facteur avec une session ou un mot
// de passe encore connus de la personne partie :
//   1. mot de passe remplacé par une valeur aléatoire que personne ne voit ;
//   2. sessions supprimées (plus de session aal1 d'où enrôler un facteur) ;
//   3. facteurs supprimés ;
//   4. sessions supprimées de nouveau et journal double_auth_reinitialisee.
// Chaque étape se refait sans dommage : en cas d'échec, l'administration relance l'action. Le
// compte refait « Mot de passe oublié » puis l'activation. Le compte de l'appelant est refusé.
// Une panne après l'étape 1 laisse un compte bloqué (mot de passe déjà remplacé, facteurs peut-être
// encore là) : elle rend le code `activation_incomplete`, qui dit de relancer l'action avant de
// prévenir la personne (m194). Un refus explicite (session de l'appelant révoquée, accès retiré,
// cible désactivée entre-temps) garde le sien, pour que l'écran dise quoi faire (se reconnecter),
// et se consigne à l'étape `apres_mot_de_passe` : la trace dit que le mot de passe a déjà changé,
// et l'action se relance une fois l'appelant reconnecté.
import type { Appelant } from '../_shared/appelant.ts'
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { schemaCibleCompte, type DemandeCibleCompte } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'reinitialiser-2fa'

// 52 caractères aléatoires ; le préfixe satisfait toute règle de composition de Supabase
// (minuscule, majuscule, chiffre, symbole). Jamais écrit dans un journal.
function motDePasseAleatoire(): string {
  const octets = crypto.getRandomValues(new Uint8Array(36))
  const base64 = btoa(String.fromCharCode(...octets))
  return `Aa1!${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

export async function reinitialiserDoubleAuthentification(
  { user_id: cible }: DemandeCibleCompte,
  appelant: Appelant,
): Promise<void> {
  const parametres = { p_user_id: cible }

  // 0. Contrôles sans écriture : compte existant, actif, autre que l'appelant.
  await appelerBase(appelant, FONCTION, 'serveur_controler_cible', parametres)

  // 1. Nouveau mot de passe aléatoire : l'ancien, partagé, ne sert plus.
  const { error: erreurMotDePasse } = await appelant.admin.auth.admin.updateUserById(cible, {
    password: motDePasseAleatoire(),
  })
  if (erreurMotDePasse) {
    consigner(FONCTION, 'mot_de_passe', erreurMotDePasse.code)
    throw new ErreurFonction(500, 'erreur_interne')
  }

  try {
    await couperPuisJournaliser(cible, parametres, appelant)
  } catch (erreur) {
    // Le mot de passe est déjà remplacé : une panne ici laisse le compte bloqué (m194). Un refus
    // qui vise l'appelant (session révoquée, accès refusé) ou la cible (désactivée entre-temps)
    // garde son code ; un conflit d'écriture (23505), comme une panne, dit de relancer l'action.
    if (erreur instanceof ErreurFonction && erreur.statut !== 500 && erreur.code !== 'conflit') {
      consigner(FONCTION, 'apres_mot_de_passe', erreur.code)
      throw erreur
    }
    if (!(erreur instanceof ErreurFonction)) consigner(FONCTION, 'apres_mot_de_passe')
    throw new ErreurFonction(500, 'activation_incomplete')
  }
}

/** Étapes 2 à 4, une fois le mot de passe remplacé. */
async function couperPuisJournaliser(
  cible: string,
  parametres: { p_user_id: string },
  appelant: Appelant,
): Promise<void> {
  // 2. Sessions supprimées avant de toucher aux facteurs.
  await appelerBase(appelant, FONCTION, 'serveur_revoquer_sessions', parametres)

  // 3. Tous les facteurs du compte, vérifiés ou non (seul TOTP est ouvert).
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

  // 4. Sessions supprimées de nouveau (ouvertes entre-temps) et journal, au nom de l'appelant.
  await appelerBase(appelant, FONCTION, 'serveur_reinitialiser_2fa', parametres)
}

export default servir({
  nom: FONCTION,
  schema: schemaCibleCompte,
  action: reinitialiserDoubleAuthentification,
})
