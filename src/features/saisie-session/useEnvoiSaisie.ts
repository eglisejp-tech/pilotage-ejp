import { useCallback, useRef, useState } from 'react'
import { messageErreurEnvoi } from '@/features/saisie-session/erreurs'

export interface EtatEnvoi {
  enCours: boolean
  /** Envoi refusé : message de la base, ou null pour un problème de connexion. */
  echec: { message: string | null } | null
  /** Dernière réussite et son numéro d'envoi (`MessageReussite`). */
  reussite: { message: string; envoi: number } | null
  /** Envoie, puis note la réussite (avec son message) ou l'échec. Les valeurs restent. */
  envoyer: (action: () => Promise<void>, message: string) => Promise<boolean>
}

/** État d'envoi d'un formulaire de saisie : en cours, échec, réussite (LISEZMOI, « États »). */
export function useEnvoiSaisie(): EtatEnvoi {
  const [enCours, setEnCours] = useState(false)
  const [echec, setEchec] = useState<EtatEnvoi['echec']>(null)
  const [reussite, setReussite] = useState<EtatEnvoi['reussite']>(null)
  // Numéro des envois réussis : il ne revient jamais en arrière, même après un échec.
  const envois = useRef(0)

  const envoyer = useCallback(async (action: () => Promise<void>, message: string) => {
    setEnCours(true)
    setEchec(null)
    try {
      await action()
      envois.current += 1
      setReussite({ message, envoi: envois.current })
      return true
    } catch (erreur) {
      setReussite(null)
      setEchec({ message: messageErreurEnvoi(erreur) })
      return false
    } finally {
      setEnCours(false)
    }
  }, [])

  return { enCours, echec, reussite, envoyer }
}
