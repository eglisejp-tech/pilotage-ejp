// relancer-invitation (BRIEF, section 8, « Les Edge Functions ») : l'administration de l'église,
// en aal2, renvoie l'invitation d'un compte actif dont l'adresse n'est pas encore confirmée, puis
// la base écrit le journal invitation_relancee. Une adresse déjà confirmée est refusée
// (invitation_deja_acceptee) : ce compte passe par « Mot de passe oublié ».
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { inviter } from '../_shared/invitation.ts'
import { schemaCibleCompte } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'relancer-invitation'

export default servir({
  nom: FONCTION,
  schema: schemaCibleCompte,
  async action({ user_id: cible }, appelant) {
    // 1. Contrôles sans écriture : compte existant, actif, autre que l'appelant, invitation en
    // attente.
    await appelerBase(appelant, FONCTION, 'serveur_controler_relance', { p_user_id: cible })

    // 2. Adresse du compte, lue dans Auth seulement (aucune table publique ne la garde).
    const { data, error } = await appelant.admin.auth.admin.getUserById(cible)
    const email = data.user?.email
    if (error || !email) {
      consigner(FONCTION, 'lecture_utilisateur', error?.code)
      throw new ErreurFonction(500, 'erreur_interne')
    }

    // 3. Nouvel envoi : Auth renvoie l'invitation d'une adresse pas encore confirmée.
    let invite: string
    try {
      invite = await inviter(appelant.admin, FONCTION, email)
    } catch (erreur) {
      // Adresse confirmée entre le contrôle et l'envoi.
      if (erreur instanceof ErreurFonction && erreur.code === 'adresse_deja_utilisee') {
        throw new ErreurFonction(409, 'invitation_deja_acceptee')
      }
      throw erreur
    }
    if (invite !== cible) {
      consigner(FONCTION, 'utilisateur_different')
      throw new ErreurFonction(500, 'erreur_interne')
    }

    // 4. Journal, au nom de l'appelant.
    await appelerBase(appelant, FONCTION, 'serveur_relancer_invitation', { p_user_id: cible })
  },
})
