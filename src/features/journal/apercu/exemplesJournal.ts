// Données d'exemple de l'écran 06 (aperçu /apercu/journal et tests) : les lignes de la maquette 06
// et du jeu d'exemple de l'étape 1, au 1er octobre 2026, plus des lignes d'autres natures (points,
// événements, signalements, précisions, indicateurs) pour montrer ce que chaque profil lit. Données
// fictives : aucun nom de personne. Les lignes de remplissage (une saisie par jour, du 3 au 23
// septembre) portent le journal au-delà de 50 lignes sur 30 jours, pour « Afficher 50 lignes de
// plus ». Le jeu compte 79 lignes ; ce que chaque profil en lit est dans `lignesLisibles`, qui
// rejoue les règles de lecture de la base (BRIEF, section 7) pour l'aperçu seulement.

import type { IndicateurCommun } from '@/data/eglise'
import type { DemandeJournal, LigneJournal, SessionJournal } from '@/data/journal'
import type { MinistereListe } from '@/data/ministeres'
import { ACTIONS_HORS_ADMINISTRATION } from '@/features/journal/libellesActions'
import type { TypeCompte } from '@/lib/base'

export const AUJOURDHUI_EXEMPLE = '2026-10-01'

export const COMMUNICATION = 'min-communication'
export const JEUNESSE = 'min-jeunesse'
export const INTEGRATION = 'min-integration'
export const COORDINATION = 'min-coordination'
export const FIJ = 'min-fij'
export const SOCIAL = 'min-social'

/** Ministère « Social » désactivé : ses lignes restent lisibles. */
export const MINISTERES_EXEMPLE: MinistereListe[] = [
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  { id: JEUNESSE, code: null, nom: 'Jeunesse', desactive_le: null },
  { id: INTEGRATION, code: null, nom: 'Intégration', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: FIJ, code: 'fij', nom: 'FIJ', desactive_le: null },
  { id: SOCIAL, code: null, nom: 'Social', desactive_le: '2026-09-29T20:00:00+02:00' },
]

/** Le compte du ministère que lit l'aperçu « Mon journal » (le même que `LIBELLES_EXEMPLE`). */
export const COMPTE_MINISTERE_EXEMPLE = 'compte-communication'

export const COMPTES_EXEMPLE = [
  { user_id: 'compte-berger', libelle: 'Berger', desactive_le: null },
  { user_id: 'compte-conseil-3', libelle: 'Conseil, compte 3', desactive_le: null },
  { user_id: 'compte-ejptech', libelle: 'EJP Tech', desactive_le: null },
  { user_id: 'compte-admin', libelle: "Administration de l'église", desactive_le: null },
  { user_id: COMPTE_MINISTERE_EXEMPLE, libelle: 'Ministère Communication', desactive_le: null },
  { user_id: 'compte-jeunesse', libelle: 'Ministère Jeunesse', desactive_le: null },
  { user_id: 'compte-integration', libelle: 'Ministère Intégration', desactive_le: null },
  { user_id: 'compte-coordination', libelle: 'Ministère Coordination', desactive_le: null },
  { user_id: 'compte-fij', libelle: 'Ministère FIJ', desactive_le: null },
  {
    user_id: 'compte-social',
    libelle: 'Ministère Social',
    desactive_le: '2026-09-29T20:00:00+02:00',
  },
] as const

const LIBELLE_DU_COMPTE = new Map<string, string>(
  COMPTES_EXEMPLE.map((compte) => [compte.user_id, compte.libelle]),
)
const MINISTERE_DU_COMPTE = new Map<string, string>([
  [COMPTE_MINISTERE_EXEMPLE, COMMUNICATION],
  ['compte-jeunesse', JEUNESSE],
  ['compte-integration', INTEGRATION],
  ['compte-coordination', COORDINATION],
  ['compte-fij', FIJ],
  ['compte-social', SOCIAL],
])
const NOM_DU_MINISTERE = new Map<string, string>(
  MINISTERES_EXEMPLE.map((ministere) => [ministere.id, ministere.nom]),
)

export const COMMUNS_EXEMPLE: IndicateurCommun[] = [
  { id: 'ind-service', code: 'service', nature: 'dimanche' },
  { id: 'ind-actifs', code: 'actifs', nature: 'dimanche' },
  { id: 'ind-fij', code: 'en_fij', nature: 'dimanche' },
]

/** Indicateur sensible de l'exemple : l'administration ne lit aucun envoi qui le contient (P50). */
const INDICATEUR_SENSIBLE = 'ind-sensible'

