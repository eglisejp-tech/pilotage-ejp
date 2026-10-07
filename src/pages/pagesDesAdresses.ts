import type { ComponentType } from 'react'
import { PageFicheMinistere } from '@/pages/PageFicheMinistere'
import { PageMaFiche } from '@/pages/PageMaFiche'
import { PageMinisteres } from '@/pages/PageMinisteres'
import { PageModeration } from '@/pages/PageModeration'
import { PageSaisieDimanche } from '@/pages/PageSaisieDimanche'
import { PageSaisieEvenement } from '@/pages/PageSaisieEvenement'
import { PageSaisieFij } from '@/pages/PageSaisieFij'
import { PageSaisieFijStatistiques } from '@/pages/PageSaisieFijStatistiques'
import { PageSaisieMois } from '@/pages/PageSaisieMois'
import { PageSaisieReunion } from '@/pages/PageSaisieReunion'
import { PageSaisieSession } from '@/pages/PageSaisieSession'
import { PageSignalement } from '@/pages/PageSignalement'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Page de chaque adresse de l'application (motif de `ADRESSES_APPLICATION`), affichée une fois le
 * profil vérifié. Une adresse absente de cette table (« / » mise à part, qui a sa propre vue)
 * affiche la page « à venir » de son étape. Chaque lot remplace le fichier de sa page, jamais
 * cette table.
 */
export const PAGES_DES_ADRESSES: Readonly<Record<string, ComponentType<ProprietesPage>>> = {
  '/ma-fiche': PageMaFiche,
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
  '/signaler': PageSignalement,
  '/moderation': PageModeration,
}
