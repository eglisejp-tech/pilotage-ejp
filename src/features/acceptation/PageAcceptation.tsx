import { useState } from 'react'
import { accepterConditions } from '@/data/conditions'
import { EcranAcceptation } from '@/features/acceptation/EcranAcceptation'
import { messagesConnexion } from '@/features/connexion/messages'
import { useEtatVerifie } from '@/features/session/contexte'
import { seDeconnecter } from '@/features/session/actions'
import { rafraichirSession } from '@/features/session/useEtatSession'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'

/**
 * /conditions-a-accepter : l'écran d'acceptation relié à la base. Réussite : la session est relue
 * et la garde envoie vers l'adresse demandée ou l'accueil du profil.
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
    } catch {
      setErreur(messagesConnexion.echecReseau)
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
    />
  )
}
