import type { RouteObject } from 'react-router'
import { MiseEnPageConnectee } from '@/app/MiseEnPageConnectee'
import { ApercuConnexion } from '@/features/connexion/apercu/ApercuConnexion'
import { PageAcces } from '@/features/connexion/PageAcces'
import { PageChoixMotDePasse } from '@/features/connexion/PageChoixMotDePasse'
import { PageCompteDesactive } from '@/features/connexion/PageCompteDesactive'
import { PageConnexion } from '@/features/connexion/PageConnexion'
import { PageDoubleAuthentification } from '@/features/connexion/PageDoubleAuthentification'
import { PageMotDePasseOublie } from '@/features/connexion/PageMotDePasseOublie'
import { ApercuNavigation } from '@/features/navigation/apercu/ApercuNavigation'
import { MiseEnPageApercu } from '@/features/navigation/apercu/MiseEnPageApercu'
import { ADRESSES_APPLICATION } from '@/features/navigation/profils'
import { Garde } from '@/features/session/Garde'
import { ApercuCetteSemaine } from '@/pages/ApercuCetteSemaine'
import { ErreurApplication } from '@/pages/ErreurApplication'
import { PageApplication } from '@/pages/PageApplication'
import { PageConditions } from '@/pages/PageConditions'
import { PageConfidentialite } from '@/pages/PageConfidentialite'
import { PageIntrouvable } from '@/pages/PageIntrouvable'

// Aperçus de développement : écrans sans appel au serveur, pour la revue et les tests Playwright.
// import.meta.env.DEV vaut false au build : les routes et leur code sortent du bundle de production.
const routesDeDeveloppement: RouteObject[] = import.meta.env.DEV
  ? [
      { path: '/apercu/connexion', element: <ApercuConnexion /> },
      {
        path: '/apercu',
        element: <MiseEnPageApercu />,
        children: [
          { path: 'cette-semaine', element: <ApercuCetteSemaine /> },
          { path: 'navigation', element: <ApercuNavigation /> },
        ],
      },
    ]
  : []

// Routes de l'application (BRIEF section 9, « Adresses »). Chaque zone a sa garde (section 8,
// règle 7) ; dans l'application, chaque adresse vérifie ensuite le profil (PageApplication).
export const routes: RouteObject[] = [
  {
    errorElement: <ErreurApplication />,
    children: [
      ...routesDeDeveloppement,
      { path: '/acces', element: <PageAcces /> },
      { path: '/confidentialite', element: <PageConfidentialite /> },
      { path: '/conditions', element: <PageConditions /> },
      { path: '/compte-desactive', element: <PageCompteDesactive /> },
      {
        element: <Garde zone="connexion" />,
        children: [
          { path: '/connexion', element: <PageConnexion /> },
          { path: '/connexion/mot-de-passe-oublie', element: <PageMotDePasseOublie /> },
        ],
      },
      {
        element: <Garde zone="mot-de-passe" />,
        children: [{ path: '/acces/mot-de-passe', element: <PageChoixMotDePasse /> }],
      },
      {
        element: <Garde zone="double-authentification" />,
        children: [{ path: '/double-authentification', element: <PageDoubleAuthentification /> }],
      },
      {
        element: (
          <Garde zone="application">
            <MiseEnPageConnectee />
          </Garde>
        ),
        children: [
          ...ADRESSES_APPLICATION.map((adresse) => ({
            path: adresse.chemin,
            element: <PageApplication adresse={adresse} />,
          })),
          { path: '*', element: <PageIntrouvable /> },
        ],
      },
    ],
  },
]
