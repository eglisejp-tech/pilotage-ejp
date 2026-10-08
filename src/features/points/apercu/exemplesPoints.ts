// Données d'exemple de l'écran 05 et de « Mes points » (aperçu /apercu/points et tests) : les
// points de la maquette 05 et du jeu d'exemple de l'étape 1, au 1er octobre 2026. Données
// fictives : aucun nom de personne. Ce jeu compte 5 points ouverts et 4 traités ; la base
// d'exemple (supabase/seed.sql) en compte 6 ouverts, avec « Réimpression des supports ». Les
// parcours sur l'aperçu (e2e/points.spec.ts) comptent donc 5 ouverts, ceux de e2e/base/ 6.

import type { MinistereListe } from '@/data/ministeres'
import type { AuteurTraitement } from '@/data/pointsListe'
import type { LecturesPoints } from '@/features/points/construirePoints'
import type { LigneVue, StatutPoint } from '@/lib/base'

export const COMMUNICATION = 'min-communication'
export const INTEGRATION = 'min-integration'
export const COORDINATION = 'min-coordination'
export const JEUNESSE = 'min-jeunesse'
export const SOCIAL = 'min-social'
export const PRODIGES_JUNIOR = 'min-prodiges-junior'

/** Jour de Paris de l'exemple : l'échéance du 28 sept. est dépassée, celles d'octobre non. */
export const AUJOURDHUI_EXEMPLE = '2026-10-01'

/** Ministère « Social » désactivé : ses points restent lisibles, ses mentions passées aussi. */
export const MINISTERES_EXEMPLE: MinistereListe[] = [
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  { id: INTEGRATION, code: null, nom: 'Intégration', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: JEUNESSE, code: null, nom: 'Jeunesse', desactive_le: null },
  { id: SOCIAL, code: null, nom: 'Social', desactive_le: '2026-09-29T20:00:00+02:00' },
  { id: PRODIGES_JUNIOR, code: null, nom: 'Prodiges Junior', desactive_le: null },
]

const COMPTE_BERGER = 'compte-berger'
const COMPTE_CONSEIL_3 = 'compte-conseil-3'
const COMPTE_COORDINATION = 'compte-coordination'

export const AUTEURS_EXEMPLE: AuteurTraitement[] = [
  { user_id: COMPTE_BERGER, ministere_id: null, libelle: 'Berger' },
  { user_id: COMPTE_CONSEIL_3, ministere_id: null, libelle: 'Conseil, compte 3' },
  { user_id: COMPTE_COORDINATION, ministere_id: COORDINATION, libelle: 'Ministère Coordination' },
]

type PointExemple = {
  id: string
  ministere: string
  titre: string
  description: string | null
  attendu?: string | null
  priorite: LigneVue<'v_point'>['priorite']
  echeance: string | null
  cree: string
  statut: StatutPoint
  traite?: { le: string; par: string; commentaire: string | null }
}

function ligne(point: PointExemple): LigneVue<'v_point'> {
  return {
    id: point.id,
    ministere_id: point.ministere,
    titre: point.titre,
    description: point.description,
    action_attendue: point.attendu ?? null,
    priorite: point.priorite,
    echeance: point.echeance,
    cree_le: point.cree,
    cree_par: 'compte-createur',
    statut: point.statut,
    statut_le: point.traite?.le ?? point.cree,
    traitement_id: point.traite === undefined ? null : `traitement-${point.id}`,
    traite_le: point.traite?.le ?? null,
    traite_par: point.traite?.par ?? null,
    traite_commentaire: point.traite?.commentaire ?? null,
  }
}

