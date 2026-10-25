import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * Ouvre un `<dialog>` en fenêtre modale dès son arrivée (proposition 20, T69) : le navigateur
 * rend le reste de la page inerte (Tab et Maj+Tab restent dans la fenêtre) et pose le fond. Le
 * focus va sur la fenêtre elle-même, qui annonce son titre et sa phrase ; Échap appelle
 * `onAnnuler` (jamais la fermeture du navigateur : c'est l'écran qui retire la fenêtre) ; à son
 * départ, le focus revient à l'élément d'où elle a été ouverte. Si cet élément a disparu (bouton
 * remplacé), l'écran choisit où va le focus (LISEZMOI, 13).
 *
 * Sans `showModal` (jsdom, tests unitaires), la fenêtre s'ouvre par l'attribut `open`.
 */
export function useFenetreModale(
  fenetre: RefObject<HTMLDialogElement | null>,
  onAnnuler: () => void,
) {
  const annuler = useRef(onAnnuler)
  useEffect(() => {
    annuler.current = onAnnuler
  })
  // Gardée d'un montage à l'autre : sous StrictMode, au remontage, le focus est déjà dedans.
  const origine = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const dialogue = fenetre.current
    if (!dialogue) return
    const actuel = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (actuel === null || !dialogue.contains(actuel)) origine.current = actuel
    if (!dialogue.open) {
      if (typeof dialogue.showModal === 'function') dialogue.showModal()
      else dialogue.setAttribute('open', '')
    }
    dialogue.focus()

    // Échap : la touche, et l'événement du navigateur qui suivrait (« cancel ») ; le navigateur
    // ne ferme jamais la fenêtre lui-même.
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key !== 'Escape') return
      evenement.preventDefault()
      annuler.current()
    }
    const surAnnulation = (evenement: Event) => {
      evenement.preventDefault()
      annuler.current()
    }
    // Fermée malgré tout par le navigateur (Échap répété sans autre geste) : elle se rouvre,
    // l'écran décide (« Annuler » ou l'action).
    const surFermeture = () => {
      if (dialogue.isConnected && typeof dialogue.showModal === 'function') dialogue.showModal()
    }
    dialogue.addEventListener('keydown', surTouche)
    dialogue.addEventListener('cancel', surAnnulation)
    dialogue.addEventListener('close', surFermeture)
    return () => {
      dialogue.removeEventListener('keydown', surTouche)
      dialogue.removeEventListener('cancel', surAnnulation)
      dialogue.removeEventListener('close', surFermeture)
    }
  }, [fenetre])

  // Au départ de la fenêtre (après son retrait de la page) : le focus revient à son origine.
  // Toujours dans la page (StrictMode remonte l'effet) : rien ne bouge.
  useEffect(() => {
    const dialogue = fenetre.current
    return () => {
      if (dialogue?.isConnected) return
      if (origine.current?.isConnected) origine.current.focus()
      origine.current = null
    }
  }, [fenetre])
}
