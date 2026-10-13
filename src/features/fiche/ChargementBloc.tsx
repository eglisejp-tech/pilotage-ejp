import { useMotChargement } from '@/components/etats/useMotChargement'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

/**
 * Chargement d'un écran ou d'un bloc de la fiche (LISEZMOI, « États ») : la zone `status` existe
 * dès le départ, vide, et « Chargement » y entre après 300 ms, en `--encre-3`, sans animation ;
 * après 4 s, « Chargement plus long que d'habitude » (m248).
 */
export function ChargementBloc() {
  const mot = useMotChargement(TEXTES_FICHE.chargement)
  return (
    <div aria-busy="true" className="py-[18px]">
      <p role="status" className="text-encre-3">
        {mot}
      </p>
    </div>
  )
}
