import { erreurDeConnexion } from '@/features/saisie/textes'
import type { ObjetSaisie } from '@/features/saisie/textes'

interface Props {
  /** Ce qui reste dans le formulaire : « Vos chiffres » ou « Votre message ». */
  objet?: ObjetSaisie
  /** Message précis du serveur, à la place de la phrase de connexion. */
  message?: string
}

/**
 * Erreur de formulaire (LISEZMOI, « États ») : sous le bouton d'enregistrement, annoncée
 * (`role="alert"`). Les valeurs restent dans le formulaire et le bouton redevient actif.
 */
export function ErreurFormulaire({ objet = 'chiffres', message }: Props) {
  return (
    <p role="alert" className="bg-alerte-fond px-3.5 py-3 text-[15px] leading-normal text-alerte">
      {message ?? erreurDeConnexion(objet)}
    </p>
  )
}
