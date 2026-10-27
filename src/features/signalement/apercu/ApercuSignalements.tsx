import { useSearchParams } from 'react-router'
import { ApercuBlocSignalements } from '@/features/signalement/apercu/ApercuBlocSignalements'
import { ApercuMesSignalements } from '@/features/signalement/apercu/ApercuMesSignalements'
import {
  attendre,
  ECHEC_CONNEXION,
  lireVueApercu,
  refusDeLaBase,
  refuseParLaBase,
} from '@/features/signalement/apercu/exemples'
import { PanneauSignalement } from '@/features/signalement/PanneauSignalement'
import { lireEcran } from '@/features/signalement/schemas'
import type { Signalement } from '@/features/signalement/schemas'
import { MESSAGES_BASE_SIGNALEMENT } from '@/features/signalement/textes'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const fermer = () => undefined
const COMPTE_EXEMPLE = 'Ministère Communication'

/**
 * Aperçu de développement des signalements (lot E8, T39) et de leur suivi (T77), sans base : les
 * vrais écrans, avec des données d'exemple et des gestes simulés. Adresse : /apercu/signalements.
 * - `?profil=ministere` (ou sans profil) : « Signaler une difficulté » (`vue=formulaire`) ;
 *   `ecran=<code>` remplit la ligne « Écran concerné » (un code inconnu devient « autre ») ;
 *   « Mes signalements » de Coordination : `vue=suivi`, `suivi-vide`, `suivi-clos` (seulement des
 *   clos), `suivi-chargement`, `suivi-probleme`, `suivi-lien-long` (un lien de 90 caractères) ;
 * - `?profil=admin_plateforme` : l'écran Modération avec le bloc « Signalements » ; `vue=bloc`,
 *   `bloc-sans-ouvert` (rien à traiter, attente et clos gardés), `bloc-lien-long`, `bloc-vide`,
 *   `bloc-chargement`, `bloc-probleme` ;
 * - `?profil=berger`, `conseil` ou `admin_eglise` : « Page non disponible » (ils ne lisent aucun
 *   signalement).
 * `&envoi=echec` simule une connexion perdue ; `&envoi=clos` (ministère) et `&envoi=deja` (EJP
 * Tech), un signalement qui a changé entre-temps. Enregistrée seulement en développement.
 */
export function ApercuSignalements() {
  const [parametres] = useSearchParams()
  const profil = parametres.get('profil')
  const envoi = parametres.get('envoi')

  if (profil === 'admin_plateforme') {
    const vue = lireVueApercu(parametres.get('vue'), true)
    return <ApercuBlocSignalements key={`${vue}-${envoi}`} vue={vue} envoi={envoi} />
  }
  if (profil !== null && profil !== 'ministere') return <PageNonDisponible />

  const vue = lireVueApercu(parametres.get('vue'), false)
  if (vue !== 'formulaire') {
    return <ApercuMesSignalements key={`${vue}-${envoi}`} vue={vue} envoi={envoi} />
  }
  const ecran = lireEcran(parametres.get('ecran'))
  const envoyer = async ({ texte }: Signalement) => {
    await attendre()
    if (envoi === 'echec') throw ECHEC_CONNEXION
    if (refuseParLaBase(texte)) throw refusDeLaBase(MESSAGES_BASE_SIGNALEMENT.donneesPersonnelles)
  }

  return (
    <PanneauSignalement
      key={ecran}
      ecran={ecran}
      envoyer={envoyer}
      onFermer={fermer}
      surtitre={COMPTE_EXEMPLE}
    />
  )
}
