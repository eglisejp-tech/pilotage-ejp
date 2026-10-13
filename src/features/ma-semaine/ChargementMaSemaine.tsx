import { useEffect, useId, useState } from 'react'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import { DELAI_CHARGEMENT } from '@/features/cette-semaine/ChargementCetteSemaine'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { TEXTES_MA_SEMAINE } from './textesMaSemaine'

/** Titre de section et son filet, sans contenu tant que les données arrivent. */
function SectionEnAttente({ titre }: { titre: string }) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection id={idTitre} titre={titre} />
    </section>
  )
}

const colonnes =
  'grid items-start gap-9 min-[600px]:gap-11 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16'
const colonne = 'flex min-w-0 flex-col gap-9 min-[600px]:gap-11 lg:gap-13'

/**
 * Chargement de « Ma semaine » : les titres de section tout de suite, à leur place ; après 300 ms,
 * « Chargement » à la place de la phrase, avec `aria-busy`. Pas d'animation.
 */
export function ChargementMaSemaine() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const minuterie = setTimeout(() => setVisible(true), DELAI_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [])
  return (
    <div aria-busy="true" className="flex flex-col gap-9 min-[600px]:gap-11 lg:gap-13">
      <header className="min-h-16">
        <h1 className="sr-only">{TEXTES_MA_SEMAINE.onglet}</h1>
        <p role="status" className="text-encre-3">
          {visible ? TEXTES_VIDES.page.chargement : null}
        </p>
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
