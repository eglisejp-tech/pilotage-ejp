import { useMotChargement } from '@/components/etats/useMotChargement'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'

/**
 * Chargement d'un panneau de saisie (LISEZMOI, « États ») : le titre du panneau est déjà là ;
 * après 300 ms, « Chargement » en `--encre-3` à la place du formulaire, avec `aria-busy`, puis,
 * après 4 s, « Chargement plus long que d'habitude » (m248). Pas d'animation. La zone `status`
 * existe dès le départ, vide, pour que le mot soit annoncé.
 */
export function ChargementSaisie() {
  const mot = useMotChargement(TEXTES_VIDES.page.chargement)

  return (
    <div aria-busy="true">
      <p role="status" className="text-encre-3">
        {mot}
      </p>
    </div>
  )
}
