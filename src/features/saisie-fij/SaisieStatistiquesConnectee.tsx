import { EtatVide } from '@/components/etats/EtatVide'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { FormulaireStatistiquesFij } from '@/features/saisie-fij/FormulaireStatistiquesFij'
import { useSaisieStatistiques } from '@/features/saisie-fij/useSaisiesFij'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'

interface Props {
  titre: string
  onFermer: () => void
}

/** Chiffres par département avec leurs lectures : chargement, problème passager, formulaire. */
export function SaisieStatistiquesConnectee({ titre, onFermer }: Props) {
  const etat = useSaisieStatistiques()
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
        <FormulaireStatistiquesFij
          dimancheReference={etat.dimancheReference}
          statistiques={etat.statistiques}
          enregistrer={etat.enregistrer}
        />
      ) : (
        // Le formulaire porte son propre lien ; ici, un ministère bloqué en a aussi besoin.
        <LienSignalement ecran="saisie_fij_statistiques" />
      )}
    </PanneauSaisie>
  )
}
