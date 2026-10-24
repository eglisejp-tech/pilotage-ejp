import { PhraseSemaine } from './PhraseSemaine'
import type { MorceauPhrase, Semaine } from './types'

interface Props {
  semaine: Semaine
  phrase: MorceauPhrase[]
  /** Null : rien à signaler, la ligne ne s'affiche pas. */
  ligneSecondaire: string | null
  surligner: boolean
}

/**
 * Ouverture de la vue : numéro de semaine et phrase de la semaine. Téléphone : le numéro et sa
 * période côte à côte, la phrase dessous (maquette 03). À partir de 600 px : la période au-dessus
 * du numéro, la phrase à droite (01, 02). La ligne secondaire ne s'affiche pas sur téléphone.
 */
export function OuvertureSemaine({ semaine, phrase, ligneSecondaire, surligner }: Props) {
  // « du 21 au 27 sept. » : sur téléphone, « Semaine du » puis la période sur une deuxième ligne.
  const [premierMot, ...suite] = semaine.periode.split(' ')

  return (
    <header className="flex flex-col gap-3 tablette:flex-row tablette:items-end tablette:gap-10">
      <p className="flex shrink-0 items-end gap-3 tablette:flex-col-reverse tablette:items-start tablette:gap-0">
        <span className="sr-only">
          Semaine {semaine.numero}, {semaine.periode}
        </span>
        <span
          aria-hidden="true"
          className="font-chiffres text-semaine leading-[0.78] font-black tracking-[-0.01em] tabular-nums"
        >
          {semaine.numero}
        </span>
        <span
          aria-hidden="true"
          className="pb-0.5 text-note font-semibold text-encre-3 tablette:pb-6"
        >
          Semaine {premierMot}
          <br className="tablette:hidden" /> {suite.join(' ')}
        </span>
      </p>
      <div className="flex min-w-0 flex-col gap-4">
        <h1 className="font-lecture text-phrase leading-[1.17] font-medium tracking-[-0.01em] tablette:leading-[1.14]">
          <PhraseSemaine morceaux={phrase} surligner={surligner} />
        </h1>
        {ligneSecondaire ? (
          <p className="hidden max-w-[620px] text-interface leading-relaxed text-encre-2 tablette:block">
            {ligneSecondaire}
          </p>
        ) : null}
      </div>
    </header>
  )
}
