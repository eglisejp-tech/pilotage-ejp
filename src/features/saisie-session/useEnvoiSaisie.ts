import { useCallback, useRef, useState } from 'react'
import { messageErreurEnvoi } from '@/features/saisie-session/erreurs'

/** Phrase sous le bouton quand la personne renvoie ce qui vient d'être enregistré. */
export const MESSAGE_DEJA_ENREGISTRE =
  'Cette saisie est déjà enregistrée. Changez un chiffre pour la corriger.'

export interface EtatEnvoi {
  enCours: boolean
  /** Envoi refusé : message de la base, ou null pour un problème de connexion. */
  echec: { message: string | null } | null
  /** Dernière réussite et son numéro d'envoi (`MessageReussite`). */
  reussite: { message: string; envoi: number } | null
  /**
   * Envoie, puis note la réussite (avec son message) ou l'échec. Les valeurs restent. `signature`
   * résume ce qui part (les champs du formulaire) : renvoyer la même signature après une
   * réussite n'envoie rien (un second clic ne double ni les lignes ni le journal).
   */
  envoyer: (action: () => Promise<void>, message: string, signature: string) => Promise<boolean>
  /** Le formulaire contient-il exactement ce qui vient d'être enregistré ? */
  dejaEnvoye: (signature: string) => boolean
  /** La personne a-t-elle essayé de renvoyer la même chose (la phrase s'affiche) ? */
  doublonRefuse: (signature: string) => boolean
}

/** État d'envoi d'un formulaire de saisie : en cours, échec, réussite (LISEZMOI, « États »). */
export function useEnvoiSaisie(): EtatEnvoi {
  const [enCours, setEnCours] = useState(false)
  const [echec, setEchec] = useState<EtatEnvoi['echec']>(null)
  const [reussite, setReussite] = useState<EtatEnvoi['reussite']>(null)
  const [signatureEnvoyee, setSignatureEnvoyee] = useState<string | null>(null)
  const [signatureRefusee, setSignatureRefusee] = useState<string | null>(null)
  // Numéro des envois réussis : il ne revient jamais en arrière, même après un échec.
  const envois = useRef(0)
  // Lus sans attendre le rendu : deux appuis très rapprochés ne partent qu'une fois.
  const verrou = useRef(false)
  const derniere = useRef<string | null>(null)

  const envoyer = useCallback(
    async (action: () => Promise<void>, message: string, signature: string) => {
      if (verrou.current) return false
      if (derniere.current === signature) {
        setSignatureRefusee(signature)
        return false
      }
      verrou.current = true
      setEnCours(true)
      setEchec(null)
      setSignatureRefusee(null)
      try {
        await action()
        envois.current += 1
        derniere.current = signature
        setSignatureEnvoyee(signature)
        setReussite({ message, envoi: envois.current })
        return true
      } catch (erreur) {
        setReussite(null)
        setEchec({ message: messageErreurEnvoi(erreur) })
        return false
      } finally {
        verrou.current = false
        setEnCours(false)
      }
    },
    [],
  )

  return {
    enCours,
    echec,
    reussite,
    envoyer,
    dejaEnvoye: (signature) => signatureEnvoyee === signature,
    doublonRefuse: (signature) => signatureRefusee === signature,
  }
}