export const POINTS_EXEMPLE: LigneVue<'v_point'>[] = [
  ligne({
    id: 'p-financement',
    ministere: INTEGRATION,
    titre: 'Financement de Welcome Prodiges',
    description: "Budget pour l'accueil du 15 octobre : collation et supports imprimés.",
    attendu: 'Décision du conseil sur le budget',
    priorite: 'urgente',
    echeance: '2026-10-05',
    cree: '2026-09-24T20:40:00+02:00',
    statut: 'attente_decision',
  }),
  ligne({
    id: 'p-planning',
    ministere: COORDINATION,
    titre: 'Planning du trimestre à valider',
    description: "Les dates d'octobre à décembre doivent être arrêtées avant la réunion.",
    priorite: 'haute',
    echeance: '2026-09-28',
    cree: '2026-09-28T22:10:00+02:00',
    statut: 'a_traiter',
  }),
  ligne({
    id: 'p-salle',
    ministere: COMMUNICATION,
    titre: 'Salle pour la soirée de louange',
    description: "La salle du 10 octobre n'est pas encore confirmée.",
    attendu: 'Confirmer la salle',
    priorite: 'haute',
    echeance: '2026-10-03',
    cree: '2026-09-22T21:30:00+02:00',
    statut: 'en_cours',
  }),
  ligne({
    id: 'p-visuels',
    ministere: INTEGRATION,
    titre: 'Visuels pour Welcome Prodiges',
    description: "Affiche et flyer de l'accueil du 15 octobre.",
    priorite: 'normale',
    echeance: '2026-10-08',
    cree: '2026-09-29T18:03:00+02:00',
    statut: 'a_traiter',
  }),
  ligne({
    id: 'p-renfort',
    ministere: JEUNESSE,
    titre: 'Renfort de 4 STARs pour la sortie',
    description: 'Il manque 4 accompagnateurs pour le 17 octobre.',
    priorite: 'normale',
    echeance: '2026-10-10',
    cree: '2026-09-27T18:04:00+02:00',
    statut: 'a_traiter',
  }),
  ligne({
    id: 'p-micros',
    ministere: COMMUNICATION,
    titre: "Micros pour Bâtir l'Église",
    description: 'Deux micros sans fil ne fonctionnent plus.',
    priorite: 'haute',
    echeance: '2026-09-26',
    cree: '2026-09-20T21:00:00+02:00',
    statut: 'traite',
    traite: { le: '2026-09-26T09:12:00+02:00', par: COMPTE_BERGER, commentaire: null },
  }),
  ligne({
    id: 'p-transport',
    ministere: PRODIGES_JUNIOR,
    titre: 'Transport des Prodiges Junior',
    description: 'Il manque un moyen de transport pour la sortie des enfants.',
    priorite: 'normale',
    echeance: '2026-09-27',
    cree: '2026-09-13T14:00:00+02:00',
    statut: 'traite',
    traite: {
      le: '2026-09-24T10:30:00+02:00',
      par: COMPTE_CONSEIL_3,
      commentaire: "Deux véhicules de l'église assurent le transport jusqu'à fin octobre.",
    },
  }),
  ligne({
    id: 'p-cles',
    ministere: COORDINATION,
    titre: 'Clés de la salle annexe',
    description: 'Le double des clés de la salle annexe est introuvable.',
    priorite: 'normale',
    echeance: '2026-09-20',
    cree: '2026-09-15T20:00:00+02:00',
    statut: 'traite',
    traite: {
      le: '2026-09-21T19:20:00+02:00',
      par: COMPTE_COORDINATION,
      commentaire: 'Un nouveau double a été fait et rangé au secrétariat.',
    },
  }),
  ligne({
    id: 'p-stockage',
    ministere: SOCIAL,
    titre: 'Lieu de stockage de la collecte',
    description: '[texte masqué par EJP Tech]',
    priorite: 'normale',
    echeance: '2026-09-15',
    cree: '2026-09-06T14:00:00+02:00',
    statut: 'traite',
    traite: { le: '2026-09-14T11:30:00+02:00', par: COMPTE_BERGER, commentaire: null },
  }),
]

export const MENTIONS_EXEMPLE: LigneVue<'v_point_mention'>[] = [
  { point_id: 'p-salle', ministere_id: COORDINATION },
  { point_id: 'p-renfort', ministere_id: SOCIAL },
  { point_id: 'p-visuels', ministere_id: COMMUNICATION },
  { point_id: 'p-stockage', ministere_id: COORDINATION },
]

export const LECTURES_EXEMPLE_POINTS: LecturesPoints = {
  aujourdhui: AUJOURDHUI_EXEMPLE,
  points: POINTS_EXEMPLE,
  mentions: MENTIONS_EXEMPLE,
  auteurs: AUTEURS_EXEMPLE,
  ministeres: MINISTERES_EXEMPLE,
}

/**
 * Ce que la base rend à un compte de ministère : seulement les points qu'il a créés ou qui le
 * mentionnent (la RLS filtre), avec toutes les mentions de ces points.
 */
export function lecturesDuMinistere(lectures: LecturesPoints, ministereId: string): LecturesPoints {
  const mentionne = new Set(
    lectures.mentions
      .filter((mention) => mention.ministere_id === ministereId)
      .map((mention) => mention.point_id),
  )
  const points = lectures.points.filter(
    (point) => point.ministere_id === ministereId || mentionne.has(point.id),
  )
  const ids = new Set(points.map((point) => point.id))
  return { ...lectures, points, mentions: lectures.mentions.filter((m) => ids.has(m.point_id)) }
}

/** Aucun point : premier usage. */
export function lecturesSansPoint(lectures: LecturesPoints): LecturesPoints {
  return { ...lectures, points: [], mentions: [], auteurs: [] }
}
