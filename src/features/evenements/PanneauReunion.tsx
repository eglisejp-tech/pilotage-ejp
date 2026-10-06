import { EtatVide } from '@/components/etats/EtatVide'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementSaisie } from '@/features/evenements/ChargementSaisie'
import { FormulaireReunion } from '@/features/evenements/FormulaireReunion'
import type { ProprietesReunion } from '@/features/evenements/FormulaireReunion'
import { TEXTES_REUNION } from '@/features/evenements/textes'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'

/** Ce que montre le panneau : le formulaire, ou l'un de ses états (T36). */
export type ContenuPanneauReunion =
  | { etat: 'chargement' }
  | { etat: 'probleme'; reessayer: () => void }
  | ({ etat: 'formulaire' } & ProprietesReunion)

interface Props {
  contenu: ContenuPanneauReunion
  onFermer: () => void
}

/**
 * Panneau « Prochaine réunion » (dérivé de 11) : page entière sous 600 px, panneau de 460 px
 * au-delà. Le chargement et le problème passager (« Réessayer ») gardent le cadre et le titre.
 */
export function PanneauReunion({ contenu, onFermer }: Props) {
  return (
    <PanneauSaisie titre={TEXTES_REUNION.titre} onFermer={onFermer}>
      {contenu.etat === 'chargement' ? <ChargementSaisie /> : null}
      {contenu.etat === 'probleme' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
        >
          {TEXTES_VIDES.page.erreur}
        </EtatVide>
      ) : null}
      {contenu.etat === 'formulaire' ? <FormulaireReunion {...contenu} /> : null}
    </PanneauSaisie>
  )
}