export const SESSIONS_EXEMPLE: SessionJournal[] = [
  { id: 'session-batir', type: 'batir', date: '2026-09-26', intitule: null },
  { id: 'session-anti', type: 'anti_dispersion', date: '2026-10-03', intitule: null },
]

type Ajout = {
  compte: string
  action: string
  ministere?: string | null
  cible?: string | null
  cibleId?: string | null
  detail?: LigneJournal['detail']
  /** Texte actuel de l'objet visé, tel que le lirait EJP Tech (null : illisible pour le lecteur). */
  texte?: string | null
}

function ligne(id: number, le: string, ajout: Ajout): LigneJournal {
  const ministereDuCompte = MINISTERE_DU_COMPTE.get(ajout.compte) ?? null
  const ministere = ajout.ministere === undefined ? ministereDuCompte : ajout.ministere
  return {
    id,
    le,
    compte: ajout.compte,
    ministere_id: ministere,
    auteur_ministere_id: ministereDuCompte,
    action: ajout.action,
    cible: ajout.cible ?? null,
    cible_id: ajout.cibleId ?? null,
    detail: ajout.detail ?? {},
    compte_libelle: LIBELLE_DU_COMPTE.get(ajout.compte) ?? 'Système',
    ministere_nom: ministere === null ? null : (NOM_DU_MINISTERE.get(ministere) ?? null),
    cible_texte: ajout.texte ?? null,
  }
}

const MESURE = (indicateur: string, valeur: number, jour = '2026-09-27') => ({
  indicateur_id: indicateur,
  date_ref: jour,
  valeur,
  corrige: false,
})

