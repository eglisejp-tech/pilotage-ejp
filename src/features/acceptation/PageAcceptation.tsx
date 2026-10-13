import { useState } from 'react'
import { accepterConditions } from '@/data/conditions'
import { phraseErreur } from '@/data/messagesBase'
import { EcranAcceptation } from '@/features/acceptation/EcranAcceptation'
import { AnnonceSuivante } from '@/features/connexion/AnnonceSuivante'
import { messagesConnexion } from '@/features/connexion/messages'
import { useEtatVerifie } from '@/features/session/contexte'
import { seDeconnecter } from '@/features/session/actions'
import { rafraichirSession } from '@/features/session/useEtatSession'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'

/**
 * /conditions-a-accepter : l'écran d'acceptation relié à la base. Réussite : la session est relue
 * et la garde envoie vers l'adresse demandée ou l'accueil du profil. Un refus passe par la table de
 * traduction (`src/data/messagesBase.ts`) : une page plus ancienne que la base (« Version des
 * conditions inconnue. ») dit de recharger la page, car réessayer échouerait toujours (m055) ;
 * seule une erreur sans réponse dit « La connexion a échoué ».
 */
export function PageAcceptation() {
  const etat = useEtatVerifie()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()

  // La garde de la zone ne laisse passer que l'état « conditions ».
  if (etat.statut !== 'conditions') return null

  async function accepter() {
    setErreur(undefined)
    setEnCours(true)
    try {
      await accepterConditions(VERSION_CONDITIONS)
      await rafraichirSession()
    } catch (exception) {
      setErreur(
        phraseErreur(
          exception,
          { connexion: messagesConnexion.echecReseau },
          { formulaire: false },
        ),
      )
      setEnCours(false)
    }
  }

  return (
    <EcranAcceptation
      libelleCompte={etat.compte.libelle}
      version={VERSION_CONDITIONS}
      onAccept={() => void accepter()}
      onSignOut={() => void seDeconnecter()}
      enCours={enCours}
      erreur={erreur}
      annonce={<AnnonceSuivante dans="colonne" />}
    />
  )
}
