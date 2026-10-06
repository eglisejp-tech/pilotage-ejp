import type { ReactNode } from 'react'
import { Aide } from '@/components/aide/Aide'
import type { CodeAide } from '@/components/aide/textesAide'
import { cn } from '@/lib/utils'

interface Props {
  code: CodeAide
  /** Nom accessible du bouton : « Aide : <libellé> ». */
  libelle: string
  /** Classes du texte (graisse, couleur) ; 15 px par défaut. */
  classe?: string
  children: ReactNode
}

/**
 * Une phrase du formulaire suivie de son aide. La phrase laisse la place du « ? » (44 px et un
 * petit écart) : le bouton reste sur sa dernière ligne, collé à ses derniers mots, au lieu de
 * partir au bord droit du panneau ou de tomber seul sur la ligne du dessous.
 */
export function LigneAvecAide({ code, libelle, classe, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-1">
      <p className={cn('max-w-[calc(100%-3rem)] min-w-0 text-[15px] leading-normal', classe)}>
        {children}
      </p>
      <Aide code={code} libelle={libelle} />
    </div>
  )
}
