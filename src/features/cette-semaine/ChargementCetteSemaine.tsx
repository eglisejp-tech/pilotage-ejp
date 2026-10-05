import { useEffect, useId, useState } from 'react'
import { GrilleCetteSemaine } from './GrilleCetteSemaine'
import { TEXTES_VIDES } from './textesVides'
import { TitreSection } from './TitreSection'
import type { ProfilVue } from './types'
import { useLargeurMin } from './useLargeurMin'

/** « Chargement » n'apparaît qu'après 300 ms : une réponse rapide ne fait rien clignoter. */
export const DELAI_CHARGEMENT = 300

interface Props {
  profil: ProfilVue
}

/** Titre de section et son filet, sans contenu tant que les données arrivent. */
function SectionEnAttente({ titre }: { titre: string }) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection id={idTitre} titre={titre} />
    </section>
  )
}

/**
 * Chargement de « Cette semaine » (LISEZMOI, « États ») : les titres de section et leurs filets
 * tout de suite, à leur place ; après 300 ms, « Chargement » en `--encre-3` à la place de la
 * phrase, avec `aria-busy`. Pas d'animation. Les 10 s et l'erreur viennent de useCetteSemaine.
 */
export function ChargementCetteSemaine({ profil }: Props) {
  const [visible, setVisible] = useState(false)
  const telephone = !useLargeurMin(600)

  useEffect(() => {
    const minuterie = setTimeout(() => setVisible(true), DELAI_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [])

  const ouverture = (
    <header className="min-h-16">
      <h1 className="sr-only">Cette semaine</h1>
      {visible ? <p className="text-encre-3">{TEXTES_VIDES.page.chargement}</p> : null}
    </header>
  )

  // Ministère sous 600 px : seul « L'église cette semaine » s'affiche avant « Tout voir ».
  if (profil === 'ministere' && telephone) {
    return (
      <div aria-busy="true" className="flex flex-col gap-9">
        {ouverture}
        <SectionEnAttente titre="L'église cette semaine" />
      </div>
    )
  }

  return (
    <div aria-busy="true">
      <GrilleCetteSemaine
        ouverture={ouverture}
        chiffres={
          <SectionEnAttente
            titre={profil === 'ministere' ? "L'église cette semaine" : "Les chiffres de l'église"}
          />
        }
        aDecider={
          profil === 'berger' || profil === 'conseil' ? (
            <SectionEnAttente titre="À décider" />
          ) : null
        }
        aDeciderEnTete={false}
        session={<SectionEnAttente titre={TEXTES_VIDES.session.titre} />}
        carte={<SectionEnAttente titre="FIJ en Île-de-France" />}
        ministeres={<SectionEnAttente titre="Les ministères" />}
      />
    </div>
  )
}
