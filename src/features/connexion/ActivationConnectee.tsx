import { useCallback, useEffect, useRef, useState } from 'react'
import type { Compte } from '@/data/compte'
import { EcranActivation } from '@/features/connexion/EcranActivation'
import { preparerActivation, seDeconnecter, verifierCode } from '@/features/session/actions'
import type { Activation } from '@/features/session/actions'

type Proprietes = { compte: Compte }

/**
 * Écran 17 relié à Supabase : enrôlement à l'ouverture, QR code affiché une seule fois (jamais
 * gardé ailleurs que dans cet écran), puis vérification du premier code.
 */
export function ActivationConnectee({ compte }: Proprietes) {
  const [activation, setActivation] = useState<Activation>()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()
  const lancee = useRef(false)

  const preparer = useCallback(async () => {
    const resultat = await preparerActivation()
    if ('erreur' in resultat) setErreur(resultat.erreur)
    else setActivation(resultat)
  }, [])

  // Un seul enrôlement, même quand React rejoue les effets en développement.
  useEffect(() => {
    if (lancee.current) return
    lancee.current = true
    void preparer()
  }, [preparer])

  async function verifier(code: string) {
    setErreur(undefined)
    setEnCours(true)
    if (!activation) {
      // L'enrôlement avait échoué : nouvel essai, puis nouveau QR code à scanner.
      await preparer()
      setEnCours(false)
      return
    }
    const resultat = await verifierCode(activation.facteurId, code)
    if (resultat.erreur) {
      setErreur(resultat.erreur)
      setEnCours(false)
    }
  }

  return (
    <EcranActivation
      libelleCompte={compte.libelle}
      comptePartage={compte.type === 'ministere'}
      qrCode={activation?.qrCode}
      cle={activation?.cle}
      onVerifyCode={(code) => void verifier(code)}
      onSignOut={() => void seDeconnecter()}
      enCours={enCours}
      erreur={erreur}
    />
  )
}
