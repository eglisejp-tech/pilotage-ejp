import { useSearchParams } from 'react-router'
import { useCompteConnecte } from '@/features/session/contexte'
import { lireEcran } from '@/features/signalement/schemas'
import { SaisieSignalement } from '@/features/signalement/SaisieSignalement'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

/**
 * `/signaler` (`?ecran=<code>`, T39) : « Signaler une difficulté », pour un compte de ministère
 * seulement. `PageApplication` refuse déjà les autres profils, sans requête ; la page le vérifie
 * encore avant toute lecture (le berger, le conseil, l'administration et EJP Tech ne signalent
 * pas). Un code d'écran inconnu devient « autre ». Le titre vient du panneau.
 */
export function PageSignalement() {
  const compte = useCompteConnecte()
  const [parametres] = useSearchParams()
  if (compte.type !== 'ministere' || compte.ministereId === null) return <PageNonDisponible />
  const ecran = lireEcran(parametres.get('ecran'))
  // Un autre écran dans l'adresse : un formulaire neuf, avec sa ligne « Écran concerné ».
  return (
    <SaisieSignalement
      key={ecran}
      ministereId={compte.ministereId}
      libelleCompte={compte.libelle}
      ecran={ecran}
    />
  )
}