/** Les lignes de la maquette 06 et d'autres natures, du 24 au 30 septembre. */
const LIGNES_PRINCIPALES: LigneJournal[] = [
  ligne(1001, '2026-09-30T09:12:00+02:00', {
    compte: 'compte-berger',
    action: 'point_traite',
    ministere: COMMUNICATION,
    cible: 'point_attention',
    cibleId: 'p-micros',
    detail: { avec_commentaire: true },
    texte: "Micros pour Bâtir l'Église",
  }),
  ligne(1002, '2026-09-29T21:47:00+02:00', {
    compte: 'compte-ejptech',
    action: 'texte_masque',
    ministere: SOCIAL,
    cible: 'point_attention',
    cibleId: 'p-social',
    detail: { champ: 'titre', motif: 'nom_personne' },
    texte: '[texte masqué par EJP Tech]',
  }),
  ligne(1022, '2026-09-29T08:00:00+02:00', {
    compte: 'compte-social',
    action: 'point_cree',
    cible: 'point_attention',
    cibleId: 'p-social',
    detail: { priorite: 'haute', mentions: [] },
    texte: '[texte masqué par EJP Tech]',
  }),
  ligne(1003, '2026-09-29T18:03:00+02:00', {
    compte: 'compte-integration',
    action: 'point_cree',
    cible: 'point_attention',
    cibleId: 'p-visuels',
    detail: { priorite: 'normale', mentions: [COMMUNICATION] },
    texte: 'Visuels pour Welcome Prodiges',
  }),
  ligne(1004, '2026-09-29T10:05:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'difficulte_signalee',
    cible: 'signalement',
    cibleId: 'sig-1',
    detail: { ecran: 'saisie_dimanche' },
    texte: 'saisie_dimanche',
  }),
  ligne(1005, '2026-09-28T20:15:00+02:00', {
    compte: 'compte-admin',
    action: 'session_declaree',
    ministere: null,
    cible: 'session',
    cibleId: 'session-anti',
    detail: { type: 'anti_dispersion', date: '2026-10-03', attendus: 8 },
  }),
  ligne(1006, '2026-09-28T09:30:00+02:00', {
    compte: 'compte-ejptech',
    action: 'signalement_clos',
    ministere: COMMUNICATION,
    cible: 'signalement',
    cibleId: 'sig-0',
    detail: { ecran: 'saisie_session', avec_commentaire: false },
    texte: 'saisie_session',
  }),
  ligne(1007, '2026-09-27T16:00:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'mesure_saisie',
    detail: {
      lignes: [{ indicateur_id: INDICATEUR_SENSIBLE, date_ref: '2026-09-01', corrige: false }],
    },
  }),
  ligne(1008, '2026-09-27T12:41:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'mesure_saisie',
    detail: { lignes: [MESURE('ind-service', 10)] },
  }),
  ligne(1009, '2026-09-27T12:38:00+02:00', {
    compte: 'compte-jeunesse',
    action: 'mesure_saisie',
    detail: { lignes: [MESURE('ind-service', 9)] },
  }),
  ligne(1010, '2026-09-27T12:20:00+02:00', {
    compte: 'compte-fij',
    action: 'fij_saisie',
    detail: { total: 29 },
  }),
  ligne(1011, '2026-09-26T22:05:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'participation_saisie',
    ministere: COMMUNICATION,
    cible: 'session',
    cibleId: 'session-batir',
    detail: { valeur: 13, deja_comptes: 0 },
  }),
  ligne(1012, '2026-09-26T21:58:00+02:00', {
    compte: 'compte-jeunesse',
    action: 'participation_saisie',
    cible: 'session',
    cibleId: 'session-batir',
    detail: { valeur: 13, deja_comptes: 2 },
  }),
  ligne(1013, '2026-09-26T14:00:00+02:00', {
    compte: 'compte-ejptech',
    action: 'texte_relu',
    ministere: COMMUNICATION,
    cible: 'precision_sensible',
    cibleId: 'prec-1',
    texte: null,
  }),
  ligne(1014, '2026-09-26T10:30:00+02:00', {
    compte: 'compte-conseil-3',
    action: 'point_traite',
    ministere: JEUNESSE,
    cible: 'point_attention',
    cibleId: 'p-transport',
    detail: { avec_commentaire: false },
    texte: 'Transport des Prodiges Junior',
  }),
  ligne(1015, '2026-09-25T15:20:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'evenement_ajoute',
    cible: 'evenement',
    cibleId: 'ev-louange',
    detail: { date: '2026-10-17', statut: 'valide', mentions: [] },
    texte: 'Soirée de louange',
  }),
  ligne(1016, '2026-09-25T11:00:00+02:00', {
    compte: 'compte-berger',
    action: 'texte_relu',
    ministere: SOCIAL,
    cible: 'point_attention',
    cibleId: 'p-social',
  }),
  ligne(1017, '2026-09-25T10:00:00+02:00', {
    compte: 'compte-integration',
    action: 'point_statut',
    cible: 'point_attention',
    cibleId: 'p-salle',
    detail: { statut: ['a_traiter', 'en_cours'] },
    texte: 'Salle pour la soirée de louange',
  }),
  ligne(1018, '2026-09-25T09:00:00+02:00', {
    compte: 'compte-admin',
    action: 'compte_cree',
    ministere: JEUNESSE,
    cible: 'compte',
    cibleId: 'compte-jeunesse',
    detail: { type: 'ministere' },
    texte: 'Ministère Jeunesse',
  }),
  ligne(1019, '2026-09-24T20:00:00+02:00', {
    compte: 'compte-admin',
    action: 'indicateur_retire',
    ministere: COORDINATION,
    cible: 'indicateur',
    cibleId: 'ind-doublon',
    detail: { motif: 'doublon', avec_saisies: false },
    texte: 'Réunions tenues',
  }),
  ligne(1020, '2026-09-24T19:12:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'mesure_saisie',
    detail: {
      lignes: [MESURE('ind-actifs', 14, '2026-09-20'), MESURE('ind-fij', 11, '2026-09-20')],
    },
  }),
  ligne(1021, '2026-09-24T15:00:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'reunion_saisie',
    cible: 'reunion',
    cibleId: 'reunion-1',
    detail: { date: '2026-10-05', heure: '20:00:00' },
  }),
]

const MINISTERES_REMPLISSAGE = [
  { compte: COMPTE_MINISTERE_EXEMPLE },
  { compte: 'compte-jeunesse' },
  { compte: 'compte-integration' },
  { compte: 'compte-fij' },
  { compte: 'compte-coordination' },
]

/** 53 saisies, une toutes les 9 heures, du 23 septembre au soir jusqu'au 3 septembre. */
const LIGNES_DE_REMPLISSAGE: LigneJournal[] = Array.from({ length: 53 }, (_, rang) => {
  const instant = new Date(Date.parse('2026-09-23T20:00:00+02:00') - rang * 9 * 3_600_000)
  const { compte } = MINISTERES_REMPLISSAGE[rang % MINISTERES_REMPLISSAGE.length] ?? {
    compte: COMPTE_MINISTERE_EXEMPLE,
  }
  return ligne(900 - rang, instant.toISOString(), {
    compte,
    action: 'mesure_saisie',
    detail: { lignes: [MESURE('ind-service', 6 + (rang % 9), '2026-09-20')] },
  })
})

