// Lignes d'exemple de l'aperçu de la fiche (/apercu/fiche, lot E2) : ce que la base rendrait pour
// la fiche de Social, sans base ni requête. Les valeurs suivent le profil demandé, comme les vues :
// exactes pour le ministère, « moins de 3 » et répartition protégée (P47) pour le berger, le
// conseil et EJP Tech. Le jour de Paris est fixé au mercredi 7 octobre 2026 (dimanche de référence
// le 4 octobre). Données fictives, sans aucune donnée personnelle.

import type { IndicateurCommun } from '@/data/eglise'
import type { LigneDerniereSaisie } from '@/data/fiche'
import type { LecturesFiche } from '@/features/fiche/construireFiche'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'
import type { LigneVue } from '@/lib/base'

export const SOCIAL = '10000000-0000-4000-8000-000000000005'
const INTEGRATION = '10000000-0000-4000-8000-000000000002'
const COORDINATION = '10000000-0000-4000-8000-000000000003'
const COMMUNICATION = '10000000-0000-4000-8000-000000000001'

/** Écrans de l'aperçu (`?ecran=`). */
export const ECRANS_APERCU_FICHE = [
  'fiche',
  'fiche-vide',
  'fiche-erreur-bloc',
  'chargement',
  'erreur',
  'introuvable',
  'ministeres',
  'ministeres-vide',
  'ministeres-erreur',
] as const

export type EcranApercuFiche = (typeof ECRANS_APERCU_FICHE)[number]

/** `?ecran=` lu, `fiche` par défaut. */
export function lireEcranApercuFiche(valeur: string | null): EcranApercuFiche {
  return ECRANS_APERCU_FICHE.find((ecran) => ecran === valeur) ?? 'fiche'
}

const COMMUNS: IndicateurCommun[] = [
  { id: 'c0000000-0000-4000-8000-000000000001', code: 'service', nature: 'dimanche' },
  { id: 'c0000000-0000-4000-8000-000000000002', code: 'actifs', nature: 'a_ce_jour' },
  { id: 'c0000000-0000-4000-8000-000000000003', code: 'en_fij', nature: 'a_ce_jour' },
]
const [SERVICE, ACTIFS, EN_FIJ] = COMMUNS.map((commun) => commun.id) as [string, string, string]

const PASSAGES = 'a0000000-0000-4000-8000-000000000001'
const FONDS = 'a0000000-0000-4000-8000-000000000002'
const ACTIONS = 'a0000000-0000-4000-8000-000000000003'
const COLLECTES = 'a0000000-0000-4000-8000-000000000004'
const PARTENARIATS = 'a0000000-0000-4000-8000-000000000005'
const MARAUDES = 'a0000000-0000-4000-8000-000000000006'
const TAUX = 'a0000000-0000-4000-8000-000000000007'
const PART = 'a0000000-0000-4000-8000-000000000008'
const MOYENNE = 'a0000000-0000-4000-8000-000000000009'
const COLIS = 'a0000000-0000-4000-8000-000000000010'

type Mesure = LigneVue<'v_mesure_periode'>

function mesure(
  indicateur: string,
  nature: Mesure['nature'],
  periode: string,
  valeur: number,
): Mesure {
  return {
    indicateur_id: indicateur,
    ministere_id: SOCIAL,
    nature,
    periode,
    valeur,
    moins_de_3: false,
    saisi_le: `${periode}T12:41:00+02:00`,
  }
}

const SERVICE_DIMANCHES: [string, number][] = [
  ['2026-07-26', 9],
  ['2026-08-02', 10],
  ['2026-08-09', 8],
  ['2026-08-23', 9],
  ['2026-08-30', 11],
  ['2026-09-06', 10],
  ['2026-09-13', 9],
  ['2026-09-20', 9],
  ['2026-09-27', 9],
  ['2026-10-04', 10],
]

type Suivi = LigneVue<'v_indicateur_suivi'>

function suivi(ligne: Partial<Suivi> & Pick<Suivi, 'indicateur_id' | 'libelle' | 'nature'>): Suivi {
  return {
    ministere_id: SOCIAL,
    definition: "Définition de l'exemple.",
    unite: 'nombre',
    sensible: false,
    etat: 'actif',
    origine: 'eglise',
    calcul: null,
    derniere_periode: null,
    derniere_valeur: null,
    derniere_moins_de_3: false,
    derniere_saisie_le: null,
    mois_en_cours_valeur: null,
    mois_en_cours_moins_de_3: false,
    somme_annee: null,
    somme_moins_de_3: false,
    somme_depuis: null,
    somme_nb_saisies: null,
    somme_nb_attendues: null,
    plus_de_30_jours: false,
    etat_valeur: 'saisi',
    attente_jours: null,
    retire_le: null,
    ...ligne,
  }
}

