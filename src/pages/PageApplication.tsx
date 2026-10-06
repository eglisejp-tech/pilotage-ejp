import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'
import { lecteurDuCompte } from '@/features/cette-semaine/lecteur'
import { titrePour } from '@/features/navigation/profils'
import type { AdresseApplication } from '@/features/navigation/profils'
import { useCompteConnecte } from '@/features/session/contexte'
import { PageAVenir } from '@/pages/PageAVenir'
import { PageCetteSemaine } from '@/pages/PageCetteSemaine'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import { PAGES_DES_ADRESSES } from '@/pages/pagesDesAdresses'

type Proprietes = { adresse: AdresseApplication }

/**
 * Écran d'une adresse de l'application : le type de compte est vérifié avant tout affichage et
 * tout appel de données. Chaque adresse a sa page (`PAGES_DES_ADRESSES`) ; les écrans pas encore
 * construits affichent leur étape. « / » est
 * « Cette semaine » pour tous les profils, EJP Tech compris (en lecture seule, T29), même si
 * l'accueil d'EJP Tech après la connexion reste /moderation.
 */
export function PageApplication({ adresse }: Proprietes) {
  const compte = useCompteConnecte()
  const { id } = useParams()
  const lecteur = useMemo(() => lecteurDuCompte(compte), [compte])

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
  const titre = titrePour(adresse, compte.type)
  const Page = PAGES_DES_ADRESSES[adresse.chemin]
  return Page ? <Page titre={titre} /> : <PageAVenir titre={titre} etape={adresse.etape} />
}
