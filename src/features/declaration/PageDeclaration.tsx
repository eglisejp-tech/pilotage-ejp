import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { declarerIntervenant } from '@/data/personnes'
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
 * qui ne les a pas encore acceptées.
 */
export function PageDeclaration() {
  const etat = useEtatVerifie()
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()

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
    setEnCours(true)
    try {
      await declarerIntervenant(prenom, motifDeclaration(changement, precedente, prenom))
      await rafraichirSession()
      if (changement) void navigate(retour, { replace: true })
    } catch {
      setErreur(messagesConnexion.echecReseau)
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
    />
  )
}
