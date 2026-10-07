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

/**
 * Les emplacements de la fiche, dans l'ordre où `emplacements.tsx` les range. `nouveauPoint` (bouton
 * « Nouveau point », lot P4) et `gererIndicateurs` (lien « Gérer mes indicateurs », lot L4) ont
 * été ajoutés par le lot C0, chacun dans son fichier, pour que ces deux lots ne touchent jamais le
 * même fichier de la fiche.
 */
export type EmplacementFiche =
  | 'calendrier'
  | 'reunion'
  | 'statistiquesFij'
  | 'comptages'
  | 'graphiques'
  | 'nouveauPoint'
  | 'gererIndicateurs'
