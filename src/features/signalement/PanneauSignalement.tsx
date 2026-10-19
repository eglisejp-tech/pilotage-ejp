import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { FormulaireSignalement } from '@/features/signalement/FormulaireSignalement'
import type { ProprietesFormulaireSignalement } from '@/features/signalement/FormulaireSignalement'
import { MesSignalements } from '@/features/signalement/MesSignalements'
import type { ContenuMesSignalements } from '@/features/signalement/MesSignalements'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

type Props = Omit<ProprietesFormulaireSignalement, 'onAnnuler'> & {
  /** « Vos derniers signalements », sous le formulaire. */
  mesSignalements: ContenuMesSignalements
  onFermer: () => void
  /** Compte connecté (« Ministère Communication »), au-dessus du titre. */
  surtitre?: string
}

/**
 * Panneau « Signaler une difficulté » (`/signaler`, ministère seulement) : page entière sous
 * 600 px, panneau de 460 px au-delà. Le formulaire, puis « Vos derniers signalements ». Le libellé
 * « Quelle difficulté rencontrez-vous ? » suffit : plus de phrase sous le titre (guide, exemple 9 ;
 * T66, t149).
 */
export function PanneauSignalement({ mesSignalements, onFermer, surtitre, ...formulaire }: Props) {
  return (
    <PanneauSaisie titre={TEXTES_SIGNALEMENT.titre} surtitre={surtitre} onFermer={onFermer}>
      <FormulaireSignalement {...formulaire} onAnnuler={onFermer} />
      <MesSignalements contenu={mesSignalements} />
    </PanneauSaisie>
  )
}
