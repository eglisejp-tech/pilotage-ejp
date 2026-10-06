import { EtatVide } from '@/components/etats/EtatVide'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { FormulaireCarteFij } from '@/features/saisie-fij/FormulaireCarteFij'
import { useSaisieCarte } from '@/features/saisie-fij/useSaisiesFij'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'

interface Props {
  ministereId: string
  titre: string
  onFermer: () => void
}

/** Carte des FIJ avec ses lectures : chargement, problème passager, puis le formulaire. */
export function SaisieCarteConnectee({ ministereId, titre, onFermer }: Props) {
  const etat = useSaisieCarte(ministereId)
  return (
    <PanneauSaisie titre={titre} surtitre="FIJ en Île-de-France" onFermer={onFermer}>
      {etat.etat === 'chargement' ? <ChargementSaisie /> : null}
      {etat.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: etat.reessayer }}
        >
          La connexion a échoué. Réessayez.
        </EtatVide>
      ) : null}
      {etat.etat === 'pret' ? (
        <FormulaireCarteFij carte={etat.carte} enregistrer={etat.enregistrer} />
      ) : null}
    </PanneauSaisie>
  )
}
