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
 * 600 px, panneau de 460 px au-delà. Sous le titre, la phrase qui dit qui lit le signalement
 * (« EJP Tech lit votre signalement. »), en texte visible et non en aide (T38) ; puis le
 * formulaire et « Vos derniers signalements ».
 */
export function PanneauSignalement({ mesSignalements, onFermer, surtitre, ...formulaire }: Props) {
  return (
    <PanneauSaisie titre={TEXTES_SIGNALEMENT.titre} surtitre={surtitre} onFermer={onFermer}>
      <p className="leading-normal text-encre-2">{TEXTES_SIGNALEMENT.phraseTitre}</p>
      <FormulaireSignalement {...formulaire} onAnnuler={onFermer} />
      <MesSignalements contenu={mesSignalements} />
    </PanneauSaisie>
  )
}
