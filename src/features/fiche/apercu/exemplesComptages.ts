// Lignes d'exemple des blocs « Événements de l'église » et « Ponctualité » (fiche de
// Coordination, /apercu/fiche?ecran=comptages, lot L2 ; T68) : ce que `evenements_eglise_mois()`
// et `v_evenement` rendraient, sans base ni requête. Jour de Paris fixé au mercredi 7 octobre 2026,
// comme le reste de l'aperçu de la fiche. Données fictives, sans aucune donnée personnelle.

import type { RetardEvenement } from '@/data/comptages'
import type { LigneComptagesEglise } from '@/lib/base'

const DEPUIS = '2026-08-21'

const VIDE = {
  prevus: 0,
  realises: 0,
  annules: 0,
  reportes: 0,
  en_attente: 0,
  passes_sans_etat_final: 0,
  avec_heures: 0,
  a_l_heure: 0,
  retard_cumule: 0,
  cultes: 0,
  cultes_avec_heures: 0,
  cultes_a_l_heure: 0,
  cultes_retard_cumule: 0,
}

/**
 * Trois mois, du plus récent au plus ancien. Septembre : 6 réalisés dont 4 avec leurs heures, 2 à
 * l'heure (retards 12, 3, une avance comptée 0 et 35 au passage de minuit, soit 50 minutes) ; 4
 * cultes avec leurs heures, 3 à l'heure, 17 minutes. Total : 5 sur 8, 63 %, 8 min de moyenne.
 */
export const COMPTAGES_EXEMPLE: LigneComptagesEglise[] = [
  {
    ...VIDE,
    mois: '2026-10-01',
    prevus: 4,
    realises: 2,
    reportes: 1,
    en_attente: 2,
    passes_sans_etat_final: 1,
    avec_heures: 2,
    a_l_heure: 1,
    retard_cumule: 9,
    cultes: 1,
    cultes_avec_heures: 1,
    cultes_a_l_heure: 1,
    cultes_retard_cumule: 2,
    depuis: DEPUIS,
  },
  {
    ...VIDE,
    mois: '2026-09-01',
    prevus: 7,
    realises: 6,
    annules: 1,
    reportes: 1,
    passes_sans_etat_final: 1,
    avec_heures: 4,
    a_l_heure: 2,
    retard_cumule: 50,
    cultes: 4,
    cultes_avec_heures: 4,
    cultes_a_l_heure: 3,
    cultes_retard_cumule: 17,
    depuis: DEPUIS,
  },
  {
    ...VIDE,
    mois: '2026-08-01',
    prevus: 3,
    realises: 3,
    avec_heures: 1,
    a_l_heure: 1,
    cultes: 2,
    cultes_avec_heures: 2,
    cultes_a_l_heure: 1,
    cultes_retard_cumule: 14,
    depuis: DEPUIS,
  },
]

/**
 * Premier mois de service, sans mois écoulé : le mois en cours donne les grandes valeurs ; aucun
 * événement n'a encore ses heures ni aucun culte, la part est « Non calculé ».
 */
export const COMPTAGES_PREMIER_MOIS_EXEMPLE: LigneComptagesEglise[] = [
  {
    ...VIDE,
    mois: '2026-10-01',
    prevus: 3,
    realises: 2,
    en_attente: 1,
    depuis: '2026-10-02',
  },
]

const JEUNESSE = '10000000-0000-4000-8000-000000000006'
const COORDINATION = '10000000-0000-4000-8000-000000000003'

/** Les deux événements de septembre commencés en retard, par date. */
export const RETARDS_EXEMPLE: RetardEvenement[] = [
  {
    id: 'e5000000-0000-4000-8000-000000000001',
    ministere_id: JEUNESSE,
    titre: 'Soirée jeunesse',
    date: '2026-09-10',
    retard: 12,
  },
  {
    id: 'e5000000-0000-4000-8000-000000000005',
    ministere_id: COORDINATION,
    titre: 'Veillée de prière',
    date: '2026-09-24',
    retard: 35,
  },
]

export const NOMS_MINISTERES_EXEMPLE: ReadonlyMap<string, string> = new Map([
  [JEUNESSE, 'Jeunesse'],
  [COORDINATION, 'Coordination'],
])
