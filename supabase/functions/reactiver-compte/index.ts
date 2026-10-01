// reactiver-compte (BRIEF, section 8, « Les Edge Functions ») : l'administration de l'église, en
// aal2, lève le bannissement dans Auth, puis la base remet desactive_le à null sur le compte et,
// pour un compte de ministère, sur son ministère (la période d'arrêt compte alors comme active),
// et écrit le journal compte_reactive. Un compte qui n'est pas désactivé est refusé.
import { appelerBase } from '../_shared/base.ts'
import { consigner, ErreurFonction } from '../_shared/http.ts'
import { schemaCibleCompte } from '../_shared/schemas.ts'
import { servir } from '../_shared/servir.ts'

const FONCTION = 'reactiver-compte'
// Même durée que desactiver-compte, pour rebannir si la base refuse.
const DUREE_BANNISSEMENT = '876000h'

export default servir({
  nom: FONCTION,
  schema: schemaCibleCompte,
  async action({ user_id: cible }, appelant) {
    // 1. Contrôles sans écriture : compte existant, désactivé, autre que l'appelant, sans
    // conflit (un seul berger actif, un seul compte actif par ministère).
    await appelerBase(appelant.admin, FONCTION, 'serveur_controler_reactivation', {
      p_appelant: appelant.id,
      p_user_id: cible,
    })

    // 2. Levée du bannissement dans Auth.
    const { error } = await appelant.admin.auth.admin.updateUserById(cible, {
      ban_duration: 'none',
    })
    if (error) {
      consigner(FONCTION, 'levee_bannissement', error.code)
      throw new ErreurFonction(500, 'erreur_interne')
    }

    // 3. Réactivation et journal, au nom de l'appelant.
    try {
      await appelerBase(appelant.admin, FONCTION, 'serveur_reactiver_compte', {
        p_appelant: appelant.id,
        p_user_id: cible,
      })
    } catch (erreur) {
      // Le compte est rebanni s'il est resté désactivé en base.
      const { data, error: erreurLecture } = await appelant.admin
        .from('compte')
        .select('desactive_le')
        .eq('user_id', cible)
        .maybeSingle()
      const resteDesactive = !erreurLecture && data !== null && data.desactive_le !== null
      if (resteDesactive) {
        const { error: erreurBannissement } = await appelant.admin.auth.admin.updateUserById(
          cible,
          {
            ban_duration: DUREE_BANNISSEMENT,
          },
        )
        if (erreurBannissement) consigner(FONCTION, 'nouveau_bannissement', erreurBannissement.code)
      } else if (erreurLecture) {
        consigner(FONCTION, 'lecture_compte_cible', erreurLecture.code)
      }
      throw erreur
    }
  },
})
