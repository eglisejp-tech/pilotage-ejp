import type { TypeCompte } from '@/lib/base'

/**
 * Ce qu'un emplacement de la fiche reçoit de la fiche qui l'affiche (lot E2). Le lot qui remplit
 * l'emplacement lit ses données lui-même (`src/data/`), il ne reçoit que de quoi les demander.
 */
export interface ProprietesEmplacementFiche {
  ministereId: string
  /** Code technique du ministère (« fij », « coordination »), sinon null. */
  ministereCode: string | null
  /** Profil qui lit la fiche : EJP Tech (`admin_plateforme`) la lit sans aucun bouton de saisie. */
  profil: TypeCompte
}

/** Les emplacements de la fiche, dans l'ordre où `emplacements.tsx` les range. */
export type EmplacementFiche =
  'calendrier' | 'reunion' | 'statistiquesFij' | 'comptages' | 'graphiques'
