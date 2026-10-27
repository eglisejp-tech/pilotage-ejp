import type { ReactNode } from 'react'
import type { Citation, EtapeAffichee } from '@/features/signalement/suivi'
import { TexteSignale } from '@/features/signalement/TexteSignale'
import { TEXTES_SUIVI } from '@/features/signalement/textes'

interface Props {
  etapes: readonly EtapeAffichee[]
  /** EJP Tech : « Masquer » sous chaque texte cité encore lisible. */
  sousCitation?: (citation: Citation) => ReactNode
}

/**
 * Le suivi daté d'un signalement (T77) : une liste, une ligne par étape, du plus ancien au plus
 * récent, chaque date dans un `<time>` (jour de Paris venu de la base). Un texte cité (une
 * réponse) s'écrit entre guillemets ; masqué, en `--encre-3`.
 */
export function SuiviDate({ etapes, sousCitation }: Props) {
  return (
    <ol
      aria-label={TEXTES_SUIVI.suivi}
      className="flex flex-col gap-1.5 text-detail leading-normal"
    >
      {etapes.map((etape) => (
        <li key={etape.cle} className="min-w-0 wrap-anywhere text-encre-2">
          <time dateTime={etape.jour} className="font-semibold text-encre">
            {etape.jourAffiche}
          </time>{' '}
          {etape.libelle}
          {etape.citation ? (
            <>
              {' '}
              «&nbsp;
              <TexteSignale texte={etape.citation.texte} />
              &nbsp;»
            </>
          ) : null}
          {etape.citation && sousCitation ? (
            <span className="block">{sousCitation(etape.citation)}</span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
