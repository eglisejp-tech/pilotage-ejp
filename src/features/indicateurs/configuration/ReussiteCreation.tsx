import { MessageReussite } from '@/features/saisie/MessageReussite'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'

interface Props {
  creation: Pick<CreationPrevus, 'reussite' | 'envoi'>
}

/**
 * Message de réussite de « Créer » sous la phrase de l'écran : pendant 6 secondes
 * (`role="status"`, toujours présent pour être annoncé). Il reste là quand le bloc des prévus ou la
 * ligne du tableau a disparu, puisque la création l'a rendu inutile. Le refus de la base, lui,
 * s'affiche sous le bouton qui l'a provoqué (`RefusCreation`).
 */
export function ReussiteCreation({ creation }: Props) {
  return (
    <div className="[&_p]:mt-4">
      <MessageReussite message={creation.reussite} envoi={creation.envoi} />
    </div>
  )
}
