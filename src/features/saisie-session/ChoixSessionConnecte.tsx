import { EtatVide } from '@/components/etats/EtatVide'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { ChoixSession } from '@/features/saisie-session/ChoixSession'
import { TEXTES_SESSION } from '@/features/saisie-session/session'
import { useChoixSession } from '@/features/saisie-session/useSaisieSession'
import { LienSignalement } from '@/features/signalement/LienSignalement'

interface Props {
  ministereId: string
  onFermer: () => void
}

/** Panneau « Choisir la session » avec ses lectures (BRIEF, section 9). */
export function ChoixSessionConnecte({ ministereId, onFermer }: Props) {
  const etat = useChoixSession(ministereId)
  return (
    <PanneauSaisie titre={TEXTES_SESSION.titreChoix} onFermer={onFermer}>
      {etat.etat === 'chargement' ? <ChargementSaisie /> : null}
      {etat.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: etat.reessayer }}
        >
          La connexion a échoué. Réessayez.
        </EtatVide>
      ) : null}
      {etat.etat === 'pret' ? <ChoixSession sessions={etat.sessions} /> : null}
      <LienSignalement ecran="saisie_session" />
    </PanneauSaisie>
  )
}
