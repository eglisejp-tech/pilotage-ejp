import { useId } from 'react'
import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { TEXTES_MA_SEMAINE } from './textesMaSemaine'

/** Titre de section et son filet, puis la place réservée au contenu, grise et immobile. */
function SectionEnAttente({ titre }: { titre: string }) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col gap-4">
      <TitreSection id={idTitre} titre={titre} />
      <PlaceReservee className="h-24" />
    </section>
  )
}

const colonnes =
  'grid items-start gap-9 min-[600px]:gap-11 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16'
const colonne = 'flex min-w-0 flex-col gap-9 min-[600px]:gap-11 lg:gap-13'

/**
 * Chargement de « Ma semaine » (T65, moment 2) : les titres de section tout de suite, à leur
 * place, avec la place de leur contenu en gris immobile ; après 300 ms, la flamme vivante et
 * « Chargement de Ma semaine » à la place de la phrase, avec `aria-busy`, puis, après 4 s,
 * « Chargement plus long que d'habitude » (m248).
 */
export function ChargementMaSemaine() {
  return (
    <div aria-busy="true" className="flex flex-col gap-9 min-[600px]:gap-11 lg:gap-13">
      <header>
        <h1 className="sr-only">{TEXTES_MA_SEMAINE.onglet}</h1>
        <IndicateurChargement texte={TEXTES_MA_SEMAINE.chargement} />
      </header>
      <div className={colonnes}>
        <div className={colonne}>
          <SectionEnAttente titre={TEXTES_ACCUEIL.titreSaisies} />
          <SectionEnAttente titre={TEXTES_MA_SEMAINE.titreChiffres} />
        </div>
        <div className={colonne}>
          <SectionEnAttente titre={TEXTES_ACCUEIL.titrePoints} />
          <SectionEnAttente titre={TEXTES_MA_SEMAINE.titreEglise} />
        </div>
      </div>
    </div>
  )
}
