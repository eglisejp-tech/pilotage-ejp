import { TEXTES_PERSONNES } from '@/features/personnes/textes'

interface Props {
  prenom: string
  /** Libellé du compte, lu avec le bouton : « Effacer ce prénom (Marie D., Ministère Communication) ». */
  compte: string
  onClick: () => void
}

const classeBouton =
  'inline-flex min-h-cible items-center self-start border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond lg:self-center lg:justify-self-end'

/** « Effacer ce prénom » (T56) : ouvre la fenêtre de confirmation. */
export function BoutonEffacerPrenom({ prenom, compte, onClick }: Props) {
  return (
    <button type="button" onClick={onClick} className={classeBouton}>
      {TEXTES_PERSONNES.effacer} <span className="sr-only">{`(${prenom}, ${compte})`}</span>
    </button>
  )
}
