import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ErreurRacine } from '@/app/ErreurRacine'

interface Props {
  children: ReactNode
}

interface Etat {
  enErreur: boolean
}

/**
 * Limite d'erreur autour de toute l'application (m241). L'`errorElement` du routeur ne voit que
 * les erreurs des écrans : une erreur de rendu au-dessus de lui (bandeau hors ligne, fournisseur
 * des requêtes, routeur lui-même) laissait une page blanche. Elle affiche alors `ErreurRacine`. Une
 * limite d'erreur de React ne s'écrit qu'en classe.
 */
export class LimiteErreurRacine extends Component<Props, Etat> {
  override state: Etat = { enErreur: false }

  static getDerivedStateFromError(): Etat {
    return { enErreur: true }
  }

  override componentDidCatch(erreur: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(erreur, info.componentStack)
  }

  override render() {
    return this.state.enErreur ? <ErreurRacine /> : this.props.children
  }
}
