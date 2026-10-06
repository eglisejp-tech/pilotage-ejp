import { useEffect, useState } from 'react'
import { DUREE_REUSSITE_MS } from '@/features/saisie/textes'

interface Props {
  /** « Chiffres du dimanche 27 sept. enregistrés. » ; null : rien à dire. */
  message: string | null
  /**
   * Numéro de l'envoi réussi (un compteur que le formulaire augmente à chaque réussite). Deux
   * envois du même dimanche donnent le même texte : sans ce numéro, le second ne s'afficherait pas.
   */
  envoi?: number
  /** Durée d'affichage en millisecondes : 6 secondes par défaut. */
  dureeMs?: number
}

/**
 * Message de réussite après une saisie (LISEZMOI, « Réussite ») : annoncé (`role="status"`),
 * affiché 6 secondes. La région reste dans la page, vide, pour que les lecteurs d'écran annoncent
 * le message à son arrivée.
 */
export function MessageReussite({ message, envoi = 0, dureeMs = DUREE_REUSSITE_MS }: Props) {
  // Un message est masqué quand sa durée est écoulée ; un nouveau message, ou le même message
  // d'un nouvel envoi, s'affiche de nouveau.
  const cle = message === null ? null : `${envoi}:${message}`
  const [masque, setMasque] = useState<string | null>(null)

  useEffect(() => {
    if (cle === null) return
    const minuterie = window.setTimeout(() => setMasque(cle), dureeMs)
    return () => window.clearTimeout(minuterie)
  }, [cle, dureeMs])

  const visible = cle !== null && cle !== masque
  return (
    <div role="status">
      {visible ? (
        <p className="border border-bien bg-papier px-3.5 py-3 text-[15px] leading-normal font-semibold text-bien">
          {message}
        </p>
      ) : null}
    </div>
  )
}
