import { useState } from 'react'
import type { Compte } from '@/data/compte'
import { EcranCode } from '@/features/connexion/EcranCode'
import { seDeconnecter, verifierCode } from '@/features/session/actions'

type Proprietes = {
  compte: Compte
  /** Premier facteur TOTP vérifié du compte. */
  facteurId: string
}

/** Écran 18 relié à Supabase : mfa.challengeAndVerify, puis la garde ouvre l'application. */
export function CodeConnecte({ compte, facteurId }: Proprietes) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()

  async function verifier(code: string) {
    setErreur(undefined)
    setEnCours(true)
    const resultat = await verifierCode(facteurId, code)
    if (resultat.erreur) {
      setErreur(resultat.erreur)
      setEnCours(false)
    }
  }

  return (
    <EcranCode
      libelleCompte={compte.libelle}
      onVerifyCode={(code) => void verifier(code)}
      onSignOut={() => void seDeconnecter()}
      enCours={enCours}
      erreur={erreur}
    />
  )
}
