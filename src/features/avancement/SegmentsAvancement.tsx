import type { Etape } from '@/features/avancement/etapes'
import { statutDe } from '@/features/avancement/resumer'
import type { StatutEtape } from '@/features/avancement/resumer'

const STYLES: Record<StatutEtape, string> = {
  'en-ligne': 'bg-encre',
  'en-partie': 'border-2 border-encre',
  'a-venir': 'border border-dashed border-encre-3',
}

type Proprietes = { etapes: readonly Etape[]; anime: boolean }

/** Une case par étape, décorative : le texte à côté dit la même chose. */
export function SegmentsAvancement({ etapes, anime }: Proprietes) {
  return (
    <div aria-hidden="true" className="flex items-center gap-1">
      {etapes.map((etape, rang) => {
        const statut = statutDe(etape)
        const remplit = anime && statut === 'en-ligne'
        return (
          <span
            key={etape.numero}
            data-statut={statut}
            className={`block h-1.5 w-3 min-[600px]:h-2 min-[600px]:w-5 ${STYLES[statut]} ${
              remplit ? 'origin-left animate-remplir' : ''
            }`}
            style={remplit ? { animationDelay: `${rang * 60}ms` } : undefined}
          />
        )
      })}
    </div>
  )
}
