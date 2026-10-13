import { useSyncExternalStore } from 'react'
import { abonnerAnnonceDePage, lireAnnonceDePage } from '@/features/connexion/changementEcran'

/**
 * Région invisible qui dit le nom du nouvel écran aux lecteurs d'écran (m254) : « Ma fiche »,
 * « Code de vérification ». Toujours dans la page, vide à l'ouverture, pour que le changement de
 * son texte soit annoncé. `aria-live="polite"` (ce que donne `role="status"`) sans le rôle : les
 * réussites des saisies restent les seules régions « status » de la page.
 */
export function AnnonceDePage() {
  const annonce = useSyncExternalStore(abonnerAnnonceDePage, lireAnnonceDePage, () => '')
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" data-annonce-page>
      {annonce}
    </div>
  )
}
