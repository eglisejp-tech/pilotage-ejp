import { useEffect, useState } from 'react'
import { effacerAnnonceSuivante, lireAnnonceSuivante } from '@/features/connexion/reussiteEnAttente'
import { MessageReussite } from '@/features/saisie/MessageReussite'

/**
 * Réussite de l'étape précédente (« Mot de passe enregistré. », « Double authentification
 * activée. »), en tête de l'écran qui suit. La région `role="status"` existe d'abord vide, et le
 * message y entre juste après : un lecteur d'écran l'annonce. Visible 6 secondes, comme toute
 * réussite (MessageReussite). Sans message en attente, rien n'est rendu ; une fois le message
 * masqué, la région vide ne prend pas de place (dans la colonne des écrans de connexion, une marge
 * négative annule son écart).
 */
export function AnnonceSuivante({ dans }: { dans: 'colonne' | 'page' }) {
  // Lu une fois, au premier affichage de l'écran ; effacé ensuite, pour ne servir qu'une fois.
  const [message] = useState(lireAnnonceSuivante)
  const [pret, setPret] = useState(false)

  useEffect(() => {
    effacerAnnonceSuivante()
  }, [])

  useEffect(() => {
    if (message === null) return
    const minuterie = window.setTimeout(() => setPret(true), 0)
    return () => window.clearTimeout(minuterie)
  }, [message])

  // Rien à dire : aucune région de plus dans la page.
  if (message === null) return null
  return (
    <div className={dans === 'colonne' ? '-mb-6 has-[p]:mb-0' : 'has-[p]:mb-6'}>
      <MessageReussite message={pret ? message : null} />
    </div>
  )
}
