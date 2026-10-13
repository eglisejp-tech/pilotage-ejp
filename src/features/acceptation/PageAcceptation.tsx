import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { accepterConditions } from '@/data/conditions'
import { EcranAcceptation } from '@/features/acceptation/EcranAcceptation'
import { messagesConnexion } from '@/features/connexion/messages'
import { useEtatVerifie } from '@/features/session/contexte'
import { seDeconnecter } from '@/features/session/actions'
import { adresseChangement, retourValide } from '@/features/session/decisions'
import { rafraichirSession } from '@/features/session/useEtatSession'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'

/**
 * /conditions-a-accepter : l'écran d'acceptation relié à la base. Réussite : la session est relue
 * et la garde envoie vers l'adresse demandée ou l'accueil du profil. Sur un compte de ministère,
 * la personne déclarée accepte elle-même (T61) ; « Ce n'est pas moi » change le prénom d'abord,
 * puis revient ici pour la nouvelle personne.
 */
export function PageAcceptation() {
  const etat = useEtatVerifie()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()
  const [parametres] = useSearchParams()

  // La garde de la zone ne laisse passer que l'état « conditions ».
  if (etat.statut !== 'conditions') return null
  const personne =
    etat.prenom === undefined
      ? undefined
      : {
          prenom: etat.prenom,
          lienChangement: adresseChangement(
            retourValide(parametres.get('retour'), etat.compte.type),
          ),
        }

  async function accepter() {
    setErreur(undefined)
    setEnCours(true)
    try {
      await accepterConditions(VERSION_CONDITIONS)
      await rafraichirSession()
    } catch {
      setErreur(messagesConnexion.echecReseau)
      setEnCours(false)
    }
  }

  return (
    <EcranAcceptation
      libelleCompte={etat.compte.libelle}
      personne={personne}
      version={VERSION_CONDITIONS}
      onAccept={() => void accepter()}
      onSignOut={() => void seDeconnecter()}
      enCours={enCours}
      erreur={erreur}
    />
  )
}
