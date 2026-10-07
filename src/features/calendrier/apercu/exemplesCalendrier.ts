// Lignes d'exemple de l'aperçu du calendrier et de l'alerte (/apercu/calendrier, lot E6) : ce que
// la base rendrait, sans base ni requête. « Aujourd'hui » est fixé au mercredi 7 octobre 2026, comme
// l'aperçu de la fiche : `jours` et `a_confirmer` sont écrits ici comme la vue `v_evenement` les
// calcule (date moins aujourd'hui ; en attente de validation à 3 jours ou moins). Données
// fictives, sans aucune donnée personnelle.

import type { EvenementLu } from '@/data/evenements'
import type { MinistereListe } from '@/data/ministeres'
import { SOCIAL } from '@/features/fiche/apercu/exemplesFiche'
import type { LigneTable, StatutEvenement } from '@/lib/base'
import { joursEntre } from '@/lib/metier/dates'

/** Jour de Paris des aperçus. */
export const AUJOURDHUI_EXEMPLE = '2026-10-07'

/** Écrans de l'aperçu (`?ecran=`). */
export const ECRANS_APERCU_CALENDRIER = [
  'fiche',
  'fiche-alerte',
  'fiche-vide',
  'fiche-erreur',
  'fiche-chargement',
  'a-confirmer',
  'a-confirmer-un',
  'a-confirmer-vide',
  'a-confirmer-erreur',
] as const

export type EcranApercuCalendrier = (typeof ECRANS_APERCU_CALENDRIER)[number]

/** `?ecran=` lu, `fiche` par défaut. */
export function lireEcranApercuCalendrier(valeur: string | null): EcranApercuCalendrier {
  return ECRANS_APERCU_CALENDRIER.find((ecran) => ecran === valeur) ?? 'fiche'
}

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const INTEGRATION = '10000000-0000-4000-8000-000000000002'
const COORDINATION = '10000000-0000-4000-8000-000000000003'
const JEUNESSE = '10000000-0000-4000-8000-000000000006'
const PRODIGES_JUNIOR = '10000000-0000-4000-8000-000000000007'

/** Les ministères de l'exemple. */
export const MINISTERES_EXEMPLE: MinistereListe[] = [
  { id: COMMUNICATION, code: 'communication', nom: 'Communication', desactive_le: null },
  { id: INTEGRATION, code: 'integration', nom: 'Intégration', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: SOCIAL, code: 'social', nom: 'Social', desactive_le: null },
  { id: JEUNESSE, code: 'jeunesse', nom: 'Jeunesse', desactive_le: null },
  { id: PRODIGES_JUNIOR, code: 'prodiges_junior', nom: 'Prodiges Junior', desactive_le: null },
]

function evenement(
  id: number,
  ministere: string,
  titre: string,
  date: string,
  statut: StatutEvenement,
  reporteDu: string | null = null,
): EvenementLu {
  const jours = joursEntre(AUJOURDHUI_EXEMPLE, date)
  return {
    id: `e0000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    ministere_id: ministere,
    titre,
    date,
    statut,
    jours,
    a_confirmer: statut === 'attente_validation' && jours <= 3,
    reporte_du: reporteDu,
  }
}

const id = (numero: number) => `e0000000-0000-4000-8000-${String(numero).padStart(12, '0')}`

/** Le calendrier de Social (maquettes 04 et 12) : aucun événement à confirmer. */
const CALENDRIER_SANS_ALERTE: EvenementLu[] = [
  evenement(1, SOCIAL, 'Distribution alimentaire', '2026-10-03', 'valide'),
  evenement(2, SOCIAL, 'Soirée de partage', '2026-10-17', 'attente_validation'),
  evenement(3, SOCIAL, 'Collecte de vêtements, tri', '2026-10-24', 'preparation'),
  evenement(4, SOCIAL, 'Maraude de Noël', '2026-11-07', 'brouillon', '2026-11-01'),
  evenement(5, SOCIAL, "Collecte d'hiver", '2026-11-14', 'annule'),
]

/**
 * Avec l'alerte : un événement de Social à 3 jours, un autre dont la date est passée de plus de
 * 7 jours (il reste au calendrier, 4.4), un événement de Coordination qui mentionne Social.
 */
const CALENDRIER_AVEC_ALERTE: EvenementLu[] = [
  evenement(6, SOCIAL, 'Maraude de la rentrée', '2026-09-26', 'attente_validation'),
  evenement(1, SOCIAL, 'Distribution alimentaire', '2026-10-03', 'valide'),
  evenement(7, COORDINATION, 'Planning du trimestre', '2026-10-09', 'attente_validation'),
  evenement(8, SOCIAL, 'Soirée de partage', '2026-10-10', 'attente_validation'),
  evenement(3, SOCIAL, 'Collecte de vêtements, tri', '2026-10-24', 'preparation'),
]

const MENTIONS_AVEC_ALERTE: LigneTable<'evenement_mention'>[] = [
  { evenement_id: id(7), ministere_id: SOCIAL },
  { evenement_id: id(8), ministere_id: COORDINATION },
  { evenement_id: id(8), ministere_id: JEUNESSE },
]

const MENTIONS_SANS_ALERTE: LigneTable<'evenement_mention'>[] = [
  { evenement_id: id(3), ministere_id: COORDINATION },
]

/** Lectures du calendrier de la fiche de Social pour l'écran demandé. */
export function lecturesCalendrierExemple(ecran: EcranApercuCalendrier) {
  const alerte = ecran === 'fiche-alerte'
  return {
    evenements:
      ecran === 'fiche-vide' ? [] : alerte ? CALENDRIER_AVEC_ALERTE : CALENDRIER_SANS_ALERTE,
    mentions: alerte ? MENTIONS_AVEC_ALERTE : MENTIONS_SANS_ALERTE,
    ministeres: MINISTERES_EXEMPLE,
  }
}

/** Prochaine réunion de Social (maquettes 04 et 12), `null` au premier usage. */
export const REUNION_EXEMPLE = {
  date: '2026-10-12',
  heure: '20:00:00',
  objet: 'Préparer la distribution de novembre',
  decision_attendue: 'Choisir le lieu de stockage',
}

/**
 * Tous les événements à confirmer de l'église (« Cette semaine » du berger) : 8 lignes, dont une
 * date passée de plus de 7 jours, pour voir les 5 lignes puis « Voir les 8 événements à confirmer ».
 */
export const A_CONFIRMER_EXEMPLE: EvenementLu[] = [
  evenement(11, PRODIGES_JUNIOR, 'Sortie des Prodiges', '2026-09-26', 'attente_validation'),
  evenement(12, INTEGRATION, 'Accueil des nouveaux', '2026-10-05', 'attente_validation'),
  evenement(13, COORDINATION, 'Planning du trimestre', '2026-10-06', 'attente_validation'),
  evenement(14, COMMUNICATION, 'Tournage des témoignages', '2026-10-07', 'attente_validation'),
  evenement(15, SOCIAL, 'Soirée de partage', '2026-10-08', 'attente_validation'),
  evenement(16, COMMUNICATION, 'Soirée de louange', '2026-10-10', 'attente_validation'),
  evenement(17, JEUNESSE, 'Week-end jeunes', '2026-10-10', 'attente_validation'),
  evenement(18, INTEGRATION, 'Welcome Prodiges', '2026-10-10', 'attente_validation'),
]