function suiviSocial(exact: boolean): Suivi[] {
  return [
    suivi({
      indicateur_id: PASSAGES,
      libelle: 'Bénéficiaires (passages)',
      nature: 'mois',
      sensible: true,
      derniere_periode: '2026-09-01',
      derniere_valeur: exact ? 2 : null,
      derniere_moins_de_3: !exact,
      derniere_saisie_le: '2026-10-03T20:00:00+02:00',
      mois_en_cours_valeur: 7,
      somme_annee: exact ? 9 : 6,
      somme_depuis: '2026-06-01',
      somme_nb_saisies: 4,
      somme_nb_attendues: 4,
    }),
    suivi({
      indicateur_id: FONDS,
      libelle: 'Fonds levés',
      nature: 'mois',
      unite: 'euros',
      derniere_periode: '2026-09-01',
      derniere_valeur: 1250,
      derniere_saisie_le: '2026-10-03T20:00:00+02:00',
      somme_annee: 2050,
      somme_depuis: '2026-08-01',
      somme_nb_saisies: 2,
      somme_nb_attendues: 2,
    }),
    suivi({
      indicateur_id: ACTIONS,
      libelle: 'Actions sociales',
      nature: 'mois',
      derniere_periode: '2026-09-01',
      derniere_valeur: 3,
      derniere_saisie_le: '2026-10-03T20:00:00+02:00',
      mois_en_cours_valeur: 1,
      somme_annee: 3,
      somme_depuis: '2026-09-01',
      somme_nb_saisies: 1,
      somme_nb_attendues: 1,
    }),
    suivi({
      indicateur_id: COLLECTES,
      libelle: 'Collectes organisées',
      nature: 'mois',
      etat: 'en_attente',
      origine: 'ministere',
      etat_valeur: 'jamais_saisi',
      attente_jours: 2,
    }),
    suivi({
      indicateur_id: PARTENARIATS,
      libelle: 'Partenariats actifs',
      nature: 'a_ce_jour',
      derniere_periode: '2026-08-20',
      derniere_valeur: 4,
      derniere_saisie_le: '2026-08-20T20:00:00+02:00',
      plus_de_30_jours: true,
    }),
    suivi({
      indicateur_id: MARAUDES,
      libelle: 'Personnes rencontrées en maraude',
      nature: 'dimanche',
      derniere_periode: '2026-10-04',
      derniere_valeur: 12,
      derniere_saisie_le: '2026-10-04T13:10:00+02:00',
      somme_annee: 104,
      somme_depuis: '2026-08-02',
      somme_nb_saisies: 8,
      somme_nb_attendues: 10,
    }),
    suivi({
      indicateur_id: TAUX,
      libelle: 'Taux de passages orientés',
      nature: 'mois',
      calcul: 'taux',
    }),
    suivi({
      indicateur_id: PART,
      libelle: 'Part des actions en partenariat',
      nature: 'mois',
      calcul: 'taux',
    }),
    suivi({
      indicateur_id: MOYENNE,
      libelle: 'Montant moyen par action',
      nature: 'mois',
      unite: 'euros',
      calcul: 'moyenne',
    }),
    suivi({
      indicateur_id: COLIS,
      libelle: 'Colis distribués',
      nature: 'mois',
      etat: 'retire',
      retire_le: '2026-09-05T10:00:00+02:00',
    }),
  ]
}

type Calcul = LigneVue<'v_calcul'>

/** `haut_depasse_bas`, telle que la base la rend (P49), absente du type de `v_calcul` (E1). */
export const RAISON_HAUT_DEPASSE_BAS = 'haut_depasse_bas' as unknown as Calcul['non_calcule_raison']

function calcul(ligne: Partial<Calcul> & Pick<Calcul, 'indicateur_id' | 'calcul'>): Calcul {
  return {
    ministere_id: SOCIAL,
    periode: '2026-09-01',
    haut: null,
    bas: null,
    resultat: null,
    annee_haut: null,
    annee_bas: null,
    annee_resultat: null,
    annee_nb_periodes: null,
    annee_nb_attendues: null,
    non_calcule_raison: null,
    non_calcule_source_id: null,
    ...ligne,
  }
}

