import { useSyncExternalStore } from 'react'
import { abonnerAnnonceDePage, lireAnnonceDePage } from '@/features/connexion/changementEcran'
import type { Annonce } from '@/features/connexion/changementEcran'

const AUCUNE: Annonce = { texte: '', numero: 0 }

/**
 * Région invisible qui dit le nom du nouvel écran aux lecteurs d'écran (m254) : « Ma fiche »,
 * « Code de vérification ». Toujours dans la page, vide à l'ouverture, pour que le changement de
 * son texte soit annoncé. Chaque annonce remplace son nœud (clé = numéro) : un retour sur un écran
 * du même nom que la dernière annonce est dit de nouveau. `aria-live="polite"` (ce que donne
 * `role="status"`) sans le rôle : les réussites des saisies restent les seules régions « status »
 * de la page.
 */
export function AnnonceDePage() {
  const annonce = useSyncExternalStore(abonnerAnnonceDePage, lireAnnonceDePage, () => AUCUNE)
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" data-annonce-page>
      {annonce.texte !== '' ? <span key={annonce.numero}>{annonce.texte}</span> : null}
    </div>
  )
}
