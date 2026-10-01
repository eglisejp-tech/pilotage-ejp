import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { ContexteSession } from '@/features/session/contexte'
import { EcranChargement } from '@/features/session/EcranChargement'
import { EcranErreurSession } from '@/features/session/EcranErreurSession'
import { destination } from '@/features/session/decisions'
import type { Zone } from '@/features/session/decisions'
import { useMotDePasseAChoisir } from '@/features/session/motDePasseAChoisir'
import { useEtatSession } from '@/features/session/useEtatSession'

type Proprietes = {
  zone: Zone
  /** Mise en page autour des écrans de la zone ; par défaut, les écrans seuls. */
  children?: ReactNode
}

/**
 * Garde d'une zone d'adresses (BRIEF section 8, règle 7). Tant que l'état n'est pas lu, rien
 * d'autre ne s'affiche ni ne se charge ; ensuite, redirection ou affichage des écrans enfants.
 * Le routage ne remplace pas la RLS : il évite seulement d'afficher un écran interdit.
 */
export function Garde({ zone, children }: Proprietes) {
  const requete = useEtatSession()
  const { pathname, search, hash } = useLocation()
  const motDePasseAChoisir = useMotDePasseAChoisir()

  // Un nouvel essai en arrière-plan qui échoue ne cache pas un état déjà connu.
  if (requete.data === undefined) {
    if (requete.isError) {
      return (
        <EcranErreurSession onRetry={() => void requete.refetch()} enCours={requete.isFetching} />
      )
    }
    return <EcranChargement />
  }

  const vers = destination(requete.data, zone, {
    adresse: `${pathname}${search}${hash}`,
    retour: new URLSearchParams(search).get('retour'),
    motDePasseAChoisir: motDePasseAChoisir !== null,
  })
  if (vers !== null) return <Navigate to={vers} replace />

  return (
    <ContexteSession.Provider value={requete.data}>
      {children ?? <Outlet />}
    </ContexteSession.Provider>
  )
}
