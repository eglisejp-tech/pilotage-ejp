import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  /** Refus de la base, tel quel, ou la phrase de connexion ; `null` : rien à dire. */
  refus: string | null
}

/**
 * Refus de « Créer » (`role="alert"`), à poser sous le bouton qui l'a provoqué (LISEZMOI, « Erreur
 * de formulaire ») : sous « Créer ces 6 indicateurs » sur l'écran d'un ministère, sous la ligne du
 * ministère dans le tableau ou la liste. Un « Créer » est un clic : aucune valeur ne se perd.
 */
export function RefusCreation({ refus }: Props) {
  if (refus === null) return null
  return (
    <div className="mt-3 max-w-prose">
      <ErreurFormulaire message={refus} />
    </div>
  )
}
