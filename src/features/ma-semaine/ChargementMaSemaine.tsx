import { useId } from 'react'
import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { TEXTES_MA_SEMAINE } from './textesMaSemaine'

/**
 * Titre de section et son filet, puis la place réservée au contenu, grise et immobile. La section
 * attend son contenu : `aria-busy` (la zone `status` de la page n'y est pas).
 */
function SectionEnAttente({ titre }: { titre: string }) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} aria-busy="true" className="flex min-w-0 flex-col gap-4">
      <TitreSection id={idTitre} titre={titre} />
      <PlaceReservee className="h-24" />
    </section>
  )
}

// Les colonnes et les écarts de VueMaSemaine : les blocs ne bougent pas à l'arrivée des données.
const colonnes =
  'grid items-start gap-sections ordinateur:grid-cols-[minmax(0,1fr)_18.75rem] ordinateur:gap-x-10 ordinateur-large:grid-cols-[minmax(0,1fr)_23.75rem] ordinateur-large:gap-x-16'
const colonne = 'flex min-w-0 flex-col gap-sections'

/**
 * Chargement de « Ma semaine » (T65, moment 2) : les titres de section tout de suite, à leur
 * place, avec la place de leur contenu en gris immobile ; après 300 ms, la flamme vivante et
 * « Chargement de Ma semaine » à la place de la phrase, puis, après 4 s, « Chargement plus long
 * que d'habitude » (m248). `aria-busy` est sur les sections qui attendent, jamais autour de la
 * zone `status` : certains lecteurs d'écran n'annoncent pas ce qui change dans une zone occupée.
 */
export function ChargementMaSemaine() {
  return (
    <div className="flex flex-col gap-sections">
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
