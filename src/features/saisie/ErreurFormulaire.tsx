import { LigneReference } from '@/features/saisie/LigneReference'
import { erreurDeConnexion } from '@/features/saisie/textes'
import type { ObjetSaisie } from '@/features/saisie/textes'

interface Props {
  /** Ce qui reste dans le formulaire : « Vos chiffres » ou « Votre saisie ». */
  objet?: ObjetSaisie
  /** Message précis du serveur, à la place de la phrase de connexion. */
  message?: string
  /** Référence d'un échec technique (T76), sur une seconde ligne : null ou absente, rien. */
  reference?: string | null
  /** Écran d'EJP Tech : la référence se dit « Référence : » (T76, conception 4.3). */
  ecranEjpTech?: boolean
}

/**
 * Erreur de formulaire (LISEZMOI, « États ») : sous le bouton d'enregistrement, annoncée
 * (`role="alert"`). Les valeurs restent dans le formulaire et le bouton redevient actif. Un échec
 * technique ajoute sa référence, plus petite, dans le même cadre (T76), épelée au lecteur d'écran.
 */
export function ErreurFormulaire({
  objet = 'chiffres',
  message,
  reference,
  ecranEjpTech = false,
}: Props) {
  return (
    <p
      role="alert"
      className="bg-alerte-fond px-3.5 py-3 text-interface leading-normal text-alerte"
    >
      {message ?? erreurDeConnexion(objet)}
      {reference ? (
        <>
          {/* L'espace sépare la phrase de la référence pour un lecteur d'écran et une copie. */}{' '}
          <LigneReference reference={reference} ecranEjpTech={ecranEjpTech} />
        </>
      ) : null}
    </p>
  )
}
