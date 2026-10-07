import { useCallback } from 'react'
import { useNavigate } from 'react-router'

/**
 * « Retour », Échap et le fond du panneau ramènent à la page d'origine (BRIEF, section 9) : la
 * page précédente de l'application si la saisie a été ouverte depuis elle, sinon l'accueil.
 * React Router numérote ses entrées d'historique (`idx`) : 0 veut dire une saisie ouverte
 * directement par son adresse.
 */
export function useRetourSaisie(): () => void {
  const naviguer = useNavigate()
  return useCallback(() => {
    const etat: unknown = window.history.state
    const rang =
      typeof etat === 'object' && etat !== null && 'idx' in etat && typeof etat.idx === 'number'
        ? etat.idx
        : 0
    if (rang > 0) void naviguer(-1)
    else void naviguer('/')
  }, [naviguer])
}
