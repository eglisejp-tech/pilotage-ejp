import { useState } from 'react'
import { EcranMotDePasseOublie } from '@/features/connexion/EcranMotDePasseOublie'
import type { ValeursMotDePasseOublie } from '@/features/connexion/schemas'
import { demanderLien } from '@/features/session/actions'

/** /connexion/mot-de-passe-oublie : resetPasswordForEmail, toujours le même message. */
export function PageMotDePasseOublie() {
  const [enCours, setEnCours] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string>()

  async function envoyer(valeurs: ValeursMotDePasseOublie) {
    setErreur(undefined)
    setEnCours(true)
    const resultat = await demanderLien(valeurs)
    setEnCours(false)
    if (resultat.erreur) setErreur(resultat.erreur)
    else setEnvoye(true)
  }

  return (
    <EcranMotDePasseOublie
      onSubmit={(valeurs) => void envoyer(valeurs)}
      enCours={enCours}
      envoye={envoye}
      erreur={erreur}
    />
  )
}
