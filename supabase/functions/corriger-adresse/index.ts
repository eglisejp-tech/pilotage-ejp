// corriger-adresse (décision T74 ; BRIEF, section 8, « Les Edge Functions ») : EJP Tech (T60), en
// aal2, remplace l'adresse d'un compte jamais activé (« Invitation envoyée » ou « À activer »),
// de tout type de l'écran 13, et envoie l'invitation à la nouvelle adresse. Le ministère, ses
// indicateurs et son historique ne bougent pas. L'adresse n'est gardée que dans Auth.
// Ordre :
//   1. contrôles en base, sans écriture : compte actif, jamais activé, autre que l'appelant et que
//      l'administration de l'église, adresse libre ;
//   2. Auth : nouvelle adresse et mot de passe aléatoire (celui qu'aurait choisi la personne qui a
//      reçu l'invitation par erreur ne sert plus) ; Auth efface les liens déjà envoyés ;
//   3. base : adresse rendue non confirmée, sessions supprimées, journal adresse_corrigee (sans
//      adresse) ;
//   4. facteurs non vérifiés supprimés (activation commencée depuis l'ancienne adresse) ;
//   5. invitation vers la nouvelle adresse.
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

  // 2. Nouvelle adresse et mot de passe aléatoire dans Auth.
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

  // 3. Adresse non confirmée, sessions supprimées et journal, au nom de l'appelant.
  await appelerBase(appelant, FONCTION, 'serveur_corriger_adresse', parametres)

  // 4. Facteurs non vérifiés (un compte jamais activé n'en a pas d'autre).
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

  // 5. Invitation vers la nouvelle adresse, désormais non confirmée.
  let invite: string
  try {
    invite = await inviter(appelant.admin, FONCTION, email)
  } catch (erreur) {
    // Adresse encore confirmée : l'étape 3 n'a pas eu l'effet attendu.
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