const CALCULS: Calcul[] = [
  calcul({
    indicateur_id: TAUX,
    calcul: 'taux',
    haut: 16,
    bas: 20,
    resultat: 80,
    annee_haut: 32,
    annee_bas: 41,
    annee_resultat: 78,
    annee_nb_periodes: 2,
    annee_nb_attendues: 2,
  }),
  // Une part dont le haut dépasse le bas : « Non calculé, à vérifier » (P49). Le type de `v_calcul`
  // (E1) ne nomme pas encore cette raison, que B4 a ajoutée à la vue.
  {
    ...calcul({ indicateur_id: PART, calcul: 'taux', haut: 5, bas: 3 }),
    non_calcule_raison: RAISON_HAUT_DEPASSE_BAS,
  },
  calcul({
    indicateur_id: MOYENNE,
    calcul: 'moyenne',
    non_calcule_raison: 'source_non_saisie',
    non_calcule_source_id: COLLECTES,
  }),
]

type Serie = LigneVue<'v_indicateur_serie'>

const MOIS_SERIE = [
  '2025-10-01',
  '2025-11-01',
  '2025-12-01',
  '2026-01-01',
  '2026-02-01',
  '2026-03-01',
  '2026-04-01',
  '2026-05-01',
  '2026-06-01',
  '2026-07-01',
  '2026-08-01',
  '2026-09-01',
]

function serieMois(
  indicateur: string,
  valeurs: Readonly<Record<string, number>>,
  creeLe: string,
  exact: boolean,
  sensible: boolean,
): Serie[] {
  return MOIS_SERIE.map((periode, rang) => {
    const valeur = valeurs[periode] ?? null
    const masquee = sensible && !exact && valeur !== null && (valeur === 1 || valeur === 2)
    return {
      indicateur_id: indicateur,
      ministere_id: SOCIAL,
      periode,
      rang: rang + 1,
      valeur: masquee ? null : valeur,
      moins_de_3: masquee,
      complete: periode >= creeLe,
    }
  })
}

const DIMANCHES_SERIE = [
  '2026-08-02',
  '2026-08-09',
  '2026-08-16',
  '2026-08-23',
  '2026-08-30',
  '2026-09-06',
  '2026-09-13',
  '2026-09-20',
  '2026-09-27',
  '2026-10-04',
]
const MARAUDES_VALEURS = [14, 11, null, 13, 15, 12, null, 14, 13, 12]

function series(exact: boolean): Serie[] {
  return [
    ...serieMois(
      PASSAGES,
      { '2026-06-01': 6, '2026-07-01': 1, '2026-08-01': 0, '2026-09-01': 2 },
      '2026-06-01',
      exact,
      true,
    ),
    ...serieMois(FONDS, { '2026-08-01': 800, '2026-09-01': 1250 }, '2026-08-01', exact, false),
    ...serieMois(ACTIONS, { '2026-09-01': 3 }, '2026-09-01', exact, false),
    ...DIMANCHES_SERIE.map((periode, rang) => ({
      indicateur_id: MARAUDES,
      ministere_id: SOCIAL,
      periode,
      rang: rang + 1,
      valeur: MARAUDES_VALEURS[rang] ?? null,
      moins_de_3: false,
      complete: true,
    })),
  ]
}

type Repartition = LigneVue<'v_ventilation_sensible'>

function repartitions(exact: boolean): Repartition[] {
  const cases: [string | null, string, number, number | null, boolean, boolean][] = exact
    ? [
        ['malaise', 'Malaise', 1, 4, false, false],
        ['blessure', 'Blessure', 2, 2, false, false],
        ['autre', 'Autre', 3, 1, false, false],
        [null, 'Non réparti', 32767, 0, false, false],
      ]
    : [
        ['malaise', 'Malaise', 1, null, false, true],
        ['blessure', 'Blessure', 2, null, true, false],
        ['autre', 'Autre', 3, null, true, false],
        [null, 'Non réparti', 32767, 0, false, false],
      ]
  return cases.map(([categorie, libelle, ordre, valeur, moinsDe3, masquee]) => ({
    indicateur_id: PASSAGES,
    ministere_id: SOCIAL,
    periode: '2026-10-01',
    categorie,
    libelle,
    ordre,
    valeur,
    moins_de_3: moinsDe3,
    masquee,
    tout_masque: false,
  }))
}

