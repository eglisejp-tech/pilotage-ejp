import type { RouteObject } from 'react-router'
import { MiseEnPage } from '@/app/MiseEnPage'
import { ApercuCetteSemaine } from '@/pages/ApercuCetteSemaine'
import { CetteSemaine } from '@/pages/CetteSemaine'
import { PageIntrouvable } from '@/pages/PageIntrouvable'

// Aperçus des écrans avec les données d'exemple, en développement seulement : le build de
// production remplace import.meta.env.DEV par false et n'embarque ni la page ni ses données.
const apercus: RouteObject[] = import.meta.env.DEV
  ? [{ path: 'apercu/cette-semaine', element: <ApercuCetteSemaine /> }]
  : []

// Routes de l'application. La navigation par profil arrive à l'étape 2 (BRIEF section 13).
export const routes: RouteObject[] = [
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
