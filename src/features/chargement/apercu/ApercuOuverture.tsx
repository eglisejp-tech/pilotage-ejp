import { useSearchParams } from 'react-router'
import { EcranChargement } from '@/features/session/EcranChargement'

/**
 * Aperçu de développement de l'ouverture de l'outil (T65, moment 1), sans base : l'écran de la
 * vérification de la session, tel que la garde le montre. Adresse : /apercu/ouverture ;
 * `?fois=suivante` : une vérification après la première, sans ouverture (la flamme vit tout de
 * suite). L'écran attend sans fin : rien ne vient le remplacer.
 */
export function ApercuOuverture() {
  const [parametres] = useSearchParams()
  return <EcranChargement ouverture={parametres.get('fois') !== 'suivante'} />
}
