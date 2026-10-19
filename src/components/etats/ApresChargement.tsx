import type { ReactNode } from 'react'
import { Arrivee } from '@/components/etats/Arrivee'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'

interface Props {
  /** Vrai pendant la lecture du bloc ou de l'écran. */
  enChargement: boolean
  /** L'attente : l'indicateur (après 300 ms) et ses places réservées. */
  indicateur: ReactNode
  /** Ce qui suit la lecture : l'erreur, l'état vide ou le contenu. */
  children: ReactNode
}

/**
 * Bloc ou écran qui passe de son chargement à la suite selon la règle de temps de T65 : rien
 * pendant 300 ms (l'indicateur s'en charge), l'indicateur au moins 600 ms une fois montré, puis
 * la suite en fondu de 180 ms, à la place de l'indicateur. Le composant reste monté d'un état à
 * l'autre : c'est lui qui garde le temps.
 */
export function ApresChargement({ enChargement, indicateur, children }: Props) {
  const { attente, fondu } = useAttenteChargement(enChargement)
  if (attente) return indicateur
  return <Arrivee fondu={fondu}>{children}</Arrivee>
}
