import { EtatVide } from '@/components/etats/EtatVide'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementSaisie } from '@/features/evenements/ChargementSaisie'
import { FormulaireNouveauPoint } from '@/features/nouveau-point/FormulaireNouveauPoint'
import type { ProprietesFormulaireNouveauPoint } from '@/features/nouveau-point/FormulaireNouveauPoint'
import { TEXTES_POINT } from '@/features/nouveau-point/textes'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'

/** Ce que montre le panneau : le formulaire, ou l'un de ses états (T36). */
export type ContenuPanneauNouveauPoint =
  | { etat: 'chargement' }
  /** Problème passager : une lecture a échoué, « Réessayer » la relance. */
  | { etat: 'probleme'; reessayer: () => void }
  | ({ etat: 'formulaire' } & ProprietesFormulaireNouveauPoint)

interface Props {
  contenu: ContenuPanneauNouveauPoint
  /** « Retour », Échap et le fond du panneau ramènent à la page d'origine. */
  onFermer: () => void
  /** Compte connecté (« Ministère Communication »), au-dessus du titre comme dans la maquette 10. */
  surtitre?: string
}

/**
 * Panneau « Nouveau point d'attention » (maquette 10) : page entière sous 600 px, panneau de 460 px
 * au-delà. Ses états gardent le cadre et le titre : chargement, et problème passager avec
 * « Réessayer ».
 */
export function PanneauNouveauPoint({ contenu, onFermer, surtitre }: Props) {
  return (
    <PanneauSaisie titre={TEXTES_POINT.titre} surtitre={surtitre} onFermer={onFermer}>
      {contenu.etat === 'chargement' ? <ChargementSaisie /> : null}
      {contenu.etat === 'probleme' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
        >
          {TEXTES_VIDES.page.erreur}
        </EtatVide>
      ) : null}
      {contenu.etat === 'formulaire' ? <FormulaireNouveauPoint {...contenu} /> : null}
    </PanneauSaisie>
  )
}
