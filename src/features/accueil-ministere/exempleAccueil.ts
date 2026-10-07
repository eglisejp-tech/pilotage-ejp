// Données d'exemple de l'accueil du ministère (maquette 07, Communication, semaine 39), pour les
// tests : les lignes de « Vos saisies » telles que les écrivent les lots de saisie, l'ouverture
// qui en découle, et deux points (un créé, un qui le mentionne).

import type { DonneesAccueilMinistere, LigneVosSaisies } from '@/features/accueil-ministere/types'
import { construireOuverture } from '@/features/accueil-ministere/vosSaisies'
import type { ContexteOuverture } from '@/features/accueil-ministere/vosSaisies'
import type { PointFiche } from '@/features/fiche/modeleFiche'

export const CONTEXTE_EXEMPLE: ContexteOuverture = {
  semaine: { aujourdhui: '2026-09-29', dimanche: '2026-09-27', numero: 39 },
  sessions: [
    { session_id: 'batir-26', type: 'batir', intitule: null, date: '2026-09-26' },
    { session_id: 'anti-27', type: 'anti_dispersion', intitule: null, date: '2026-09-27' },
  ],
  estFij: false,
}

export const LIGNE_DIMANCHE_FAIT: LigneVosSaisies = {
  cle: 'dimanche',
  libelle: 'Chiffres du dimanche 27 sept.',
  etat: 'fait',
  detail: 'Fait, 10 au service',
  action: { libelle: 'Corriger', vers: '/saisir/dimanche?date=2026-09-27' },
}

export const LIGNE_DIMANCHE_A_FAIRE: LigneVosSaisies = {
  cle: 'dimanche',
  libelle: 'Chiffres du dimanche 27 sept.',
  etat: 'a_faire',
  detail: null,
  action: { libelle: 'Saisir', vers: '/saisir/dimanche' },
}

export const LIGNE_BATIR_FAITE: LigneVosSaisies = {
  cle: 'session:batir-26',
  libelle: "Bâtir l'Église du 26 sept.",
  etat: 'fait',
  detail: 'Fait, 13 présents',
  action: { libelle: 'Corriger', vers: '/saisir/session/batir-26' },
}

export const LIGNE_REUNION_A_FAIRE: LigneVosSaisies = {
  cle: 'reunion',
  libelle: 'Prochaine réunion',
  etat: 'a_faire',
  detail: 'À faire, date non confirmée',
  action: { libelle: 'Renseigner', vers: '/saisir/reunion' },
}

export const LIGNE_REUNION_FAITE: LigneVosSaisies = {
  cle: 'reunion',
  libelle: 'Prochaine réunion',
  etat: 'fait',
  detail: 'Fait, lundi 5 oct., 19 h 30',
  action: { libelle: 'Corriger', vers: '/saisir/reunion' },
}

/** Un événement du ministère à confirmer (T31). */
export const LIGNE_EVENEMENT_A_CONFIRMER: LigneVosSaisies = {
  cle: 'evenement:louange',
  libelle: 'Événement « Soirée de louange », samedi 10 oct.',
  etat: 'a_faire',
  detail: 'À faire : en attente de validation, dans 3 jours',
  action: { libelle: 'Mettre à jour', vers: '/saisir/evenement/louange' },
}

/** Un événement d'Intégration qui mentionne le ministère : rien à faire, pas de bouton. */
export const LIGNE_EVENEMENT_MENTIONNE: LigneVosSaisies = {
  cle: 'evenement:welcome',
  libelle: 'Événement « Welcome Prodiges », jeudi 15 oct.',
  etat: 'fait',
  detail: 'Mentionné par Intégration : en attente de validation, dans 2 jours',
  action: null,
}

export const POINTS_EXEMPLE: PointFiche[] = [
  {
    id: 'p1',
    priorite: 'haute',
    ministere: 'Communication',
    echeance: { texte: 'avant le 3 oct.', depassee: false },
    titre: { texte: 'Salle pour la soirée de louange', masque: false },
    description: null,
    attendu: { texte: 'Confirmer la salle', masque: false },
    mentions: ['Coordination'],
    mentionnePar: null,
    traite: null,
  },
  {
    id: 'p2',
    priorite: 'normale',
    ministere: 'Intégration',
    echeance: { texte: 'avant le 8 oct.', depassee: false },
    titre: { texte: 'Visuels pour Welcome Prodiges', masque: false },
    description: null,
    attendu: { texte: 'Livrer les visuels', masque: false },
    mentions: ['Communication'],
    mentionnePar: 'Intégration',
    traite: null,
  },
]

/** L'accueil de la maquette 07 : chiffres et session faits, la prochaine réunion reste. */
export function exempleAccueil(
  lignes: readonly LigneVosSaisies[] = [
    LIGNE_DIMANCHE_FAIT,
    LIGNE_BATIR_FAITE,
    LIGNE_REUNION_A_FAIRE,
  ],
  points: PointFiche[] = POINTS_EXEMPLE,
): DonneesAccueilMinistere {
  return {
    ouverture: construireOuverture(lignes, CONTEXTE_EXEMPLE),
    vosSaisies: [...lignes],
    vosPoints: { etat: 'donnees', donnees: points },
  }
}
