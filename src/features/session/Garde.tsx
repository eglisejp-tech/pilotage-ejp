import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Arrivee } from '@/components/etats/Arrivee'
import { useOuverture } from '@/components/etats/ouverture'
import { DUREE_MIN_INDICATEUR_MS, DUREE_OUVERTURE_MS } from '@/components/etats/tempsChargement'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'
import { useMoinsDAnimations } from '@/components/etats/useMoinsDAnimations'
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
 * L'attente suit la règle de temps de T65 : rien pendant 300 ms, l'ouverture (la première fois)
 * ou la flamme au moins 600 ms une fois montrée, puis les écrans en fondu.
 */
export function Garde({ zone, children }: Proprietes) {
  const requete = useEtatSession()
  const { pathname, search, hash } = useLocation()
  const motDePasseAChoisir = useMotDePasseAChoisir()
  const enChargement = requete.data === undefined && !requete.isError
  const ouverture = useOuverture(enChargement)
  const moinsDAnimations = useMoinsDAnimations()
  // Une ouverture commencée va jusqu'au bout (1,2 s) ; sinon, 600 ms au moins.
  const { attente, fondu } = useAttenteChargement(
    enChargement,
    ouverture && !moinsDAnimations ? DUREE_OUVERTURE_MS : DUREE_MIN_INDICATEUR_MS,
  )

  if (attente) return <EcranChargement ouverture={ouverture} />

  // Un nouvel essai en arrière-plan qui échoue ne cache pas un état déjà connu.
  if (requete.data === undefined) {
    return (
      <EcranErreurSession
        onRetry={() => void requete.refetch()}
        enCours={requete.isFetching}
        erreur={requete.error}
      />
    )
  }

  const vers = destination(requete.data, zone, {
    adresse: `${pathname}${search}${hash}`,
    retour: new URLSearchParams(search).get('retour'),
    motDePasseAChoisir: motDePasseAChoisir !== null,
  })
  if (vers !== null) return <Navigate to={vers} replace />

  return (
    <ContexteSession.Provider value={requete.data}>
      <Arrivee fondu={fondu}>{children ?? <Outlet />}</Arrivee>
    </ContexteSession.Provider>
  )
}
