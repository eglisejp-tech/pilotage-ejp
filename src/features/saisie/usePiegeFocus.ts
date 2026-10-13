import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCALISABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Fenêtre modale : le focus entre dans l'élément à l'ouverture, Tab et Maj+Tab y restent, Échap
 * la ferme, et le focus revient où il était à la fermeture. Sans effet quand `actif` est faux
 * (saisie en page entière sous 600 px). Quand l'élément devient une fenêtre alors que le focus y
 * est déjà (téléphone tourné pendant la frappe), le focus reste sur le champ ; et quand il cesse
 * d'en être une sans disparaître, le focus ne part pas vers la page.
 *
 * L'élément d'où le focus est venu est gardé d'un montage à l'autre (`origine`) : sous StrictMode,
 * React monte, démonte puis remonte l'effet ; au remontage, le focus est déjà dans la fenêtre, et
 * l'élément d'origine doit tout de même recevoir le focus à la fermeture.
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
  const origine = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const racine = element.current
    if (!actif || !racine) return
    const actuel = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dejaDedans = actuel !== null && racine.contains(actuel)
    if (!dejaDedans) {
      origine.current = actuel
      racine.focus()
    }

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
      // Toujours là et le focus dedans : la fenêtre devient une page entière (la saisie continue),
      // ou StrictMode remonte l'effet. L'origine reste notée pour la vraie fermeture.
      const restePrise = racine.isConnected && racine.contains(document.activeElement)
      if (restePrise) return
      origine.current?.focus()
      origine.current = null
    }
  }, [element, actif])
}
