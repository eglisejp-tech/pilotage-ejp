import { Link } from 'react-router'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'

interface Props {
  ministere: Pick<LigneListeMinistere, 'nom' | 'prevusAChoisir'>
}

/**
 * Repère d'EJP Tech sous le nom d'un ministère (T72) : aucune liste d'indicateurs prévus n'est
 * choisie pour lui. Le lien mène à `/indicateurs/:id`, où se fait le choix ; son nom accessible dit
 * quel ministère. Rien pour un ministère qui a sa liste, ni pour les autres profils.
 */
export function RepereAChoisir({ ministere }: Props) {
  if (ministere.prevusAChoisir === null) return null
  return (
    <Link
      to={ministere.prevusAChoisir.href}
      className="inline-flex min-h-cible items-center text-sm font-semibold text-encre-2 underline decoration-encre-3 underline-offset-4 hover:decoration-encre"
    >
      {TEXTES_FICHE.liste.prevusAChoisir} <span className="sr-only">pour {ministere.nom}</span>
    </Link>
  )
}
