import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ListeIncidents } from '@/features/moderation/ListeIncidents'
import type { ContenuIncidents } from '@/features/moderation/ListeIncidents'
import { incidentsExemple } from '@/features/moderation/apercu/incidentsExemple'

/**
 * Aperçu de la liste « Incidents d'envoi » de la Modération (T76, lot C), sans base. Sur
 * /apercu/moderation : `incidents=liste` (défaut : l'incident de Coordination du 26 octobre 2026 et
 * quelques autres, 73 au total, « Afficher 50 de plus »), `vide`, `chargement` ou `probleme`.
 */
export function ApercuIncidents() {
  const [parametres] = useSearchParams()
  const vue = parametres.get('incidents')
  const [pages, setPages] = useState(1)
  let contenu: ContenuIncidents
  if (vue === 'chargement') contenu = { etat: 'chargement' }
  else if (vue === 'probleme') contenu = { etat: 'probleme', reessayer: () => undefined }
  else if (vue === 'vide') {
    contenu = { etat: 'liste', lignes: [], total: 0, plus: null, plusEnCours: false }
  } else {
    const lignes = incidentsExemple(pages)
    contenu = {
      etat: 'liste',
      lignes,
      total: lignes[0]?.total ?? 0,
      plus: pages === 1 ? () => setPages(2) : null,
      plusEnCours: false,
    }
  }
  return <ListeIncidents contenu={contenu} />
}
