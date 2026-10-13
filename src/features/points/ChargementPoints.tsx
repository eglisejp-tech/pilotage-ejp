import { useMotChargement } from '@/components/etats/useMotChargement'
import { TEXTES_POINTS } from '@/features/points/textesPoints'
import type { ProfilPoints } from '@/features/points/textesPoints'

interface Props {
  titre: string
  profil: ProfilPoints
}

/**
 * Chargement de l'écran 05 (LISEZMOI, « États ») : le titre, sa phrase et le filet des onglets
 * tout de suite ; après 300 ms, « Chargement » en `--encre-3` à la place de la liste, avec
 * `aria-busy`, puis, après 4 s, « Chargement plus long que d'habitude » (m248). Pas d'animation.
 * Les 10 s et l'erreur viennent de `usePoints`.
 */
export function ChargementPoints({ titre, profil }: Props) {
  const mot = useMotChargement(TEXTES_POINTS.chargement)
  return (
    <div aria-busy="true" className="flex flex-col gap-12">
      <header className="flex flex-col gap-2.5">
        <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
        <p className="max-w-[720px] leading-relaxed text-encre-2">
          {TEXTES_POINTS.introduction[profil]}
        </p>
      </header>
      <div className="flex flex-col">
        <div className="min-h-cible border-b-2 border-encre" />
        {/* La zone d'annonce existe dès le départ, vide : « Chargement » y entre après 300 ms. */}
        <p role="status" className="py-[18px] text-encre-3">
          {mot}
        </p>
      </div>
    </div>
  )
}
