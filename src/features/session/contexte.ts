import { createContext, useContext } from 'react'
import type { EtatSession } from '@/features/session/etat'

/** État vérifié par la garde, transmis aux écrans qu'elle laisse passer. */
export const ContexteSession = createContext<EtatSession | null>(null)

export function useEtatVerifie(): EtatSession {
  const etat = useContext(ContexteSession)
  if (!etat) throw new Error('useEtatVerifie : écran affiché hors de sa garde.')
  return etat
}

/** Compte connecté en aal2, pour les écrans de l'application. */
export function useCompteConnecte() {
  const etat = useEtatVerifie()
  if (etat.statut !== 'connecte') throw new Error('useCompteConnecte : session sans aal2.')
  return etat.compte
}
