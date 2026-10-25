// corriger-adresse (décision T74 ; BRIEF, section 8, « Les Edge Functions ») : EJP Tech (T60), en
// aal2, remplace l'adresse d'un compte jamais activé (« Invitation envoyée » ou « À activer »),
// de tout type de l'écran 13, actif ou désactivé (« Réactiver » corrige d'abord, compte encore
// banni, puis réactive), et envoie l'invitation à la nouvelle adresse. Le ministère, ses
// indicateurs et son historique ne bougent pas. L'adresse n'est gardée que dans Auth.
// Ordre, pour que l'adresse fausse perde ses accès avant que l'adresse change :
//   1. contrôles en base, sans écriture : compte jamais activé, autre que l'appelant et que
//      l'administration de l'église, adresse libre ;
//   2. base : sessions, identités autres que l'email (Google) et liens à usage unique supprimés ;
//   3. facteurs non vérifiés supprimés (activation commencée depuis l'adresse fausse) ;
//   4. Auth : nouvelle adresse et mot de passe aléatoire (celui qu'aurait choisi la personne qui a
//      reçu l'invitation par erreur ne sert plus) ; Auth efface aussi les liens en attente ;
//   5. base : adresse rendue non confirmée, mêmes suppressions qu'en 2, journal adresse_corrigee
//      (sans adresse) ; un compte activé entre-temps est refusé ;
//   6. invitation vers la nouvelle adresse.
// Une correction interrompue se relance avec la même adresse : la base l'accepte pour ce compte,
// et chaque étape se refait sans dommage.
import type { Appelant } from '../_shared/appelant.ts'
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { inviter } from '../_shared/invitation.ts'
import { motDePasseAleatoire } from '../_shared/motDePasse.ts'
import { schemaCorrigerAdresse, type DemandeCorrigerAdresse } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'corriger-adresse'

export async function corrigerAdresse(
  { user_id: cible, email }: DemandeCorrigerAdresse,
  appelant: Appelant,
): Promise<void> {
  const parametres = { p_user_id: cible, p_email: email }

  // 1. Contrôles sans écriture.
  await appelerBase(appelant, FONCTION, 'serveur_controler_correction_adresse', parametres)

  // 2. Ce que l'adresse fausse ouvrait encore, coupé avant de toucher à Auth.
  await appelerBase(appelant, FONCTION, 'serveur_preparer_correction_adresse', parametres)

  // 3. Facteurs non vérifiés (un compte jamais activé n'en a pas d'autre).
  const { data: facteurs, error: erreurListe } = await appelant.admin.auth.admin.mfa.listFactors({
    userId: cible,
  })
  if (erreurListe) {
    consigner(FONCTION, 'liste_facteurs', erreurListe.code)
    throw new ErreurFonction(500, 'erreur_interne')
  }
  for (const facteur of facteurs.factors) {
    if (facteur.status === 'verified') continue
    const { error: erreurSuppression } = await appelant.admin.auth.admin.mfa.deleteFactor({
      id: facteur.id,
      userId: cible,
    })
    if (erreurSuppression) {
      consigner(FONCTION, 'suppression_facteur', erreurSuppression.code)
      throw new ErreurFonction(500, 'erreur_interne')
    }
  }

  // 4. Nouvelle adresse et mot de passe aléatoire dans Auth.
  const { data, error } = await appelant.admin.auth.admin.updateUserById(cible, {
    email,
    password: motDePasseAleatoire(),
  })
  if (error) {
    if (error.code === 'email_exists') throw new ErreurFonction(409, 'adresse_deja_utilisee')
    consigner(FONCTION, 'adresse', error.code)
    throw new ErreurFonction(500, 'erreur_interne')
  }
  if (data.user?.email?.toLowerCase() !== email) {
    consigner(FONCTION, 'adresse_differente')
    throw new ErreurFonction(500, 'erreur_interne')
  }

  // 5. Adresse non confirmée, accès coupés de nouveau et journal, au nom de l'appelant.
  await appelerBase(appelant, FONCTION, 'serveur_corriger_adresse', parametres)

  // 6. Invitation vers la nouvelle adresse, désormais non confirmée.
  let invite: string
  try {
    invite = await inviter(appelant.admin, FONCTION, email)
  } catch (erreur) {
    // Adresse encore confirmée : l'étape 5 n'a pas eu l'effet attendu.
    if (erreur instanceof ErreurFonction && erreur.code === 'adresse_deja_utilisee') {
      consigner(FONCTION, 'adresse_encore_confirmee')
      throw new ErreurFonction(500, 'invitation_non_envoyee')
    }
    throw erreur
  }
  if (invite !== cible) {
    consigner(FONCTION, 'utilisateur_different')
    throw new ErreurFonction(500, 'erreur_interne')
  }
}

export default servir({
  nom: FONCTION,
  schema: schemaCorrigerAdresse,
  action: corrigerAdresse,
})
