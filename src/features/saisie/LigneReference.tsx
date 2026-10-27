import { libelleReference, referenceEpelee } from '@/features/saisie/textes'

interface Props {
  reference: string
  /** Écran d'EJP Tech : « Référence : » au lieu de « Référence pour EJP Tech : ». */
  ecranEjpTech?: boolean
}

/**
 * Ligne de référence d'un échec technique (T76), sous sa phrase, plus petite. La référence se lit
 * d'un coup d'œil (« K7Q4MX ») et s'épelle au lecteur d'écran (« K 7 Q 4 M X »).
 */
export function LigneReference({ reference, ecranEjpTech = false }: Props) {
  return (
    <span className="mt-1 block text-detail">
      {libelleReference(ecranEjpTech)}
      <span aria-hidden="true">{reference}</span>
      <span className="sr-only">{referenceEpelee(reference)}</span>
    </span>
  )
}
