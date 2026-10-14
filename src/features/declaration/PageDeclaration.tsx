import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { lireErreurBase, phraseErreur } from '@/data/messagesBase'
import { declarerIntervenant } from '@/data/personnes'
import { AnnonceSuivante } from '@/features/connexion/AnnonceSuivante'
import { messagesConnexion } from '@/features/connexion/messages'
import { EcranDeclaration } from '@/features/declaration/EcranDeclaration'
import { accueil } from '@/features/navigation/profils'
import { seDeconnecter } from '@/features/session/actions'
import { useEtatVerifie } from '@/features/session/contexte'
import { retourValide } from '@/features/session/decisions'
import { rafraichirSession } from '@/features/session/useEtatSession'
import { motifDeclaration, prenomPropose } from '@/lib/metier/declaration'

/**
 * /qui-utilise : l'écran de déclaration relié à la base (T56). Après la connexion ou le rappel du
 * jour (T63, le prénom de la veille déjà proposé), la session est relue et la garde ouvre
 * l'adresse demandée (les conditions d'abord, si la personne ne les a pas acceptées, T61). Après
 * « Ce n'est pas moi » (`?changer=1`), depuis l'outil ou depuis l'écran des conditions, la page
 * revient elle-même à la page quittée, et la garde montre les conditions à la nouvelle personne
 * qui ne les a pas encore acceptées. Quand l'écran suit le choix du mot de passe ou l'activation
 * de la double authentification, il en dit la réussite (m037, m045).
 */
export function PageDeclaration() {
  const etat = useEtatVerifie()
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()
  /** Refus du prénom par la base (T56) : sous le champ, comme le contrôle avant l'envoi. */
  const [erreurPrenom, setErreurPrenom] = useState<string>()

  // La garde de la zone ne laisse passer que ces trois états.
  if (etat.statut !== 'declaration' && etat.statut !== 'connecte' && etat.statut !== 'conditions') {
    return null
  }
  const changement = etat.statut !== 'declaration'
  const { compte } = etat
  const retour = retourValide(parametres.get('retour'), compte.type) ?? accueil(compte.type)
  const precedente = etat.statut === 'declaration' ? etat.declaration : null

  async function declarer(prenom: string) {
    setErreur(undefined)
    setErreurPrenom(undefined)
    setEnCours(true)
    try {
      await declarerIntervenant(prenom, motifDeclaration(changement, precedente, prenom))
      await rafraichirSession()
      if (changement) void navigate(retour, { replace: true })
    } catch (echec) {
      // Par la table de traduction (m270, m271) : seule une coupure dit « La connexion a échoué ».
      // Les seuls refus de saisie de declarer_intervenant portent sur le prénom : sous le champ.
      const lue = lireErreurBase(echec)
      if (lue.genre === 'message' && lue.nature === 'refus') setErreurPrenom(lue.message)
      else setErreur(phraseErreur(echec, { connexion: messagesConnexion.echecReseau }))
      setEnCours(false)
    }
  }

  return (
    <EcranDeclaration
      libelleCompte={compte.libelle}
      prenomPropose={prenomPropose(changement, precedente)}
      onDeclare={(prenom) => void declarer(prenom)}
      onSignOut={() => void seDeconnecter()}
      onCancel={changement ? () => void navigate(retour, { replace: true }) : undefined}
      enCours={enCours}
      erreur={erreur}
      erreurPrenom={erreurPrenom}
      annonce={<AnnonceSuivante dans="colonne" />}
    />
  )
}
