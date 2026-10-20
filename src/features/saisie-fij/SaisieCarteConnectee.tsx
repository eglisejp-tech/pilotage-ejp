import { Arrivee } from '@/components/etats/Arrivee'
import { EtatVide } from '@/components/etats/EtatVide'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { SURTITRE_FIJ } from '@/features/saisie-fij/departements'
import { FormulaireCarteFij } from '@/features/saisie-fij/FormulaireCarteFij'
import { useSaisieCarte } from '@/features/saisie-fij/useSaisiesFij'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

interface Props {
  ministereId: string
  titre: string
  onFermer: () => void
}

/**
 * Carte des FIJ avec ses lectures : le code du ministère du compte (la saisie est réservée au
 * ministère `fij` : un autre reçoit la page non disponible, sans autre requête ; la base refuse
 * de toute façon), puis la carte. Pendant les deux lectures, une seule attente dans le panneau de
 * la saisie (même titre) : la flamme ne clignote pas entre les deux (T65), et elle reste au moins
 * 600 ms une fois montrée ; puis le problème passager, la page non disponible ou le formulaire,
 * qui arrive en fondu.
 */
export function SaisieCarteConnectee({ ministereId, titre, onFermer }: Props) {
  const etat = useSaisieCarte(ministereId)
  const { attente, fondu } = useAttenteChargement(etat.etat === 'chargement')
  if (!attente && etat.etat === 'autre') return <PageNonDisponible />
  return (
    <PanneauSaisie titre={titre} surtitre={SURTITRE_FIJ} onFermer={onFermer}>
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
          <FormulaireCarteFij carte={etat.carte} enregistrer={etat.enregistrer} />
        </Arrivee>
      ) : (
        // Le formulaire porte son propre lien ; ici, un ministère bloqué en a aussi besoin.
        <LienSignalement ecran="saisie_fij" />
      )}
    </PanneauSaisie>
  )
}
