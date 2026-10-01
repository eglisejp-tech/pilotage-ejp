import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { EcranAcces } from '@/features/connexion/EcranAcces'
import { verifierLien } from '@/features/session/actions'
import { ADRESSE_MOT_DE_PASSE } from '@/features/session/decisions'
import type { EtapeMotDePasse } from '@/features/session/motDePasseAChoisir'

/** `type` du lien de l'email (modèles Invite user et Reset password, BRIEF section 8). */
function etapeDuLien(type: string | null): EtapeMotDePasse | null {
  if (type === 'invite') return 'invitation'
  if (type === 'recovery') return 'recuperation'
  return null
}

/**
 * /acces?token_hash=...&type=invite|recovery : bouton « Continuer », puis verifyOtp. Après la
 * vérification, le jeton quitte l'adresse (remplacement dans l'historique).
 */
export function PageAcces() {
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const type = parametres.get('type')
  const etape = etapeDuLien(type)
  const [tokenHash] = useState(() => parametres.get('token_hash'))
  const [lienInvalide, setLienInvalide] = useState(!tokenHash || !etape)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string>()

  async function continuer() {
    if (!tokenHash || !etape) return
    setErreur(undefined)
    setEnCours(true)
    const resultat = await verifierLien(tokenHash, etape)
    if (resultat.etat === 'valide') {
      void navigate(ADRESSE_MOT_DE_PASSE, { replace: true })
      return
    }
    setEnCours(false)
    if (resultat.etat === 'invalide') {
      setLienInvalide(true)
      void navigate({ pathname: '/acces', search: type ? `?type=${type}` : '' }, { replace: true })
    } else {
      setErreur(resultat.erreur)
    }
  }

  return (
    <EcranAcces
      type={etape ?? 'recuperation'}
      onContinue={() => void continuer()}
      enCours={enCours}
      lienInvalide={lienInvalide}
      erreur={erreur}
    />
  )
}
