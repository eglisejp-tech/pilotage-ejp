import { EvenementsAConfirmer } from '@/features/cette-semaine/EvenementsAConfirmer'
import { useEvenementsAConfirmer } from '@/features/cette-semaine/useEvenementsAConfirmer'

/** Lit les événements à confirmer (`useEvenementsAConfirmer`) et les montre. */
export function EvenementsAConfirmerConnecte() {
  return <EvenementsAConfirmer etat={useEvenementsAConfirmer()} />
}
