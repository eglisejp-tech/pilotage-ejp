import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { EcranConnexion } from '@/features/connexion/EcranConnexion'
import { messagesConnexion } from '@/features/connexion/messages'
import type { ValeursConnexion } from '@/features/connexion/schemas'
import { seConnecterAvecGoogle, seConnecterAvecMotDePasse } from '@/features/session/actions'
import { erreurDeRetourGoogle } from '@/features/session/erreurs'
import { avecRetour, ADRESSE_CONNEXION } from '@/features/session/decisions'
import { effacerMotif, lireMotif } from '@/features/session/motif'

const MESSAGES_MOTIF = {
  'connexion-expiree': messagesConnexion.connexionExpiree,
  'session-expiree': messagesConnexion.sessionExpiree,
} as const

/** /connexion : écran 16 relié à Supabase Auth. La garde envoie ensuite vers le code. */
export function PageConnexion() {
  const { search, hash } = useLocation()
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const retour = parametres.get('retour')
  const erreurGoogle = erreurDeRetourGoogle(search, hash)

  const [erreur, setErreur] = useState<string | undefined>(() => {
    if (erreurGoogle) return erreurGoogle
    const motif = lireMotif()
    return motif ? MESSAGES_MOTIF[motif] : undefined
  })
  const [enCours, setEnCours] = useState<'google' | 'mot-de-passe'>()

  // Le motif est annoncé une fois ; les paramètres d'erreur de Google quittent l'adresse.
  useEffect(() => {
    effacerMotif()
    if (erreurGoogle) void navigate(avecRetour(ADRESSE_CONNEXION, retour), { replace: true })
  }, [erreurGoogle, navigate, retour])

  async function connecter(valeurs: ValeursConnexion) {
    setErreur(undefined)
    setEnCours('mot-de-passe')
    const resultat = await seConnecterAvecMotDePasse(valeurs)
    // Réussite : la garde affiche l'écran suivant, le bouton reste « en cours » jusque-là.
    if (resultat.erreur) {
      setErreur(resultat.erreur)
      setEnCours(undefined)
    }
  }

  async function continuerAvecGoogle() {
    setErreur(undefined)
    setEnCours('google')
    const resultat = await seConnecterAvecGoogle(retour)
    if (resultat.erreur) {
      setErreur(resultat.erreur)
      setEnCours(undefined)
    }
  }

  return (
    <EcranConnexion
      onSubmit={(valeurs) => void connecter(valeurs)}
      onGoogle={() => void continuerAvecGoogle()}
      enCours={enCours}
      erreur={erreur}
    />
  )
}
