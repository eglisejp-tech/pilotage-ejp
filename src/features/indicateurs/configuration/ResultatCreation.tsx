import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'

interface Props {
  creation: Pick<CreationPrevus, 'reussite' | 'envoi' | 'refus'>
}

/**
 * Résultat de « Créer » sous le titre de l'écran : le message de réussite pendant 6 secondes
 * (`role="status"`, toujours présent pour être annoncé), ou le refus de la base tel quel
 * (`role="alert"`). Les valeurs ne se perdent pas : un « Créer » est un clic, sans formulaire.
 */
export function ResultatCreation({ creation }: Props) {
  return (
    <div className="[&_p]:mt-4">
      <MessageReussite message={creation.reussite} envoi={creation.envoi} />
      {creation.refus !== null ? <ErreurFormulaire message={creation.refus} /> : null}
    </div>
  )
}
