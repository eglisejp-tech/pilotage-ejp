import { useId } from 'react'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

interface Props {
  /** Titre de l'écran (« Ma fiche », « Fiche du ministère »), avant que le nom soit connu. */
  titre: string
}

function SectionEnChargement({ titre }: { titre: string }) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection id={idTitre} titre={titre} />
      <ChargementBloc />
    </section>
  )
}

/**
 * Fiche en chargement (LISEZMOI, « États ») : le titre de l'écran et les titres de section avec
 * leur filet, tout de suite, puis « Chargement » à la place du contenu après 300 ms. La page garde
 * sa forme entre le chargement et le résultat.
 */
export function SqueletteFiche({ titre }: Props) {
  return (
    <div className="flex flex-col gap-12">
      <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16">
        <SectionEnChargement titre={TEXTES_FICHE.titreChiffres} />
        <div className="flex min-w-0 flex-col gap-12">
          <SectionEnChargement titre={TEXTES_FICHE.titrePoints} />
          <SectionEnChargement titre={TEXTES_FICHE.titreDernieresSaisies} />
        </div>
      </div>
    </div>
  )
}
