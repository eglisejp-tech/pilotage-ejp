import { useContext } from 'react'
import { accueil } from '@/features/navigation/profils'
import { ContexteSession } from '@/features/session/contexte'

/** Accueil du compte connecté, ou « / » hors session (la garde décide alors). */
export function useAccueil(): string {
  const etat = useContext(ContexteSession)
  return etat?.statut === 'connecte' ? accueil(etat.compte.type) : '/'
}
