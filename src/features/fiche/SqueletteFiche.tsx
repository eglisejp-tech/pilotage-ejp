import { useId } from 'react'
import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE, titrePointsFiche } from '@/features/fiche/textesFiche'

interface Props {
  /** Titre de l'écran (« Ma fiche », « Fiche du ministère »), avant que le nom soit connu. */
  titre: string
  /** Qui lit : le bloc des points s'appelle « Mes points » pour le ministère (T66). */
  profil?: ProfilFiche
}

/** Une section qui attend son contenu : `aria-busy` (la zone `status` de la fiche n'y est pas). */
function SectionEnChargement({ titre }: { titre: string }) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} aria-busy="true" className="flex min-w-0 flex-col gap-4">
      <TitreSection id={idTitre} titre={titre} />
      <PlaceReservee className="h-24" />
    </section>
  )
}

/**
 * Fiche en chargement (LISEZMOI, « États » ; T65, moment 2) : le titre de l'écran et les titres
 * de section avec leur filet, tout de suite, avec la place de leur contenu ; après 300 ms, la
 * flamme vivante et « Chargement de la fiche » sous le titre, et les places en gris immobile. La
 * page garde sa forme entre le chargement et le résultat. `aria-busy` est sur les sections qui
 * attendent, jamais autour de la zone `status` : certains lecteurs d'écran n'annoncent pas ce qui
 * change dans une zone occupée.
 */
export function SqueletteFiche({ titre, profil = 'berger' }: Props) {
  return (
    <div className="flex flex-col gap-sections">
      <header className="flex flex-col gap-4">
        <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
        <IndicateurChargement texte={TEXTES_FICHE.chargement} />
      </header>
      <div className="grid items-start gap-sections ordinateur-large:grid-cols-[minmax(0,1fr)_23.75rem] ordinateur-large:gap-x-16">
        <SectionEnChargement titre={TEXTES_FICHE.titreChiffres} />
        <div className="flex min-w-0 flex-col gap-sections">
          <SectionEnChargement titre={titrePointsFiche(profil)} />
          <SectionEnChargement titre={TEXTES_FICHE.titreDernieresSaisies} />
        </div>
      </div>
    </div>
  )
}
