import type { ComponentProps } from 'react'
import { matchPath } from 'react-router'
import { ecranALaDemande } from '@/app/ecranALaDemande'
import type { EcranALaDemande } from '@/app/ecranALaDemande'
import { ADRESSES_APPLICATION } from '@/features/navigation/profils'
import type { PageCetteSemaine } from '@/pages/PageCetteSemaine'
import type { ProprietesPage } from '@/pages/proprietesPage'

// Découpage du code par écran : chaque page s'importe à la demande (`import()`), et Vite en fait
// un fichier à part. Le premier chargement garde la connexion, la garde, l'ouverture de l'outil
// (T67) et la mise en page connectée ; le code d'un écran arrive la première fois qu'il s'ouvre.
// Ne jamais importer une page de cette table de façon statique ailleurs que dans les tests : elle
// reviendrait dans le premier chargement.

type Page = EcranALaDemande<ProprietesPage>

const PageComptes: Page = ecranALaDemande('PageComptes', () =>
  import('@/pages/PageComptes').then((m) => m.PageComptes),
)
const PageFicheMinistere: Page = ecranALaDemande('PageFicheMinistere', () =>
  import('@/pages/PageFicheMinistere').then((m) => m.PageFicheMinistere),
)
const PageIndicateurs: Page = ecranALaDemande('PageIndicateurs', () =>
  import('@/pages/PageIndicateurs').then((m) => m.PageIndicateurs),
)
const PageIndicateursMinistere: Page = ecranALaDemande('PageIndicateursMinistere', () =>
  import('@/pages/PageIndicateursMinistere').then((m) => m.PageIndicateursMinistere),
)
const PageJournal: Page = ecranALaDemande('PageJournal', () =>
  import('@/pages/PageJournal').then((m) => m.PageJournal),
)
const PageMaFiche: Page = ecranALaDemande('PageMaFiche', () =>
  import('@/pages/PageMaFiche').then((m) => m.PageMaFiche),
)
const PageMesIndicateurs: Page = ecranALaDemande('PageMesIndicateurs', () =>
  import('@/pages/PageMesIndicateurs').then((m) => m.PageMesIndicateurs),
)
const PageMinisteres: Page = ecranALaDemande('PageMinisteres', () =>
  import('@/pages/PageMinisteres').then((m) => m.PageMinisteres),
)
const PageModeration: Page = ecranALaDemande('PageModeration', () =>
  import('@/pages/PageModeration').then((m) => m.PageModeration),
)
const PagePersonnes: Page = ecranALaDemande('PagePersonnes', () =>
  import('@/pages/PagePersonnes').then((m) => m.PagePersonnes),
)
const PagePoints: Page = ecranALaDemande('PagePoints', () =>
  import('@/pages/PagePoints').then((m) => m.PagePoints),
)
const PageSaisieDimanche: Page = ecranALaDemande('PageSaisieDimanche', () =>
  import('@/pages/PageSaisieDimanche').then((m) => m.PageSaisieDimanche),
)
const PageSaisieEvenement: Page = ecranALaDemande('PageSaisieEvenement', () =>
  import('@/pages/PageSaisieEvenement').then((m) => m.PageSaisieEvenement),
)
const PageSaisieFij: Page = ecranALaDemande('PageSaisieFij', () =>
  import('@/pages/PageSaisieFij').then((m) => m.PageSaisieFij),
)
const PageSaisieFijStatistiques: Page = ecranALaDemande('PageSaisieFijStatistiques', () =>
  import('@/pages/PageSaisieFijStatistiques').then((m) => m.PageSaisieFijStatistiques),
)
const PageSaisieMois: Page = ecranALaDemande('PageSaisieMois', () =>
  import('@/pages/PageSaisieMois').then((m) => m.PageSaisieMois),
)
const PageSaisiePoint: Page = ecranALaDemande('PageSaisiePoint', () =>
  import('@/pages/PageSaisiePoint').then((m) => m.PageSaisiePoint),
)
const PageSaisieReunion: Page = ecranALaDemande('PageSaisieReunion', () =>
  import('@/pages/PageSaisieReunion').then((m) => m.PageSaisieReunion),
)
const PageSaisieSession: Page = ecranALaDemande('PageSaisieSession', () =>
  import('@/pages/PageSaisieSession').then((m) => m.PageSaisieSession),
)
const PageSessions: Page = ecranALaDemande('PageSessions', () =>
  import('@/pages/PageSessions').then((m) => m.PageSessions),
)
const PageSignalement: Page = ecranALaDemande('PageSignalement', () =>
  import('@/pages/PageSignalement').then((m) => m.PageSignalement),
)

/**
 * « / » (Cette semaine, ou Ma semaine pour un ministère) : à part, car la page reçoit le lecteur,
 * pas le titre. Comme les autres, elle arrive à la demande ; au démarrage de l'outil sur « / »,
 * `prechargerEcran` la fait venir pendant l'ouverture (T67).
 */
export const PAGE_ACCUEIL: EcranALaDemande<ComponentProps<typeof PageCetteSemaine>> =
  ecranALaDemande('PageCetteSemaine', () =>
    import('@/pages/PageCetteSemaine').then((m) => m.PageCetteSemaine),
  )

/**
 * Page de chaque adresse de l'application (motif de `ADRESSES_APPLICATION`), affichée une fois le
 * profil vérifié. Une adresse absente de cette table (« / » mise à part, qui a sa propre vue)
 * affiche la page « à venir » de son étape. Chaque lot remplace le fichier de sa page, jamais
 * cette table : depuis le lot C0, toutes les adresses des étapes 5 et 6 y ont une page amorce.
 */
export const PAGES_DES_ADRESSES: Readonly<Record<string, Page>> = {
  '/ma-fiche': PageMaFiche,
  '/ma-fiche/indicateurs': PageMesIndicateurs,
  '/ministeres': PageMinisteres,
  '/ministeres/:id': PageFicheMinistere,
  '/saisir/dimanche': PageSaisieDimanche,
  '/saisir/mois': PageSaisieMois,
  '/saisir/session/:id': PageSaisieSession,
  '/saisir/fij': PageSaisieFij,
  '/saisir/fij-statistiques': PageSaisieFijStatistiques,
  '/saisir/evenement': PageSaisieEvenement,
  '/saisir/evenement/:id': PageSaisieEvenement,
  '/saisir/reunion': PageSaisieReunion,
  '/saisir/point': PageSaisiePoint,
  '/signaler': PageSignalement,
  '/points': PagePoints,
  '/journal': PageJournal,
  '/journal-technique': PageJournal,
  '/comptes': PageComptes,
  '/sessions': PageSessions,
  '/indicateurs': PageIndicateurs,
  '/indicateurs/:id': PageIndicateursMinistere,
  '/moderation': PageModeration,
  '/personnes': PagePersonnes,
}

/**
 * Au démarrage de l'outil : fait venir le code de l'écran de l'adresse ouverte, pendant que la
 * session se lit et que l'ouverture (T67) se joue. Seulement du code : le profil se vérifie
 * toujours avant tout affichage et tout appel de données (`PageApplication`). Un échec ne dit
 * rien ici : l'écran recommencera en s'ouvrant.
 */
export function prechargerEcran(chemin: string): void {
  const adresse = ADRESSES_APPLICATION.find((a) => matchPath(a.chemin, chemin) !== null)
  if (adresse === undefined) return
  const ecran = adresse.chemin === '/' ? PAGE_ACCUEIL : PAGES_DES_ADRESSES[adresse.chemin]
  ecran?.charger().catch(() => undefined)
}
