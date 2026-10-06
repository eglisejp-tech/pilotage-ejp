// Types des signalements de difficulté (étape 4, T39). Fichier rempli par les lots B7 et E8 :
// `signalement`, `signalement_suivi`, `signaler_difficulte` et `clore_signalement`, dans le format
// de `communs.ts`. Un signalement n'est lu que par le ministère qui l'a écrit et par EJP Tech.

import type { Aucun } from './communs'

/**
 * Écran d'où part un signalement (liste fermée, `/signaler?ecran=<code>`). « autre » quand on
 * arrive sans formulaire d'origine. Les libellés sont dans `src/features/signalement/textes.ts`.
 */
export type EcranSignalement =
  | 'saisie_dimanche'
  | 'saisie_mois'
  | 'saisie_session'
  | 'saisie_fij'
  | 'saisie_fij_statistiques'
  | 'saisie_evenement'
  | 'saisie_reunion'
  | 'autre'

export type TablesSignalements = Aucun

export type VuesSignalements = Aucun

export type FonctionsSignalements = Aucun
