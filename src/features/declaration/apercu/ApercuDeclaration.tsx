import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { messagesConnexion } from '@/features/connexion/messages'
import { EcranDeclaration } from '@/features/declaration/EcranDeclaration'

/**
 * Aperçu de développement de l'écran « Qui utilise l'outil ? » (T56), sans base ni requête.
 * Adresse : /apercu/qui-utilise. `?changer=1` : ouvert par « Ce n'est pas moi » (avec
 * « Annuler ») ; `?etat=rappel` : rappel du jour, le prénom de la veille proposé (T63) ;
 * `?etat=erreur` : l'enregistrement a échoué ; `?etat=envoi` : envoi en cours. Une déclaration
 * valide s'affiche sous l'écran, sans rien enregistrer.
 */
export function ApercuDeclaration() {
  const [parametres] = useSearchParams()
  const etat = parametres.get('etat')
  const [simule, setSimule] = useState<string | null>(null)

  return (
    <>
      <EcranDeclaration
        libelleCompte="Ministère Communication"
        prenomPropose={etat === 'rappel' ? 'Marie D.' : undefined}
        onDeclare={(prenom) => setSimule(`Déclaration simulée : ${prenom}.`)}
        onSignOut={() => setSimule('Déconnexion simulée.')}
        onCancel={
          parametres.get('changer') === '1'
            ? () => setSimule('Retour simulé à l’outil.')
            : undefined
        }
        enCours={etat === 'envoi'}
        erreur={etat === 'erreur' ? messagesConnexion.echecReseau : undefined}
      />
      <p role="status" className="mx-auto max-w-[27.5rem] px-5 pb-6 text-sm text-encre-3">
        {simule ?? ''}
      </p>
    </>
  )
}
