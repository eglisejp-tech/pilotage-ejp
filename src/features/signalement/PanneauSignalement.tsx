import { Link } from 'react-router'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { FormulaireSignalement } from '@/features/signalement/FormulaireSignalement'
import type { ProprietesFormulaireSignalement } from '@/features/signalement/FormulaireSignalement'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

type Props = Omit<ProprietesFormulaireSignalement, 'onAnnuler'> & {
  onFermer: () => void
  /** Compte connecté (« Ministère Communication »), au-dessus du titre. */
  surtitre?: string
}

/**
 * Panneau « Signaler une difficulté » (`/signaler`, ministère seulement) : page entière sous
 * 600 px, panneau de 460 px au-delà. Le formulaire, puis le seul lien « Voir mes signalements »
 * (T77) : un seul endroit montre le suivi et ses boutons, « Mes signalements ». Le libellé
 * « Quelle difficulté rencontrez-vous ? » suffit : plus de phrase sous le titre (guide, exemple 9 ;
 * T66, t149).
 */
export function PanneauSignalement({ onFermer, surtitre, ...formulaire }: Props) {
  return (
    <PanneauSaisie titre={TEXTES_SIGNALEMENT.titre} surtitre={surtitre} onFermer={onFermer}>
      <FormulaireSignalement {...formulaire} onAnnuler={onFermer} />
      <p className="border-t border-filet pt-5">
        <Link
          to="/signalements"
          className="inline-flex min-h-cible items-center text-interface font-semibold text-nuit underline underline-offset-4"
        >
          {TEXTES_SIGNALEMENT.lienSuivi}
        </Link>
      </p>
    </PanneauSaisie>
  )
}
