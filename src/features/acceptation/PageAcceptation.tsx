import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { accepterConditions } from '@/data/conditions'
import { phraseErreur } from '@/data/echecEnvoi'
import { lireMaDeclaration } from '@/data/personnes'
import { EcranAcceptation } from '@/features/acceptation/EcranAcceptation'
import { AnnonceSuivante } from '@/features/connexion/AnnonceSuivante'
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
 * Un refus passe par la table de traduction (`src/data/messagesBase.ts`) : une page plus ancienne
 * que la base (« Version des conditions inconnue. ») dit de recharger la page, car réessayer
 * échouerait toujours (m055) ; seule une erreur sans réponse dit « La connexion a échoué ».
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
    } catch (exception) {
      // Un refus de la base (prénom effacé entre-temps, session fermée) : la session relue, la
      // garde montre l'écran qui convient. Le bandeau dit la phrase de la table de traduction ;
      // une coupure : la session reste, et le bandeau dit « La connexion a échoué ».
      void rafraichirSession()
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
      personne={personne}
      version={VERSION_CONDITIONS}
      onAccept={() => void accepter()}
      onSignOut={() => void seDeconnecter()}
      enCours={enCours}
      erreur={erreur}
      annonce={<AnnonceSuivante dans="colonne" />}
    />
  )
}