/** Des lignes plus anciennes que 30 jours : « 3 derniers mois » et « Depuis le début ». */
const LIGNES_ANCIENNES: LigneJournal[] = [
  ligne(500, '2026-08-20T19:30:00+02:00', {
    compte: COMPTE_MINISTERE_EXEMPLE,
    action: 'mesure_saisie',
    detail: { lignes: [MESURE('ind-service', 8, '2026-08-16')] },
  }),
  ligne(499, '2026-07-08T11:00:00+02:00', {
    compte: 'compte-admin',
    action: 'session_supprimee',
    ministere: null,
    cible: 'session',
    cibleId: 'session-supprimee',
    detail: { type: 'anti_dispersion', date: '2026-07-11' },
  }),
  ligne(498, '2026-06-15T09:00:00+02:00', {
    compte: 'compte-admin',
    action: 'ministere_cree',
    ministere: FIJ,
    cible: 'ministere',
    cibleId: FIJ,
    texte: 'FIJ',
  }),
  ligne(497, '2026-06-01T09:05:00+02:00', {
    compte: 'compte-systeme',
    action: 'compte_cree',
    ministere: null,
    cible: 'compte',
    cibleId: 'compte-admin',
    detail: { type: 'admin_eglise' },
    texte: "Administration de l'église",
  }),
]

/** Tout le journal d'exemple, du plus récent au plus ancien. */
export const LIGNES_EXEMPLE: LigneJournal[] = [
  ...LIGNES_PRINCIPALES,
  ...LIGNES_DE_REMPLISSAGE,
  ...LIGNES_ANCIENNES,
].sort((a, b) => Date.parse(b.le) - Date.parse(a.le) || b.id - a.id)

const CIBLES_HORS_ADMINISTRATION = ['precision_sensible', 'signalement', 'signalement_suivi']
const CIBLES_DE_TEXTES_HORS_ADMINISTRATION = [
  'demande_indicateur',
  'point_attention',
  'point_suivi',
  'evenement',
  'reunion',
]

function envoiAvecUnSensible(detail: LigneJournal['detail']): boolean {
  const lignes = detail?.['lignes']
  return (
    Array.isArray(lignes) &&
    lignes.some(
      (envoi) => (envoi as { indicateur_id?: unknown }).indicateur_id === INDICATEUR_SENSIBLE,
    )
  )
}

/**
 * Ce que la base laisserait lire à ce profil (BRIEF, section 7, matrice de `journal`), rejoué pour
 * l'aperçu : le berger et le conseil lisent tout sauf les signalements (T39) ; EJP Tech lit tout ;
 * l'administration de l'église lit sa liste fermée (ni signalement, ni précision, ni point, ni
 * événement, ni réunion, ni envoi qui contient un sensible, T47, P50, P51) ; un ministère lit les
 * lignes de son ministère et de son compte.
 */
export function lignesLisibles(
  lignes: readonly LigneJournal[],
  profil: TypeCompte,
): LigneJournal[] {
  switch (profil) {
    case 'admin_plateforme':
      return [...lignes]
    case 'berger':
    case 'conseil':
      return lignes.filter(
        (l) =>
          !['signalement', 'signalement_suivi'].includes(l.cible ?? '') &&
          !['difficulte_signalee', 'signalement_clos'].includes(l.action),
      )
    case 'admin_eglise':
      return lignes.filter(
        (l) =>
          !(ACTIONS_HORS_ADMINISTRATION as readonly string[]).includes(l.action) &&
          !CIBLES_HORS_ADMINISTRATION.includes(l.cible ?? '') &&
          !(
            ['texte_relu', 'texte_masque'].includes(l.action) &&
            CIBLES_DE_TEXTES_HORS_ADMINISTRATION.includes(l.cible ?? '')
          ) &&
          !(l.action === 'mesure_saisie' && envoiAvecUnSensible(l.detail)),
      )
    case 'ministere':
      return lignes.filter(
        (l) => l.ministere_id === COMMUNICATION || l.compte === COMPTE_MINISTERE_EXEMPLE,
      )
  }
}

/**
 * La lecture de `lireJournal` sur les lignes d'exemple, pour l'aperçu : mêmes filtres, même ordre,
 * même « une ligne de plus que la limite » pour savoir s'il en reste.
 */
export function lireExemple(
  demande: DemandeJournal,
  profil: TypeCompte,
): { lignes: LigneJournal[]; aPlus: boolean } {
  const depuis = demande.depuis === null ? null : Date.parse(demande.depuis)
  const retenues = lignesLisibles(LIGNES_EXEMPLE, profil).filter(
    (l) =>
      (demande.compte === null || l.compte === demande.compte) &&
      (demande.action === null || l.action === demande.action) &&
      (demande.ministere === null ||
        l.ministere_id === demande.ministere ||
        l.auteur_ministere_id === demande.ministere) &&
      (depuis === null || Date.parse(l.le) >= depuis),
  )
  return { lignes: retenues.slice(0, demande.limite), aPlus: retenues.length > demande.limite }
}
