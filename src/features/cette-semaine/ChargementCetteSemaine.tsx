import { useId } from 'react'
import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import { GrilleCetteSemaine } from './GrilleCetteSemaine'
import { voitADecider } from './lecteur'
import { TEXTES_VIDES } from './textesVides'
import { TitreSection } from './TitreSection'
import type { ProfilVue } from './types'
import { useLargeurMin } from './useLargeurMin'

interface Props {
  profil: ProfilVue
}

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

/**
 * Chargement de « Cette semaine » (LISEZMOI, « États » ; T65, moment 2) : les titres de section
 * et leurs filets tout de suite, à leur place, avec la place de leur contenu en gris immobile ;
 * après 300 ms, la flamme vivante et « Chargement de Cette semaine » à la place de la phrase,
 * avec `aria-busy`, puis, après 4 s, « Chargement plus long que d'habitude » (m248). Les 10 s et
 * l'erreur viennent de useCetteSemaine.
 */
export function ChargementCetteSemaine({ profil }: Props) {
  const telephone = !useLargeurMin(600)

  // La zone role="status" existe dès le départ, vide : le texte y entre après 300 ms et les
  // lecteurs d'écran l'annoncent (une zone ajoutée avec son texte ne l'est pas toujours).
  const ouverture = (
    <header>
      <h1 className="sr-only">Cette semaine</h1>
      <IndicateurChargement texte={TEXTES_VIDES.page.chargement} />
    </header>
  )

  // Ministère (07) : « Vos saisies » et « Vos points » avant les blocs de l'église ; sous 600 px,
  // seul « L'église cette semaine » s'affiche ensuite, avant « Tout voir ».
  const accueil =
    profil === 'ministere'
      ? {
          vosSaisies: <SectionEnAttente titre={TEXTES_ACCUEIL.titreSaisies} />,
          vosPoints: <SectionEnAttente titre={TEXTES_ACCUEIL.titrePoints} />,
        }
      : undefined
  if (accueil && telephone) {
    return (
      <div aria-busy="true" className="flex flex-col gap-9">
        {ouverture}
        {accueil.vosSaisies}
        {accueil.vosPoints}
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
        aDecider={voitADecider(profil) ? <SectionEnAttente titre="À décider" /> : null}
        aDeciderEnTete={false}
        session={<SectionEnAttente titre={TEXTES_VIDES.session.titre} />}
        carte={<SectionEnAttente titre="FIJ en Île-de-France" />}
        ministeres={<SectionEnAttente titre="Les ministères" />}
        accueil={accueil}
      />
    </div>
  )
}
