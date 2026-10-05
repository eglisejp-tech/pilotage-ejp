// Construction de la vue « Cette semaine » à partir des lectures brutes : fonction pure, sans
// appel réseau ni horloge (toutes les dates viennent de v_semaine, heure de Paris).

import type { LigneTable, LigneVue } from '@/lib/base'
import type { TypeSession } from '@/lib/metier/phrases'
import type { DonneesCetteSemaine, Lecteur } from './types'

/**
 * Lectures brutes, une par requête de useCetteSemaine (src/data/eglise.ts, ministeres.ts,
 * points.ts). Les vues ne recomptent rien : complétude et totaux viennent de la base.
 */
export interface LecturesCetteSemaine {
  /** ['eglise','semaine'] : la ligne de v_semaine (sans ligne, useCetteSemaine est en erreur). */
  semaine: LigneVue<'v_semaine'>
  /** Indicateurs communs : relie `indicateur_id` à son code (« service », « actifs »...). */
  indicateurs: Pick<LigneTable<'indicateur'>, 'id' | 'code' | 'nature'>[]
  /** ['eglise','totaux-dimanche'] : dix dimanches par indicateur commun « dimanche ». */
  totauxDimanche: LigneVue<'v_total_dimanche'>[]
  /** ['eglise','ecarts-dimanche'] : écarts du dimanche de référence. */
  ecartsDimanche: LigneVue<'v_ecart_dimanche'>[]
  /** ['eglise','a-ce-jour'] */
  totauxACeJour: LigneVue<'v_total_a_ce_jour'>[]
  /** ['eglise','pourcentage-fij'] : null quand la vue ne rend aucune ligne. */
  pourcentageFij: LigneVue<'v_pourcentage_fij'> | null
  /** ['eglise','carte-fij'] : vide tant que FIJ n'a rien envoyé. */
  carteFij: LigneVue<'v_carte_fij'>[]
  /** ['eglise','sessions'] : sessions passées (`a_eu_lieu`), de la plus récente à la plus ancienne. */
  sessions: LigneVue<'v_session_completude'>[]
  /** ['eglise','ecarts-sessions'] */
  ecartsSessions: LigneVue<'v_ecart_session'>[]
  /** ['eglise','participations',id] : la session affichée ; vide sans session. */
  participations: LigneVue<'v_participation_courante'>[]
  /** ['ministeres','tableau'] : ministères actifs. */
  tableauMinisteres: LigneVue<'v_tableau_ministeres'>[]
  /** ['ministeres','liste'] : tous, désactivés compris (créateurs et mentions « (désactivé) »). */
  ministeres: Pick<LigneTable<'ministere'>, 'id' | 'code' | 'nom' | 'desactive_le'>[]
  /** ['points','ouverts'] : berger et conseil seulement, null pour les autres profils. */
  points: { points: LigneVue<'v_point'>[]; mentions: LigneTable<'point_mention'>[] } | null
}

/**
 * Données prêtes à afficher pour un lecteur et, s'il est choisi par `?session=`, un type de
 * session (null : la dernière session passée, tous types confondus ; T20).
 *
 * États vides à produire (types.ts, TEXTES_VIDES ; T22) :
 * - service sans saisie du dimanche de référence (total null ou nb_saisis 0) : valeur `vide`,
 *   complétude « 0 sur 8 », pas d'écart ; courbe null si les dix dimanches sont vides ;
 * - actifs ou carte sans ligne : valeur `vide`, date « À ce jour » ; pourcentage FIJ sans ligne :
 *   `vide`, avec une ligne mais `pourcentage` null : `non_calcule` ;
 * - session passée sans saisie (nb_saisis 0, `total` vaut alors 0 dans la vue) : total null,
 *   trou dans la courbe ; type sans session passée : ligne `vide`, date « Aucune session pour
 *   l'instant », complétude null, ni écart ni courbe ;
 * - un texte libre égal à TEXTE_MASQUE porte `masque: true`.
 */
export function construireCetteSemaine(
  lectures: LecturesCetteSemaine,
  lecteur: Lecteur,
  typeSession: TypeSession | null,
): DonneesCetteSemaine {
  // TODO lot A : construire les données (phrases, écarts, complétude, fraîcheur, À décider).
  void lectures
  void lecteur
  void typeSession
  throw new Error('construireCetteSemaine : pas encore écrite (lot A, étape 3).')
}
