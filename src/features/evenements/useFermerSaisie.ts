import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** Page d'origine par défaut des saisies d'événement et de réunion : la fiche du ministère. */
export const ORIGINE_PAR_DEFAUT = '/ma-fiche'

/**
 * Ferme un panneau de saisie : retour à la page d'où il a été ouvert (calendrier de la fiche,
 * accueil), ou à « Ma fiche » quand l'adresse a été ouverte directement (aucune page avant elle
 * dans l'historique de l'application).
 */
export function useFermerSaisie(): () => void {
  const navigate = useNavigate()
  const { key } = useLocation()
  return useCallback(() => {
    if (key === 'default') void navigate(ORIGINE_PAR_DEFAUT, { replace: true })
    else void navigate(-1)
  }, [key, navigate])
}
