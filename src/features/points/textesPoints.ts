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
  /** Phrase sous le titre, selon le profil (maquette 05 pour le berger et le conseil). */
  introduction: {
    berger:
      'Triés par priorité, puis par échéance. Les décisions se prennent en conseil ; ici, on marque seulement ce qui est traité.',
    conseil:
      'Triés par priorité, puis par échéance. Les décisions se prennent en conseil ; ici, on marque seulement ce qui est traité.',
    /** Proposé : le ministère lit ses points et ceux qui le mentionnent. */
    ministere:
      'Les points créés par votre ministère ou qui le mentionnent, triés par priorité, puis par échéance.',
    /** Proposé : EJP Tech lit sans rien marquer (T29). */
    admin_plateforme:
      'Triés par priorité, puis par échéance. Les décisions se prennent en conseil ; vous lisez les points sans les modifier.',
  } satisfies Record<ProfilPoints, string>,

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
    /** Libellé du choix et nom accessible de l'aide `points.filtre`. */
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
  /** « Intégration, mentions : » puis les mentions, ou « Aucune ». */
  mentions: 'mentions :',
  aucuneMention: 'Aucune',
  /** Statut d'un point traité, dans la colonne « Statut ». */
  traite: 'Traité',

  titreTraitesRecemment: 'Traités récemment',
  /** « Traité le 30 sept. par Coordination » ; sans auteur lisible, « Traité le 30 sept. ». */
  traiteLe: (jour: string, auteur: string | null): string =>
    auteur === null ? `Traité le ${jour}` : `Traité le ${jour} par ${auteur}`,

  vide: {
    /** LISEZMOI, « États » (05). */
    ouverts: 'Aucun point ouvert.',
    traites: "Aucun point traité pour l'instant.",
    /** Proposé. */
    tous: "Aucun point pour l'instant.",
    /** Proposé : un ministère choisi dans le filtre, sans point dans cette vue. */
    ouvertsDe: (nom: string): string => terminerPhrase(`Aucun point ouvert pour ${nom}`),
    traitesDe: (nom: string): string => terminerPhrase(`Aucun point traité pour ${nom}`),
    tousDe: (nom: string): string => terminerPhrase(`Aucun point pour ${nom}`),
    /** Proposé : ce qui viendra, sous l'état vide du ministère. */
    suiteMinistere: 'Les points que vous créez, et ceux qui vous mentionnent, apparaîtront ici.',
  },

  /** LISEZMOI, « États » : mêmes textes que « Cette semaine ». */
  chargement: 'Chargement',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const
