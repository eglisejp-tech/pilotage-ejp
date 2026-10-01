// desactiver-compte (BRIEF, section 8, « Les Edge Functions ») : l'administration de l'église, en
// aal2, bannit un compte dans Auth, puis la base pose desactive_le sur le compte (et sur son
// ministère), supprime ses sessions et écrit le journal. Toutes les données sont gardées ; le
// compte de l'appelant est refusé.
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { schemaCibleCompte } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'desactiver-compte'
// Bannissement sans fin pratique (cent ans) ; reactiver-compte le lèvera avec 'none'.
const DUREE_BANNISSEMENT = '876000h'

export default servir({
  nom: FONCTION,
  schema: schemaCibleCompte,
  async action({ user_id: cible }, appelant) {
    // 1. Contrôles sans écriture : compte existant, actif, autre que l'appelant.
    await appelerBase(appelant.admin, FONCTION, 'serveur_controler_cible', {
      p_appelant: appelant.id,
      p_user_id: cible,
    })

    // 2. Bannissement dans Auth : plus de connexion ni de rafraîchissement de session.
    const { error } = await appelant.admin.auth.admin.updateUserById(cible, {
      ban_duration: DUREE_BANNISSEMENT,
    })
    if (error) {
      consigner(FONCTION, 'bannissement', error.code)
      throw new ErreurFonction(500, 'erreur_interne')
    }

    // 3. Désactivation, sessions supprimées et journal, au nom de l'appelant.
    try {
      await appelerBase(appelant.admin, FONCTION, 'serveur_desactiver_compte', {
        p_appelant: appelant.id,
        p_user_id: cible,
      })
    } catch (erreur) {
      // Le bannissement n'est levé que si le compte est resté actif en base.
      const { data, error: erreurLecture } = await appelant.admin
        .from('compte')
        .select('desactive_le')
        .eq('user_id', cible)
        .maybeSingle()
      const resteActif = !erreurLecture && data !== null && data.desactive_le === null
      if (resteActif) {
        const { error: erreurLevee } = await appelant.admin.auth.admin.updateUserById(cible, {
          ban_duration: 'none',
        })
        if (erreurLevee) consigner(FONCTION, 'levee_bannissement', erreurLevee.code)
      } else if (erreurLecture) {
        consigner(FONCTION, 'lecture_compte_cible', erreurLecture.code)
      }
      throw erreur
    }
  },
})
