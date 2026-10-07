import { libelleEtat } from '@/features/comptes/textes'
import type { EtatLigne } from '@/features/comptes/types'
import type { DateIso } from '@/lib/metier/dates'
import { cn } from '@/lib/utils'

interface Props {
  etat: EtatLigne
  desactiveLe: DateIso | null
}

const COULEURS: Record<EtatLigne, { texte: string; carre: string }> = {
  activee: { texte: 'text-bien', carre: 'bg-bien' },
  a_activer: { texte: 'text-attention', carre: 'bg-attention' },
  invitation_envoyee: { texte: 'text-attention', carre: 'bg-attention' },
  desactive: { texte: 'text-encre-3', carre: 'bg-encre-3' },
  sans_compte: { texte: 'text-encre-3', carre: 'bg-encre-3' },
}

/**
 * Colonne « Double authentification » (maquette 13) : un carré de 8 px et le mot, jamais la
 * couleur seule. Vert pour « Activée », orange pour « Invitation envoyée » et « À activer »,
 * gris pour « Désactivé le 12 oct. » et un ministère sans compte.
 */
export function EtatDoubleAuthentification({ etat, desactiveLe }: Props) {
  const couleurs = COULEURS[etat]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-semibold whitespace-nowrap',
        couleurs.texte,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0', couleurs.carre)} />
      {libelleEtat(etat, desactiveLe)}
    </span>
  )
}
