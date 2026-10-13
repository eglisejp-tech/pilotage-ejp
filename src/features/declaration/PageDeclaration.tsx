import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { lireErreurBase, phraseErreur } from '@/data/messagesBase'
import { declarerIntervenant } from '@/data/personnes'
import { messagesConnexion } from '@/features/connexion/messages'
import { EcranDeclaration } from '@/features/declaration/EcranDeclaration'
import { accueil } from '@/features/navigation/profils'
import { seDeconnecter } from '@/features/session/actions'
import { useEtatVerifie } from '@/features/session/contexte'
import { retourValide } from '@/features/session/decisions'
import { rafraichirSession } from '@/features/session/useEtatSession'
import { motifDeclaration } from '@/lib/metier/declaration'

/**
 * /qui-utilise : l'écran de déclaration relié à la base (T56). Après la connexion ou le rappel des
 * 7 jours, la session est relue et la garde ouvre l'adresse demandée. Après « Ce n'est pas moi »
 * (`?changer=1`), la page revient elle-même à la page quittée.
 */
export function PageDeclaration() {
  const etat = useEtatVerifie()
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()
  /** Refus du prénom par la base (T56) : sous le champ, comme le contrôle avant l'envoi. */
  const [erreurPrenom, setErreurPrenom] = useState<string>()

  // La garde de la zone ne laisse passer que ces deux états.
  if (etat.statut !== 'declaration' && etat.statut !== 'connecte') return null
  const changement = etat.statut === 'connecte'
  const { compte } = etat
  const retour = retourValide(parametres.get('retour'), compte.type) ?? accueil(compte.type)

  async function declarer(prenom: string) {
    setErreur(undefined)
    setErreurPrenom(undefined)
    setEnCours(true)
    try {
      const precedente = etat.statut === 'declaration' ? etat.declaration : null
      await declarerIntervenant(prenom, motifDeclaration(changement, precedente))
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
      onDeclare={(prenom) => void declarer(prenom)}
      onSignOut={() => void seDeconnecter()}
      onCancel={changement ? () => void navigate(retour, { replace: true }) : undefined}
      enCours={enCours}
      erreur={erreur}
      erreurPrenom={erreurPrenom}
    />
  )
}
