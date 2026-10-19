import { useId } from 'react'
import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

interface Props {
  /** Titre de l'écran (« Ma fiche », « Fiche du ministère »), avant que le nom soit connu. */
  titre: string
}

function SectionEnChargement({ titre }: { titre: string }) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col gap-4">
      <TitreSection id={idTitre} titre={titre} />
      <PlaceReservee className="h-24" />
    </section>
  )
}

/**
 * Fiche en chargement (LISEZMOI, « États » ; T65, moment 2) : le titre de l'écran et les titres
 * de section avec leur filet, tout de suite, avec la place de leur contenu ; après 300 ms, la
 * flamme vivante et « Chargement de la fiche » sous le titre, et les places en gris immobile. La
 * page garde sa forme entre le chargement et le résultat.
 */
export function SqueletteFiche({ titre }: Props) {
  return (
    <div aria-busy="true" className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
        <IndicateurChargement texte={TEXTES_FICHE.chargement} />
      </header>
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
