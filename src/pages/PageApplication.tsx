import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'
import { lecteurDuCompte } from '@/features/cette-semaine/lecteur'
import { accueil, titrePour } from '@/features/navigation/profils'
import type { AdresseApplication } from '@/features/navigation/profils'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageAVenir } from '@/pages/PageAVenir'
import { PageCetteSemaine } from '@/pages/PageCetteSemaine'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

type Proprietes = { adresse: AdresseApplication }

/**
 * Écran d'une adresse de l'application : le type de compte est vérifié avant tout affichage et
 * tout appel de données. Les écrans pas encore construits affichent leur étape.
 */
export function PageApplication({ adresse }: Proprietes) {
  const compte = useCompteConnecte()
  const { id } = useParams()
  const lecteur = useMemo(() => lecteurDuCompte(compte), [compte])

  if (adresse.chemin === '/' && compte.type === 'admin_plateforme') {
    return <Navigate to={accueil(compte.type)} replace />
  }
  if (
    adresse.chemin === '/ministeres/:id' &&
    compte.type === 'ministere' &&
    id === compte.ministereId
  ) {
    return <Navigate to="/ma-fiche" replace />
  }
  if (!adresse.profils.includes(compte.type)) return <PageNonDisponible />
  if (adresse.chemin === '/') {
    return lecteur ? <PageCetteSemaine lecteur={lecteur} /> : <PageNonDisponible />
  }
  return <PageAVenir titre={titrePour(adresse, compte.type)} etape={adresse.etape} />
}
