import { Arrivee } from '@/components/etats/Arrivee'
import { EtatVide } from '@/components/etats/EtatVide'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'
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
  // T65 : la flamme reste au moins 600 ms une fois montrée, puis le formulaire arrive en fondu.
  const { attente, fondu } = useAttenteChargement(etat.etat === 'chargement')
  return (
    <PanneauSaisie titre={titre} surtitre="FIJ en Île-de-France" onFermer={onFermer}>
      {attente ? <ChargementSaisie /> : null}
      {!attente && etat.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: etat.reessayer }}
        >
          La connexion a échoué. Réessayez.
        </EtatVide>
      ) : null}
      {!attente && etat.etat === 'pret' ? (
        <Arrivee fondu={fondu}>
          <FormulaireStatistiquesFij
            dimancheReference={etat.dimancheReference}
            statistiques={etat.statistiques}
            enregistrer={etat.enregistrer}
          />
        </Arrivee>
      ) : (
        // Le formulaire porte son propre lien ; ici, un ministère bloqué en a aussi besoin.
        <LienSignalement ecran="saisie_fij_statistiques" />
      )}
    </PanneauSaisie>
  )
}
