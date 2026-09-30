import type { RouteObject } from 'react-router'
import { MiseEnPage } from '@/app/MiseEnPage'
import { CetteSemaine } from '@/pages/CetteSemaine'
import { PageIntrouvable } from '@/pages/PageIntrouvable'

// Routes de l'application. La navigation par profil arrive à l'étape 2 (BRIEF section 13).
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MiseEnPage />,
    children: [
      { index: true, element: <CetteSemaine /> },
      { path: '*', element: <PageIntrouvable /> },
    ],
  },
]
