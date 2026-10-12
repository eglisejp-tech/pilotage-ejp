import type { ComponentType } from 'react'
import { PageComptes } from '@/pages/PageComptes'
import { PageFicheMinistere } from '@/pages/PageFicheMinistere'
import { PageIndicateurs } from '@/pages/PageIndicateurs'
import { PageIndicateursMinistere } from '@/pages/PageIndicateursMinistere'
import { PageJournal } from '@/pages/PageJournal'
import { PageMaFiche } from '@/pages/PageMaFiche'
import { PageMesIndicateurs } from '@/pages/PageMesIndicateurs'
import { PageMinisteres } from '@/pages/PageMinisteres'
import { PageModeration } from '@/pages/PageModeration'
import { PagePoints } from '@/pages/PagePoints'
import { PageSaisieDimanche } from '@/pages/PageSaisieDimanche'
import { PageSaisieEvenement } from '@/pages/PageSaisieEvenement'
import { PageSaisieFij } from '@/pages/PageSaisieFij'
import { PageSaisieFijStatistiques } from '@/pages/PageSaisieFijStatistiques'
import { PageSaisieMois } from '@/pages/PageSaisieMois'
import { PageSaisiePoint } from '@/pages/PageSaisiePoint'
import { PageSaisieReunion } from '@/pages/PageSaisieReunion'
import { PageSaisieSession } from '@/pages/PageSaisieSession'
import { PageSessions } from '@/pages/PageSessions'
import { PageSignalement } from '@/pages/PageSignalement'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Page de chaque adresse de l'application (motif de `ADRESSES_APPLICATION`), affichée une fois le
 * profil vérifié. Une adresse absente de cette table (« / » mise à part, qui a sa propre vue)
 * affiche la page « à venir » de son étape. Chaque lot remplace le fichier de sa page, jamais
 * cette table : depuis le lot C0, toutes les adresses des étapes 5 et 6 y ont une page amorce.
 */
export const PAGES_DES_ADRESSES: Readonly<Record<string, ComponentType<ProprietesPage>>> = {
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
}