function mesuresCommuns(): Mesure[] {
  return [
    ...SERVICE_DIMANCHES.map(([periode, valeur]) => mesure(SERVICE, 'dimanche', periode, valeur)),
    mesure(ACTIFS, 'a_ce_jour', '2026-09-24', 14),
    mesure(EN_FIJ, 'a_ce_jour', '2026-09-24', 11),
  ]
}

const MINISTERES = [
  { id: SOCIAL, code: null, nom: 'Social', desactive_le: null },
  { id: INTEGRATION, code: null, nom: 'Intégration', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
]

type Point = LigneVue<'v_point'>

function point(ligne: Partial<Point> & Pick<Point, 'id' | 'ministere_id' | 'titre'>): Point {
  return {
    description: null,
    action_attendue: null,
    priorite: 'normale',
    echeance: null,
    cree_le: '2026-09-22T21:30:00+02:00',
    cree_par: '20000000-0000-4000-8000-000000000005',
    statut: 'a_traiter',
    statut_le: '2026-09-22T21:30:00+02:00',
    traitement_id: null,
    traite_le: null,
    traite_par: null,
    traite_commentaire: null,
    ...ligne,
  }
}

const POINTS: Point[] = [
  point({
    id: 'b0000000-0000-4000-8000-000000000001',
    ministere_id: SOCIAL,
    titre: 'Local de stockage des dons',
    description: 'Le local actuel ne sera plus disponible à partir de novembre.',
    action_attendue: 'Choisir un nouveau local',
    priorite: 'haute',
    echeance: '2026-10-15',
    statut: 'attente_decision',
  }),
  point({
    id: 'b0000000-0000-4000-8000-000000000002',
    ministere_id: INTEGRATION,
    titre: 'Accueil des familles le dimanche',
    description: TEXTE_MASQUE,
    action_attendue: 'Proposer un relais au culte',
    echeance: '2026-10-02',
    statut: 'en_cours',
  }),
  point({
    id: 'b0000000-0000-4000-8000-000000000003',
    ministere_id: SOCIAL,
    titre: 'Bénévoles pour la collecte de rentrée',
    statut: 'traite',
    traitement_id: 'b1000000-0000-4000-8000-000000000003',
    traite_le: '2026-10-03T18:00:00+02:00',
    traite_commentaire: 'Trois équipes se relaient, le planning est affiché au local.',
  }),
]

const MENTIONS = [
  { point_id: 'b0000000-0000-4000-8000-000000000001', ministere_id: COORDINATION },
  { point_id: 'b0000000-0000-4000-8000-000000000002', ministere_id: SOCIAL },
]

/** Lignes de la fiche de Social pour ce profil (`fiche-vide` : premier usage). */
export function lecturesExempleFiche(profil: ProfilFiche, vide: boolean): LecturesFiche {
  const exact = profil === 'ministere'
  const base: LecturesFiche = {
    semaine: { aujourdhui: '2026-10-07', dimanche: '2026-10-04' },
    ministere: {
      id: SOCIAL,
      code: null,
      nom: 'Social',
      description: 'Aide alimentaire et accompagnement des familles.',
      desactive_le: null,
    },
    derniereSaisie: '2026-10-04T13:10:00+02:00',
    communs: COMMUNS,
    libellesCommuns: [],
    mesuresCommuns: mesuresCommuns(),
    totauxDimanche: [],
    totauxACeJour: [],
    suivi: suiviSocial(exact),
    calculs: CALCULS,
    series: series(exact),
    sensibles: [{ id: PASSAGES, modele_code: 'social_beneficiaires_passages' }],
    categories: [
      {
        prevu_code: 'social_beneficiaires_passages',
        code: 'malaise',
        libelle: 'Malaise',
        ordre: 1,
        retiree_le: null,
      },
      {
        prevu_code: 'social_beneficiaires_passages',
        code: 'blessure',
        libelle: 'Blessure',
        ordre: 2,
        retiree_le: null,
      },
      {
        prevu_code: 'social_beneficiaires_passages',
        code: 'autre',
        libelle: 'Autre',
        ordre: 3,
        retiree_le: null,
      },
    ],
    repartitions: repartitions(exact),
    precisions: [
      {
        indicateur_id: PASSAGES,
        ministere_id: SOCIAL,
        mois: '2026-10-01',
        texte:
          'Plus de passages pendant la collecte de rentrée, tous orientés vers les bonnes permanences.',
      },
      { indicateur_id: PASSAGES, ministere_id: SOCIAL, mois: '2026-09-01', texte: TEXTE_MASQUE },
    ],
    points: { points: POINTS, mentions: MENTIONS },
    ministeres: MINISTERES,
  }
  if (!vide) return base
  return {
    ...base,
    derniereSaisie: null,
    mesuresCommuns: [],
    suivi: [],
    calculs: [],
    series: [],
    sensibles: [],
    categories: [],
    repartitions: [],
    precisions: [],
    points: { points: [], mentions: [] },
  }
}

/** Les cinq dernières lignes de journal écrites par Social. */
export const DERNIERES_SAISIES_EXEMPLE: LigneDerniereSaisie[] = [
  {
    id: 105,
    le: '2026-10-04T13:10:00+02:00',
    action: 'mesure_saisie',
    cible: null,
    cible_id: null,
    detail: { lignes: [{ indicateur_id: SERVICE, date_ref: '2026-10-04', valeur: 10 }] },
    cible_texte: null,
  },
  {
    id: 104,
    le: '2026-10-03T20:00:00+02:00',
    action: 'mesure_saisie',
    cible: null,
    cible_id: null,
    detail: { lignes: [{ indicateur_id: FONDS, date_ref: '2026-09-01', corrige: false }] },
    cible_texte: null,
  },
  {
    id: 103,
    le: '2026-09-26T22:05:00+02:00',
    action: 'participation_saisie',
    cible: 'session',
    cible_id: 'd0000000-0000-4000-8000-000000000001',
    detail: { valeur: 6, deja_comptes: 1 },
    cible_texte: null,
  },
  {
    id: 102,
    le: '2026-09-24T19:12:00+02:00',
    action: 'mesure_saisie',
    cible: null,
    cible_id: null,
    detail: {
      lignes: [
        { indicateur_id: ACTIFS, date_ref: '2026-09-24', valeur: 14 },
        { indicateur_id: EN_FIJ, date_ref: '2026-09-24', valeur: 11 },
      ],
    },
    cible_texte: null,
  },
  {
    id: 101,
    le: '2026-09-22T21:30:00+02:00',
    action: 'point_cree',
    cible: 'point_attention',
    cible_id: 'b0000000-0000-4000-8000-000000000001',
    detail: { priorite: 'haute', mentions: [COORDINATION] },
    cible_texte: 'Local de stockage des dons',
  },
]

export { COMMUNS as COMMUNS_EXEMPLE }

/** Ligne de `v_tableau_ministeres` d'exemple. */
type LigneTableau = LigneVue<'v_tableau_ministeres'>

function ligneTableau(ligne: Partial<LigneTableau> & Pick<LigneTableau, 'ministere_id' | 'nom'>) {
  return {
    description: null,
    derniere_saisie: null,
    prochain_evenement_date: null,
    prochain_evenement_titre: null,
    prochaine_reunion_date: null,
    prochaine_reunion_heure: null,
    point_ouvert_priorite: null,
    ...ligne,
  }
}

/** Le tableau des ministères vu par le berger, le conseil et EJP Tech. */
export const TABLEAU_EXEMPLE: LigneTableau[] = [
  ligneTableau({
    ministere_id: COMMUNICATION,
    nom: 'Communication',
    description: 'Visuels, réseaux sociaux et captations des cultes.',
    derniere_saisie: '2026-10-04T12:41:00+02:00',
    prochain_evenement_date: '2026-10-10',
    prochain_evenement_titre: 'Soirée de louange',
    prochaine_reunion_date: '2026-10-12',
    prochaine_reunion_heure: '20:00:00',
    point_ouvert_priorite: 'haute',
  }),
  ligneTableau({
    ministere_id: INTEGRATION,
    nom: 'Intégration',
    description: 'Accueil des nouveaux arrivants et suivi des nouveaux convertis.',
    derniere_saisie: '2026-09-27T13:30:00+02:00',
  }),
  ligneTableau({
    ministere_id: SOCIAL,
    nom: 'Social',
    description: 'Aide alimentaire et accompagnement des familles.',
    derniere_saisie: '2026-08-20T20:00:00+02:00',
    point_ouvert_priorite: 'urgente',
  }),
  ligneTableau({ ministere_id: COORDINATION, nom: 'Coordination' }),
]
