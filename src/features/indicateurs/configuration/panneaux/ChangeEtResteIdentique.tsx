import { TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'

interface Props {
  change: string
  resteIdentique: string
}

/**
 * Au pied de chaque panneau et de chaque fenêtre : ce que le geste change, et ce qui ne change
 * jamais (les saisies ne se suppriment pas : une valeur saisie garde son sens pour toujours).
 */
export function ChangeEtResteIdentique({ change, resteIdentique }: Props) {
  return (
    <dl className="flex flex-col gap-2 border-t border-filet pt-4 text-[15px] leading-normal">
      <div>
        <dt className="font-semibold">{TEXTES_PANNEAUX.ceQuiChange}</dt>
        <dd className="text-encre-2">{change}</dd>
      </div>
      <div>
        <dt className="font-semibold">{TEXTES_PANNEAUX.ceQuiResteIdentique}</dt>
        <dd className="text-encre-2">{resteIdentique}</dd>
      </div>
    </dl>
  )
}
