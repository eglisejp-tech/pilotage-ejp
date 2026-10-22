import { IndicateurChargement } from '@/components/etats/IndicateurChargement'
import { PlaceReservee } from '@/components/etats/PlaceReservee'
import { EnTeteJournal } from '@/features/journal/EnTeteJournal'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import type { TypeCompte } from '@/lib/base'

interface Props {
  titre: string
  profil: TypeCompte
}

/**
 * Chargement de l'écran 06 (LISEZMOI, « États » ; T65, moment 2) : le titre, sa phrase et le
 * filet tout de suite ; après 300 ms, la flamme vivante et « Chargement du journal » à la place
 * de la liste, puis deux lignes réservées en gris immobile, avec `aria-busy` (sur les lignes,
 * jamais autour de la zone `status`) ; après 4 s, « Chargement plus long que d'habitude » (m248).
 * Les 10 s et l'erreur viennent des lectures.
 */
export function ChargementJournal({ titre, profil }: Props) {
  return (
    <div className="flex flex-col gap-9">
      <EnTeteJournal titre={titre} profil={profil} />
      <div className="flex flex-col gap-2.5 border-t-2 border-encre">
        {/* La zone d'annonce existe dès le départ, vide : le texte y entre après 300 ms. */}
        <IndicateurChargement texte={TEXTES_JOURNAL.chargement} />
        <div aria-busy="true" className="flex flex-col gap-2.5">
          <PlaceReservee className="h-[30px]" />
          <PlaceReservee className="h-[30px] w-4/5" />
        </div>
      </div>
    </div>
  )
}
