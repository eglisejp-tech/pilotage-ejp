// creer-compte (BRIEF, section 8, « Les Edge Functions ») : l'administration de l'église, en
// aal2, crée un compte de ministère (nouveau ministère ou ministère existant sans compte actif),
// du berger, du conseil ou d'EJP Tech ; jamais d'administration de l'église.
// Ordre : contrôles en base, invitation dans Auth, puis ministère, compte et journal en une
// transaction. Si la base refuse après l'invitation, l'utilisateur Auth créé est supprimé.
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { schemaCreerCompte } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'creer-compte'

// Adresse de l'application (variable URL_APPLICATION des secrets des fonctions). Sans elle,
// Auth renvoie vers son Site URL, qui est déjà l'adresse de l'application.
function adresseAcces(): string | undefined {
  const deno = (globalThis as { Deno?: { env: { get(nom: string): string | undefined } } }).Deno
  const base = deno?.env.get('URL_APPLICATION')
  if (!base) return undefined
  try {
    const url = new URL('/acces', base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export default servir({
  nom: FONCTION,
  schema: schemaCreerCompte,
  async action(demande, appelant) {
    const ministere = demande.type === 'ministere' ? demande.ministere : undefined
    const ministereId = ministere && 'id' in ministere ? ministere.id : null
    const ministereNom = ministere && 'nom' in ministere ? ministere.nom : null
    const description = ministere && 'nom' in ministere ? (ministere.description ?? null) : null

    // 1. Contrôles sans écriture : rien n'est envoyé si la création doit être refusée.
    await appelerBase(appelant.admin, FONCTION, 'serveur_controler_creation_compte', {
      p_appelant: appelant.id,
      p_email: demande.email,
      p_type: demande.type,
      p_ministere_id: ministereId,
      p_ministere_nom: ministereNom,
    })

    // 2. Invitation par email (lien vers /acces).
    const redirectTo = adresseAcces()
    const { data, error } = await appelant.admin.auth.admin.inviteUserByEmail(
      demande.email,
      redirectTo ? { redirectTo } : undefined,
    )
    if (error || !data.user) {
      if (error?.code === 'email_exists') throw new ErreurFonction(409, 'adresse_deja_utilisee')
      consigner(FONCTION, 'invitation', error?.code)
      throw new ErreurFonction(500, 'invitation_non_envoyee')
    }
    const utilisateur = data.user.id

    // 3. Ministère, compte et journal, au nom de l'appelant.
    try {
      await appelerBase(appelant.admin, FONCTION, 'serveur_creer_compte', {
        p_appelant: appelant.id,
        p_user_id: utilisateur,
        p_type: demande.type,
        p_ministere_id: ministereId,
        p_ministere_nom: ministereNom,
        p_ministere_description: description,
      })
    } catch (erreur) {
      // Un utilisateur qui a déjà un compte n'est jamais supprimé (la clé étrangère de compte
      // l'empêcherait de toute façon) ; sinon on retire celui que l'invitation vient de créer.
      const dejaUtilisee =
        erreur instanceof ErreurFonction && erreur.code === 'adresse_deja_utilisee'
      if (!dejaUtilisee) {
        const { error: erreurSuppression } = await appelant.admin.auth.admin.deleteUser(utilisateur)
        if (erreurSuppression)
          consigner(FONCTION, 'suppression_utilisateur', erreurSuppression.code)
      }
      throw erreur
    }
  },
})
