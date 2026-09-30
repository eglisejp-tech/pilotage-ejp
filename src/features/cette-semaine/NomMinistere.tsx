import { Link } from 'react-router'
import type { LigneMinistere } from './types'

interface Props {
  ministere: LigneMinistere
}

/** Nom d'un ministère, lien vers sa fiche quand le profil peut l'ouvrir. */
export function NomMinistere({ ministere }: Props) {
  if (!ministere.href) return <>{ministere.nom}</>
  return (
    <Link
      to={ministere.href}
      className="-my-3 inline-flex min-h-cible min-w-cible items-center underline decoration-encre-3 underline-offset-4 hover:decoration-encre"
    >
      {ministere.nom}
    </Link>
  )
}
