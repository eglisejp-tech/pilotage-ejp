import type { RouteObject } from 'react-router'
import { MiseEnPage } from '@/app/MiseEnPage'
import { ApercuConnexion } from '@/features/connexion/apercu/ApercuConnexion'
import { ApercuCetteSemaine } from '@/pages/ApercuCetteSemaine'
import { CetteSemaine } from '@/pages/CetteSemaine'
import { PageIntrouvable } from '@/pages/PageIntrouvable'

// Aperçus de développement : écrans sans appel au serveur, pour la revue et les tests Playwright.
// import.meta.env.DEV vaut false au build : les routes et leur code sortent du bundle de production.
// Les écrans de connexion ont leur propre mise en page ; « Cette semaine » s'affiche sous l'en-tête commun.
const routesDeDeveloppement: RouteObject[] = import.meta.env.DEV
  ? [{ path: '/apercu/connexion', element: <ApercuConnexion /> }]
  : []
const apercus: RouteObject[] = import.meta.env.DEV
  ? [{ path: 'apercu/cette-semaine', element: <ApercuCetteSemaine /> }]
  : []

// Routes de l'application. La navigation par profil arrive à l'étape 2 (BRIEF section 13).
export const routes: RouteObject[] = [
  ...routesDeDeveloppement,
  {
    path: '/',
    element: <MiseEnPage />,
    children: [
      { index: true, element: <CetteSemaine /> },
      ...apercus,
      { path: '*', element: <PageIntrouvable /> },
    ],
  },
]
