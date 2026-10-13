import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { accepterConditions } from '@/data/conditions'
import { lireMaDeclaration } from '@/data/personnes'
import { EcranAcceptation } from '@/features/acceptation/EcranAcceptation'
import { messagesConnexion } from '@/features/connexion/messages'
import { useEtatVerifie } from '@/features/session/contexte'
import { seDeconnecter } from '@/features/session/actions'
import { adresseChangement, retourValide } from '@/features/session/decisions'
import { rafraichirSession } from '@/features/session/useEtatSession'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'
import { declarationNecessaire, memePrenom } from '@/lib/metier/declaration'

/**
 * La personne affichée est-elle toujours celle déclarée sur la session ? `accepter_conditions`
 * écrit pour la déclaration courante de la session, qu'un autre onglet a pu changer (« Ce n'est
 * pas moi ») ou qu'EJP Tech a pu effacer.
 */
async function toujoursLaPersonneAffichee(prenom: string): Promise<boolean> {
  const declaration = await lireMaDeclaration()
  return (
    declaration !== null &&
    !declarationNecessaire(declaration) &&
    memePrenom(declaration.prenom, prenom)
  )
}

/**
 * /conditions-a-accepter : l'écran d'acceptation relié à la base. Réussite : la session est relue
 * et la garde envoie vers l'adresse demandée ou l'accueil du profil. Sur un compte de ministère,
 * la personne déclarée accepte elle-même (T61) ; « Ce n'est pas moi » change le prénom d'abord,
 * puis revient ici pour la nouvelle personne. Si la déclaration de la session a changé depuis
 * l'affichage, rien n'est accepté : la session est relue et l'écran se montre au bon nom.
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

  const prenomAffiche = etat.prenom

  async function accepter() {
    setErreur(undefined)
    setEnCours(true)
    try {
      if (prenomAffiche !== undefined && !(await toujoursLaPersonneAffichee(prenomAffiche))) {
        await rafraichirSession()
        setEnCours(false)
        return
      }
      await accepterConditions(VERSION_CONDITIONS)
      await rafraichirSession()
    } catch {
      // Un refus de la base (prénom effacé entre-temps, session fermée) : la session relue, la
      // garde montre l'écran qui convient. Une coupure : la session reste, et le bandeau le dit.
      void rafraichirSession()
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
