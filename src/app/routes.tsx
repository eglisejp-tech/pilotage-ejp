import type { RouteObject } from 'react-router'
import { MiseEnPageConnectee } from '@/app/MiseEnPageConnectee'
import { ApercuAvancement } from '@/features/avancement/apercu/ApercuAvancement'
import { ApercuCalendrier } from '@/features/calendrier/apercu/ApercuCalendrier'
import { ApercuComptes } from '@/features/comptes/apercu/ApercuComptes'
import { ApercuConnexion } from '@/features/connexion/apercu/ApercuConnexion'
import { ApercuEvenements } from '@/features/evenements/apercu/ApercuEvenements'
import { ApercuFiche } from '@/features/fiche/apercu/ApercuFiche'
import { ApercuIndicateurs } from '@/features/indicateurs/configuration/apercu/ApercuIndicateurs'
import { ApercuNouveauPoint } from '@/features/nouveau-point/apercu/ApercuNouveauPoint'
import { ApercuSaisies } from '@/features/saisie/apercu/ApercuSaisies'
import { ApercuSessions } from '@/features/sessions/apercu/ApercuSessions'
import { ApercuSaisiesE4 } from '@/features/saisie-fij/apercu/ApercuSaisiesE4'
import { PageAcces } from '@/features/connexion/PageAcces'
import { PageChoixMotDePasse } from '@/features/connexion/PageChoixMotDePasse'
import { PageCompteDesactive } from '@/features/connexion/PageCompteDesactive'
import { PageConnexion } from '@/features/connexion/PageConnexion'
import { PageDoubleAuthentification } from '@/features/connexion/PageDoubleAuthentification'
import { PageMotDePasseOublie } from '@/features/connexion/PageMotDePasseOublie'
import { ApercuNavigation } from '@/features/navigation/apercu/ApercuNavigation'
import { MiseEnPageApercu } from '@/features/navigation/apercu/MiseEnPageApercu'
import { ADRESSES_APPLICATION } from '@/features/navigation/profils'
import { ApercuPoints } from '@/features/points/apercu/ApercuPoints'
import { Garde } from '@/features/session/Garde'
import { ApercuActionsPoint } from '@/features/points-actions/apercu/ApercuActionsPoint'
import { ApercuSignalements } from '@/features/signalement/apercu/ApercuSignalements'
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
          { path: 'avancement', element: <ApercuAvancement /> },
          // Lot L1 : écran 13, « Ministères et comptes » (actions simulées, aucune requête).
          { path: 'comptes', element: <ApercuComptes /> },
          // Étape 4 : fiche (E2), saisies (E3, E4) et événements (E5, E6), lus par aide.spec.ts.
          { path: 'fiche', element: <ApercuFiche /> },
          { path: 'saisies', element: <ApercuSaisies /> },
          // Lot E4 : session, « Choisir la session », carte des FIJ, chiffres par département.
          { path: 'saisies-e4', element: <ApercuSaisiesE4 /> },
          { path: 'evenements', element: <ApercuEvenements /> },
          // Lot E8 : « Signaler une difficulté » (ministère) et bloc « Signalements » (EJP Tech).
          { path: 'signalements', element: <ApercuSignalements /> },
          // Lot E6 : calendrier, prochaine réunion, bandeau de la fiche et bloc d'alerte.
          { path: 'calendrier', element: <ApercuCalendrier /> },
          // Lot L3a : configuration des indicateurs (`/indicateurs` et `/indicateurs/:id`).
          { path: 'indicateurs', element: <ApercuIndicateurs /> },
          // Étape 5, lot P2 : « Nouveau point d'attention » (maquette 10).
          { path: 'nouveau-point', element: <ApercuNouveauPoint /> },
          // Lot P1 : boutons « Changer le statut » et « Marquer traité » d'un point.
          { path: 'points-actions', element: <ApercuActionsPoint /> },
          // Lot P3 : écran 05 « Points d'attention » et « Mes points », lus par e2e/points.spec.ts.
          { path: 'points', element: <ApercuPoints /> },
          // Lot L2 : écran 14 « Sessions » (actions simulées, aucune requête).
          { path: 'sessions', element: <ApercuSessions /> },
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
