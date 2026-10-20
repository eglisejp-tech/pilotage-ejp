import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'
import { TEXTES_POINTS } from '@/features/points/textesPoints'
import type { ProfilPoints } from '@/features/points/textesPoints'

interface Props {
  titre: string
  profil: ProfilPoints
}

/**
 * Chargement de l'écran 05 (LISEZMOI, « États » ; T65, moment 2) : le titre, sa phrase et le filet
 * des onglets tout de suite ; après 300 ms, la flamme vivante et « Chargement des points » à la
 * place de la liste, puis deux lignes réservées en gris immobile, avec `aria-busy` (sur les
 * lignes, jamais autour de la zone `status`) ; après 4 s, « Chargement plus long que
 * d'habitude » (m248). Les 10 s et l'erreur viennent de `usePoints`.
 */
export function ChargementPoints({ titre, profil }: Props) {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2.5">
        <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
        <p className="max-w-[720px] leading-relaxed text-encre-2">
          {TEXTES_POINTS.introduction[profil]}
        </p>
      </header>
      <div className="flex flex-col gap-2.5">
        <div className="min-h-cible border-b-2 border-encre" />
        {/* La zone d'annonce existe dès le départ, vide : le texte y entre après 300 ms. */}
        <IndicateurChargement texte={TEXTES_POINTS.chargement} />
        <div aria-busy="true" className="flex flex-col gap-2.5">
          <PlaceReservee className="h-[30px]" />
          <PlaceReservee className="h-[30px] w-4/5" />
        </div>
      </div>
    </div>
  )
}
