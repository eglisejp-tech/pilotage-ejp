import type { RouteObject } from 'react-router'
import { ApercuAvancement } from '@/features/avancement/apercu/ApercuAvancement'
import { ApercuCalendrier } from '@/features/calendrier/apercu/ApercuCalendrier'
import { ApercuChargement } from '@/features/chargement/apercu/ApercuChargement'
import { ApercuOuverture } from '@/features/chargement/apercu/ApercuOuverture'
import { ApercuComptes } from '@/features/comptes/apercu/ApercuComptes'
import { ApercuConnexion } from '@/features/connexion/apercu/ApercuConnexion'
import { ApercuDeclaration } from '@/features/declaration/apercu/ApercuDeclaration'
import { ApercuPersonnes } from '@/features/personnes/apercu/ApercuPersonnes'
import { ApercuEvenements } from '@/features/evenements/apercu/ApercuEvenements'
import { ApercuFiche } from '@/features/fiche/apercu/ApercuFiche'
import { ApercuJournal } from '@/features/journal/apercu/ApercuJournal'
import { ApercuIndicateurs } from '@/features/indicateurs/configuration/apercu/ApercuIndicateurs'
import { ApercuValidation } from '@/features/indicateurs/validation/apercu/ApercuValidation'
import { ApercuMesIndicateurs } from '@/features/mes-indicateurs/apercu/ApercuMesIndicateurs'
import { ApercuNouveauPoint } from '@/features/nouveau-point/apercu/ApercuNouveauPoint'
import { ApercuSaisies } from '@/features/saisie/apercu/ApercuSaisies'
import { ApercuSessions } from '@/features/sessions/apercu/ApercuSessions'
import { ApercuSaisiesE4 } from '@/features/saisie-fij/apercu/ApercuSaisiesE4'
import { ApercuNavigation } from '@/features/navigation/apercu/ApercuNavigation'
import { MiseEnPageApercu } from '@/features/navigation/apercu/MiseEnPageApercu'
import { ApercuPoints } from '@/features/points/apercu/ApercuPoints'
import { ApercuActionsPoint } from '@/features/points-actions/apercu/ApercuActionsPoint'
import { ApercuModeration } from '@/features/moderation/apercu/ApercuModeration'
import { ApercuSignalements } from '@/features/signalement/apercu/ApercuSignalements'
import { ApercuCetteSemaine } from '@/pages/ApercuCetteSemaine'

// Aperçus de développement : écrans sans appel au serveur, pour la revue et les tests Playwright.
// Seulement sur le serveur de développement et dans les tests : au build, vite.config.ts remplace
// ce module par routesDeDeveloppementAbsentes.ts (aucune route), et ni les routes ni leur code ne
// sont dans le bundle de production.
export const routesDeDeveloppement: RouteObject[] = [
  { path: '/apercu/connexion', element: <ApercuConnexion /> },
  // T56 : « Qui utilise l'outil ? » (déclaration simulée, aucune requête).
  { path: '/apercu/qui-utilise', element: <ApercuDeclaration /> },
  // T65 : l'ouverture de l'outil, plein écran, pendant la vérification de la session.
  { path: '/apercu/ouverture', element: <ApercuOuverture /> },
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
      // Lot L4 : bloc « À valider » (EJP Tech décide, l'administration lit) et « Mes indicateurs ».
      { path: 'validation-indicateurs', element: <ApercuValidation /> },
      { path: 'mes-indicateurs', element: <ApercuMesIndicateurs /> },
      // Étape 5, lot P2 : « Nouveau point d'attention » (maquette 10).
      { path: 'nouveau-point', element: <ApercuNouveauPoint /> },
      // Lot P1 : boutons « Changer le statut » et « Marquer traité » d'un point.
      { path: 'points-actions', element: <ApercuActionsPoint /> },
      // Lot P3 : écran 05 « Points d'attention » et « Mes points », lus par e2e/points.spec.ts.
      { path: 'points', element: <ApercuPoints /> },
      // Lot L5 : écran 06 « Journal », « Mon journal » et « Journal technique ».
      { path: 'journal', element: <ApercuJournal /> },
      // Lot L2 : écran 14 « Sessions » (actions simulées, aucune requête).
      { path: 'sessions', element: <ApercuSessions /> },
      // Lot L6 : écran 15 « Modération » (décisions simulées, aucune requête).
      { path: 'moderation', element: <ApercuModeration /> },
      // T56 : onglet « Personnes » d'EJP Tech et en-tête « Vous : Marie » (aucune requête).
      { path: 'personnes', element: <ApercuPersonnes /> },
      // T65 : une page, une liste, un bloc qui se relit et un envoi, figés dans leur attente.
      { path: 'chargement', element: <ApercuChargement /> },
    ],
  },
]
