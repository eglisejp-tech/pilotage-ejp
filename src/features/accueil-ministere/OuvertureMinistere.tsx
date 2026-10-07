import { Link } from 'react-router'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import type { OuvertureAccueil } from '@/features/accueil-ministere/types'
import { PhraseSemaine } from '@/features/cette-semaine/PhraseSemaine'
import type { Semaine } from '@/features/cette-semaine/types'

interface Props {
  semaine: Semaine
  ouverture: OuvertureAccueil
}

const classeSecondaire =
  'inline-flex min-h-12 min-w-40 flex-1 items-center justify-center border border-encre bg-papier px-4.5 text-center text-[15px] font-semibold text-encre hover:bg-fond min-[600px]:flex-none'

/**
 * Ouverture de l'accueil du ministère (maquette 07 ; BRIEF, section 9) : le surtitre « Semaine 39,
 * du 21 au 27 sept. », la phrase de ce qu'il reste à faire (ce qui reste est surligné), le bouton
 * principal jaune (absent quand tout est fait), puis les boutons secondaires. Sur téléphone, les
 * boutons prennent toute la largeur ; à partir de 600 px, ils se suivent sur une ligne. La note de
 * conception de 07 (« Le dimanche midi, ce bouton devient... ») ne s'affiche pas.
 */
export function OuvertureMinistere({ semaine, ouverture }: Props) {
  return (
    <header className="flex flex-col gap-3.5">
      <p className="text-note font-semibold text-encre-3">
        Semaine {semaine.numero}, {semaine.periode}
      </p>
      <h1 className="max-w-[46rem] font-lecture text-phrase leading-[1.15] font-medium tracking-[-0.01em]">
        <PhraseSemaine morceaux={ouverture.phrase} surligner />
      </h1>
      {ouverture.principal !== null || ouverture.secondaires.length > 0 ? (
        <nav aria-label={TEXTES_ACCUEIL.actions} className="mt-1 flex flex-col gap-2.5">
          {ouverture.principal !== null ? (
            <Link
              to={ouverture.principal.vers}
              className="inline-flex min-h-14 w-full items-center justify-center bg-lumiere px-4.5 text-center text-[15px] font-semibold text-encre min-[600px]:w-auto min-[600px]:self-start min-[600px]:px-8"
            >
              {ouverture.principal.libelle}
            </Link>
          ) : null}
          {ouverture.secondaires.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {ouverture.secondaires.map((bouton) => (
                <Link key={bouton.libelle} to={bouton.vers} className={classeSecondaire}>
                  {bouton.libelle}
                </Link>
              ))}
            </div>
          ) : null}
        </nav>
      ) : null}
    </header>
  )
}
