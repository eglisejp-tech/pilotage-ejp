import { useSearchParams } from 'react-router'
import { ApercuBlocSignalements } from '@/features/signalement/apercu/ApercuBlocSignalements'
import {
  attendre,
  ECHEC_CONNEXION,
  lireVueApercu,
  MES_SIGNALEMENTS_EXEMPLE,
  MES_SIGNALEMENTS_LIEN_LONG,
  refusDeLaBase,
  refuseParLaBase,
} from '@/features/signalement/apercu/exemples'
import type { ContenuMesSignalements } from '@/features/signalement/MesSignalements'
import { PanneauSignalement } from '@/features/signalement/PanneauSignalement'
import { lireEcran } from '@/features/signalement/schemas'
import type { Signalement } from '@/features/signalement/schemas'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const fermer = () => undefined
const reessayer = () => undefined
const COMPTE_EXEMPLE = 'Ministère Communication'

/**
 * Aperçu de développement des signalements (lot E8, T39), sans base : les vrais écrans, avec des
 * données d'exemple et des envois simulés. Adresse : /apercu/signalements.
 * - `?profil=ministere` (ou sans profil) : « Signaler une difficulté » ; `ecran=<code>` remplit
 *   la ligne « Écran concerné » (un code inconnu devient « autre ») ; `vue=formulaire` (avec
 *   « Vos derniers signalements »), `premier-usage` (rien sous le formulaire), `liste-probleme`,
 *   `lien-long` (un lien de 90 caractères collé dans le texte et la réponse) ;
 * - `?profil=admin_plateforme` : l'écran Modération avec le bloc « Signalements » ; `vue=bloc`,
 *   `bloc-sans-ouvert` (titre et clos gardés), `bloc-lien-long`, `bloc-vide`, `bloc-chargement`, `bloc-probleme` ;
 * - `?profil=berger`, `conseil` ou `admin_eglise` : « Page non disponible » (ils ne lisent aucun
 *   signalement).
 * `&envoi=echec` simule une connexion perdue à l'envoi. Enregistrée seulement en développement.
 */
export function ApercuSignalements() {
  const [parametres] = useSearchParams()
  const profil = parametres.get('profil')
  const echec = parametres.get('envoi') === 'echec'

  if (profil === 'admin_plateforme') {
    const vue = lireVueApercu(parametres.get('vue'), true)
    return <ApercuBlocSignalements key={vue} vue={vue} echec={echec} />
  }
  if (profil !== null && profil !== 'ministere') return <PageNonDisponible />

  const vue = lireVueApercu(parametres.get('vue'), false)
  const ecran = lireEcran(parametres.get('ecran'))
  const envoyer = async ({ texte }: Signalement) => {
    await attendre()
    if (echec) throw ECHEC_CONNEXION
    if (refuseParLaBase(texte)) throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles)
  }
  let mesSignalements: ContenuMesSignalements
  if (vue === 'liste-probleme') mesSignalements = { etat: 'probleme', reessayer }
  else if (vue === 'premier-usage') mesSignalements = { etat: 'liste', signalements: [] }
  else if (vue === 'lien-long')
    mesSignalements = { etat: 'liste', signalements: MES_SIGNALEMENTS_LIEN_LONG }
  else mesSignalements = { etat: 'liste', signalements: MES_SIGNALEMENTS_EXEMPLE }

  return (
    <PanneauSignalement
      key={`${vue}-${ecran}`}
      ecran={ecran}
      envoyer={envoyer}
      mesSignalements={mesSignalements}
      onFermer={fermer}
      surtitre={COMPTE_EXEMPLE}
    />
  )
}
