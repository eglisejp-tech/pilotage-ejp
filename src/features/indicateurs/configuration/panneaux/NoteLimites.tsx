import { etatLimite } from '@/features/indicateurs/configuration/panneaux/apercu'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'
import { TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'
import { useLimites } from '@/features/indicateurs/configuration/panneaux/useLecturesPanneaux'

interface Props {
  ecritures: EcrituresIndicateurs
  ministereId: string
  /** Le panneau remplace un indicateur : il ne compte pas dans la place prise. */
  remplace?: boolean
}

/**
 * La place qui reste sur la fiche, lue dans la base (`limites_indicateurs`) quand le panneau
 * s'ouvre : « La fiche compte 12 indicateurs sur 30 au plus. », et, quand elle est pleine, le
 * refus que la base donnerait. Rien ne bloque l'envoi : la base répond de toute façon.
 */
export function NoteLimites({ ecritures, ministereId, remplace = false }: Props) {
  const limites = useLimites(ecritures, ministereId)
  if (limites.isError) {
    return (
      <p className="text-sm leading-normal text-encre-2">{TEXTES_PANNEAUX.limitesIllisibles}</p>
    )
  }
  if (limites.data === undefined) return null
  const etat = etatLimite(limites.data, remplace)
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[15px] leading-normal text-encre-2">{etat.phrase}</p>
      {etat.refus !== null ? (
        <p className="text-[15px] leading-normal font-semibold text-alerte">{etat.refus}</p>
      ) : null}
    </div>
  )
}
