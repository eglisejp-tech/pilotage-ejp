import { useCallback, useEffect, useRef, useState } from 'react'
import type { Compte } from '@/data/compte'
import { AnnonceSuivante } from '@/features/connexion/AnnonceSuivante'
import { ANNONCE_DOUBLE_AUTHENTIFICATION } from '@/features/connexion/reussiteEnAttente'
import { EcranActivation } from '@/features/connexion/EcranActivation'
import { messagesConnexion } from '@/features/connexion/messages'
import { preparerActivation, seDeconnecter, verifierCode } from '@/features/session/actions'
import type { Activation } from '@/features/session/actions'

type Proprietes = { compte: Compte }

/**
 * Écran 17 relié à Supabase : enrôlement à l'ouverture, QR code affiché une seule fois (jamais
 * gardé ailleurs que dans cet écran), puis vérification du premier code. Un enrôlement en échec
 * se dit dans le cadre du QR code, avec « Réessayer » (m044) ; le premier code accepté est
 * confirmé sur l'écran suivant (m045).
 */
export function ActivationConnectee({ compte }: Proprietes) {
  const [activation, setActivation] = useState<Activation>()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()
  const [qrEnEchec, setQrEnEchec] = useState(false)
  const [qrRefus, setQrRefus] = useState<string>()
  const lancee = useRef(false)

  const preparer = useCallback(async () => {
    setQrEnEchec(false)
    setQrRefus(undefined)
    const resultat = await preparerActivation()
    if (!('erreur' in resultat)) setActivation(resultat)
    // Connexion perdue : un nouvel essai peut réussir, le cadre propose « Réessayer ». Tout autre
    // refus (trop de tentatives, compte désactivé, connexion expirée) se dit tel que traduit.
    else if (resultat.erreur === messagesConnexion.echecReseau) setQrEnEchec(true)
    else setQrRefus(resultat.erreur)
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
      // Pas de QR code affiché : nouvel essai de l'enrôlement, puis nouveau QR code à scanner.
      await preparer()
      setEnCours(false)
      return
    }
    const resultat = await verifierCode(activation.facteurId, code, ANNONCE_DOUBLE_AUTHENTIFICATION)
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
      qrEnEchec={qrEnEchec}
      onReessayerQr={() => void preparer()}
      qrRefus={qrRefus}
      onVerifyCode={(code) => void verifier(code)}
      onSignOut={() => void seDeconnecter()}
      enCours={enCours}
      erreur={erreur}
      annonce={<AnnonceSuivante dans="colonne" />}
    />
  )
}
