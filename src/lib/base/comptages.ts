// Types des comptages d'événements de l'église et de leur ponctualité (lot L2, X10 ; T68), dans le
// format de `communs.ts`. Source : supabase/migrations/20261023120500_evenements_comptages.sql.
// Une seule définition côté base (`private.comptages_evenements_mois`) : la vue par ministère et la
// fonction de l'église reposent dessus ; rien n'est recompté dans le navigateur.

import type { Vue } from './communs'

/**
 * Comptages d'un mois (K10a à K10c, K11). Mois au 1er (heure de Paris). « Réalisés » : dernier
 * état « Terminé », date dans le mois ; « reportés » : comptés dans le mois de la date quittée.
 */
// Des `type` et non des `interface` : le client Supabase demande des lignes indexables.
type ComptagesMois = {
  /** 1er du mois, « 2026-09-01 ». */
  mois: string
  prevus: number
  realises: number
  annules: number
  reportes: number
  en_attente: number
  passes_sans_etat_final: number
}

/** Une ligne de `v_evenements_mois` : les comptages d'un ministère porteur pour un mois. */
export type LigneEvenementsMois = ComptagesMois & {
  ministere_id: string
}

/**
 * Une ligne de `evenements_eglise_mois()` : les totaux de l'église pour un mois, ponctualité
 * comprise, sans titre, sans date d'événement, sans détail par ministère (K11).
 */
export type LigneComptagesEglise = ComptagesMois & {
  /** Réalisés dont le retard se calcule (heure prévue et heure de début présentes). */
  avec_heures: number
  /** Parmi eux, commencés au plus 5 minutes après l'heure prévue (K22b). */
  a_l_heure: number
  /** Somme des retards en minutes, une avance comptant 0. */
  retard_cumule: number
  /** Dimanches du mois, jusqu'au dimanche de référence, avec une heure de début du culte saisie. */
  cultes: number
  /** Parmi eux, ceux qui ont une heure prévue du culte en vigueur. */
  cultes_avec_heures: number
  cultes_a_l_heure: number
  cultes_retard_cumule: number
  /** Jour de départ des comptages (Paris), le même sur chaque ligne. */
  depuis: string
}

/**
 * Colonnes de ponctualité de `v_evenement` (dernier état) que la lecture des retards demande.
 * Doublon temporaire : le chantier de saisie les ajoute à `v_evenement` dans `evenements.ts` ;
 * l'intersection des deux déclarations donne le même type. À retirer à l'assemblage.
 */
type PonctualiteEvenement = {
  heure_prevue: number | null
  heure_debut: number | null
  /** Minutes signées (négatif : avance), null sans les deux heures ou hors « Terminé ». */
  retard: number | null
  /** `retard` au plus 5 minutes, null quand `retard` est null. */
  a_l_heure: boolean | null
}

export type VuesComptages = {
  /** Comptages par ministère porteur et par mois, sous la RLS de `evenement` (X10). */
  v_evenements_mois: Vue<LigneEvenementsMois>
  v_evenement: Vue<PonctualiteEvenement>
}

export type FonctionsComptages = {
  /**
   * Totaux de l'église par mois, du mois de `depuis` au mois en cours compris, mois vides compris,
   * du plus récent au plus ancien. Lus par le ministère `coordination`, le berger, le conseil et
   * EJP Tech ; refus 42501 pour tout autre compte (clé de `src/data/messagesBase.ts`).
   */
  evenements_eglise_mois: { Args: Record<string, never>; Returns: LigneComptagesEglise[] }
}
