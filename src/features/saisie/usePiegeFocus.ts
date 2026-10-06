import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCALISABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Fenêtre modale : le focus entre dans l'élément à l'ouverture, Tab et Maj+Tab y restent, Échap
 * la ferme, et le focus revient où il était à la fermeture. Sans effet quand `actif` est faux
 * (saisie en page entière sous 600 px).
 */
export function usePiegeFocus(
  element: RefObject<HTMLElement | null>,
  actif: boolean,
  onFermer: () => void,
) {
  // Dernière fonction de fermeture, sans relancer l'effet (et le focus) à chaque rendu.
  const fermer = useRef(onFermer)
  useEffect(() => {
    fermer.current = onFermer
  })

  useEffect(() => {
    const racine = element.current
    if (!actif || !racine) return
    const precedent = document.activeElement instanceof HTMLElement ? document.activeElement : null
    racine.focus()

    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        fermer.current()
        return
      }
      if (evenement.key !== 'Tab') return
      const liste = Array.from(racine.querySelectorAll<HTMLElement>(FOCALISABLES))
      const premier = liste[0]
      const dernier = liste.at(-1)
      if (!premier || !dernier) {
        evenement.preventDefault()
        return
      }
      const courant = document.activeElement
      if (evenement.shiftKey && (courant === premier || courant === racine)) {
        evenement.preventDefault()
        dernier.focus()
      } else if (!evenement.shiftKey && courant === dernier) {
        evenement.preventDefault()
        premier.focus()
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => {
      document.removeEventListener('keydown', surTouche)
      precedent?.focus()
    }
  }, [element, actif])
}
