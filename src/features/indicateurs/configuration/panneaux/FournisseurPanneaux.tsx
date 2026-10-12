import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ContextePanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import type {
  ControleurPanneaux,
  PanneauOuvert,
} from '@/features/indicateurs/configuration/panneaux/contexte'
import type { SourceCalcul } from '@/features/indicateurs/configuration/panneaux/apercu'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'
import type { TypeCompte } from '@/lib/base'

interface Props {
  ecritures: EcrituresIndicateurs
  ministere: { id: string; nom: string }
  profil: TypeCompte
  sources: readonly SourceCalcul[]
  calculs: readonly { id: string; libelle: string }[]
  children: (controleur: ControleurPanneaux) => ReactNode
}

/**
 * Garde l'état des panneaux d'un ministère : le panneau ou la fenêtre ouvert, et le message de
 * réussite. Les boutons des lignes et des actions l'ouvrent, l'écran l'affiche : un seul
 * panneau à la fois, et le message reste là quand la ligne qui l'a provoqué a disparu (retrait).
 */
export function FournisseurPanneaux({
  ecritures,
  ministere,
  profil,
  sources,
  calculs,
  children,
}: Props) {
  const [panneau, setPanneau] = useState<PanneauOuvert | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  const ouvrir = useCallback((ouvert: PanneauOuvert) => {
    setReussite(null)
    setPanneau(ouvert)
  }, [])
  const fermer = useCallback(() => setPanneau(null), [])
  const terminer = useCallback((message: string) => {
    setPanneau(null)
    setReussite(message)
    setEnvoi((precedent) => precedent + 1)
  }, [])

  const controleur = useMemo(
    (): ControleurPanneaux => ({
      ecritures,
      ministere,
      profil,
      sources,
      calculs,
      panneau,
      ouvrir,
      fermer,
      terminer,
      reussite,
      envoi,
    }),
    [
      ecritures,
      ministere,
      profil,
      sources,
      calculs,
      panneau,
      ouvrir,
      fermer,
      terminer,
      reussite,
      envoi,
    ],
  )

  return (
    <ContextePanneaux.Provider value={controleur}>{children(controleur)}</ContextePanneaux.Provider>
  )
}
