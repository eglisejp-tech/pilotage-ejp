import type { Etape } from '@/features/avancement/etapes'
import { premierePrevue, statutDe } from '@/features/avancement/resumer'
import { enPartie, prevueLe, prochainePartie } from '@/features/avancement/textesAvancement'

/** L'état d'une étape en mots, jamais par la couleur seule. */
export function EtatEtape({ etape }: { etape: Etape }) {
  const statut = statutDe(etape)
  if (statut === 'en-ligne') {
    return <p className="text-sm font-semibold text-bien">■ En ligne</p>
  }
  if (statut === 'en-partie') {
    const suite = prochainePartie(etape)
    return (
      <p className="text-sm text-encre">
        {enPartie(etape)}
        {suite ? ` ${suite}` : ''}
      </p>
    )
  }
  const premiere = premierePrevue(etape)
  return <p className="text-sm text-encre-3">{premiere ? prevueLe(premiere.date) : 'Prévue'}</p>
}
