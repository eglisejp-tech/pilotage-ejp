import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  /** Refus de la base, tel quel, ou la phrase de connexion ; `null` : rien à dire. */
  refus: string | null
  /** Référence d'un échec technique (T76) : « Référence : K7Q4MX », écran d'EJP Tech. */
  reference?: string | null
}

/**
 * Refus de « Créer » (`role="alert"`), à poser sous le bouton qui l'a provoqué (LISEZMOI, « Erreur
 * de formulaire ») : sous « Créer ces 6 indicateurs » sur l'écran d'un ministère, sous la ligne du
 * ministère dans le tableau ou la liste. Un « Créer » est un clic : aucune valeur ne se perd.
 */
export function RefusCreation({ refus, reference = null }: Props) {
  if (refus === null) return null
  return (
    <div className="mt-3 max-w-prose">
      <ErreurFormulaire message={refus} reference={reference} ecranEjpTech />
    </div>
  )
}
