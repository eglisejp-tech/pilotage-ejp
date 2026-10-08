import { EtatEtape } from '@/features/avancement/EtatEtape'
import type { Etape } from '@/features/avancement/etapes'
import { statutDe } from '@/features/avancement/resumer'
import type { StatutEtape } from '@/features/avancement/resumer'

const CARRES: Record<StatutEtape, string> = {
  'en-ligne': 'bg-encre text-papier',
  'en-partie': 'border-2 border-encre text-encre',
  'a-venir': 'border border-dashed border-encre-3 text-encre-3',
}

type Proprietes = { etapes: readonly Etape[]; numeroProchaine: number | null }

export function ListeEtapes({ etapes, numeroProchaine }: Proprietes) {
  return (
    <ol className="grid gap-x-6 gap-y-4 min-[600px]:grid-cols-2 lg:grid-cols-8">
      {etapes.map((etape) => (
        <li
          key={etape.numero}
          aria-current={etape.numero === numeroProchaine ? 'step' : undefined}
          className="flex gap-3 lg:flex-col"
        >
          <span
            className={`flex size-8 shrink-0 items-center justify-center font-chiffres text-sm font-extrabold ${CARRES[statutDe(etape)]}`}
          >
            {etape.numero}
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-encre">{etape.titre}</p>
            <EtatEtape etape={etape} />
          </div>
        </li>
      ))}
    </ol>
  )
}
