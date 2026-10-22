// Textes de l'écran 05 « Points d'attention » et de « Mes points » (lot P3). Aucun composant
// n'écrit un de ces textes en dur. Sources : BRIEF, section 9 (écran 05) ; maquette 05 ;
// LISEZMOI des maquettes, « États » (« Aucun point ouvert. », « Aucun point traité pour
// l'instant. »). Les textes marqués « Proposé » ne viennent ni du brief ni de la maquette : ils
// attendent la validation de la coordination (docs/decisions.md, T36 pour les états vides).

import type { TypeCompte } from '@/lib/base'
import { terminerPhrase } from '@/lib/metier/texte'

/** Profils qui lisent les points : l'administration de l'église reçoit la page non disponible. */
export type ProfilPoints = Extract<
  TypeCompte,
  'ministere' | 'berger' | 'conseil' | 'admin_plateforme'
>

/** Les trois vues de l'écran (paramètre `vue` de l'adresse). */
export type VuePoints = 'ouverts' | 'traites' | 'tous'

export const VUES_POINTS: readonly VuePoints[] = ['ouverts', 'traites', 'tous']

export const TEXTES_POINTS = {
  /**
   * Phrase sous le titre : le ministère seul, pour dire ce que contient sa liste. L'ordre de tri
   * et les droits ne se décrivent pas (T66, t246 à t248 ; guide, exemple 1).
   */
  introduction: {
    ministere: 'Vos points et ceux qui mentionnent votre ministère.',
  } satisfies Partial<Record<ProfilPoints, string>>,
  /** Bouton du ministère, en tête de « Mes points » et dans ses états vides (T66, point ouvert 8). */
  nouveauPoint: 'Nouveau point',
  /** Action d'un filtre sans résultat : revenir à tous les ministères (m163). */
  voirTousLesMinisteres: 'Voir tous les ministères',

  navigationVues: 'Vues des points',
  /** Libellé d'un onglet, avec son nombre : « Ouverts (4) ». */
  onglet: (vue: VuePoints, nombre: number): string => {
    const libelles: Record<VuePoints, string> = {
      ouverts: 'Ouverts',
      traites: 'Traités',
      tous: 'Tous',
    }
    return `${libelles[vue]} (${nombre})`
  },
  /** Titre masqué de la liste, pour les lecteurs d'écran (les rangées sont des h3). */
  titreListe: {
    ouverts: 'Points ouverts',
    traites: 'Points traités',
    tous: 'Tous les points',
  } satisfies Record<VuePoints, string>,

  filtre: {
    /** Libellé du choix, lu par les lecteurs d'écran. */
    libelle: 'Filtrer par ministère',
    tous: 'Tous les ministères',
  },

  entetes: {
    priorite: 'Priorité',
    point: 'Point',
    statut: 'Statut',
    echeance: 'Échéance',
  },
  /** Mot lu avant le statut et l'échéance quand la colonne n'a pas d'en-tête visible. */
  statutDe: 'Statut : ',
  echeanceDe: 'Échéance : ',
  priorite: 'Priorité ',
  attendu: 'Attendu :',
  /**
   * Lu avant les puces « @Coordination » par les lecteurs d'écran seulement : « Intégration
   * mentionne @Coordination ». Sans mention, rien (T66, t250 et t251).
   */
  mentionne: 'mentionne',
  /** Statut d'un point traité, dans la colonne « Statut ». */
  traite: 'Traité',

  titreTraitesRecemment: 'Traités récemment',
  /** « Traité le 30 sept. par Coordination » ; sans auteur lisible, « Traité le 30 sept. ». */
  traiteLe: (jour: string, auteur: string | null): string =>
    auteur === null ? `Traité le ${jour}` : `Traité le ${jour} par ${auteur}`,

  /**
   * États vides : la phrase seule ; le ministère a le bouton « Nouveau point » (ouverts et tous),
   * un filtre sans résultat « Voir tous les ministères » (T66, m159 à m163).
   */
  vide: {
    /** LISEZMOI, « États » (05). */
    ouverts: 'Aucun point ouvert.',
    traites: 'Aucun point traité.',
    tous: 'Aucun point.',
    /** Un ministère choisi dans le filtre, sans point dans cette vue. */
    ouvertsDe: (nom: string): string => terminerPhrase(`Aucun point ouvert pour ${nom}`),
    traitesDe: (nom: string): string => terminerPhrase(`Aucun point traité pour ${nom}`),
    tousDe: (nom: string): string => terminerPhrase(`Aucun point pour ${nom}`),
  },

  /** LISEZMOI, « États » : mêmes textes que « Cette semaine ». */
  chargement: 'Chargement',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const
