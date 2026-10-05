// Lectures brutes du jeu d'exemple de l'étape 1 (supabase/seed.sql, BRIEF section 13), vues le
// mercredi 30 septembre 2026 : ce que rendent les vues de la base, avant construireCetteSemaine.
// Les valeurs sont celles du BRIEF : 52 STARs au service (6 sur 8, +3 sur 6), 83 actifs (8 sur 8),
// 64 sur 83 soit 77 %, carte 29 sur 8 départements, Bâtir l'Église 58 (6 sur 8, +1 sur 6,
// manquent Coordination et Intégration), Anti-Dispersion 61 (8 sur 8, +2 sur 8). Sert aux tests
// de construire.ts et du hook.

import type { LigneVue } from '@/lib/base'
import type { LecturesCetteSemaine } from './construire'

type LigneTableau = LigneVue<'v_tableau_ministeres'>
type LignePoint = LigneVue<'v_point'>
type LigneSession = LigneVue<'v_session_completude'>

export const MINISTERES_EXEMPLE = [
  { id: 'soc', code: null, nom: 'Social', desactive_le: null },
  { id: 'com', code: null, nom: 'Communication', desactive_le: null },
  { id: 'for', code: null, nom: 'EJP Formation', desactive_le: null },
  { id: 'fij', code: 'fij', nom: 'FIJ', desactive_le: null },
  { id: 'jeu', code: null, nom: 'Jeunesse', desactive_le: null },
  { id: 'pju', code: null, nom: 'Prodiges Junior', desactive_le: null },
  { id: 'coo', code: null, nom: 'Coordination', desactive_le: null },
  { id: 'int', code: null, nom: 'Intégration', desactive_le: null },
]

const ID_SERVICE = 'ind-service'

const DIMANCHES = [
  '2026-07-26',
  '2026-08-02',
  '2026-08-09',
  '2026-08-16',
  '2026-08-23',
  '2026-08-30',
  '2026-09-06',
  '2026-09-13',
  '2026-09-20',
  '2026-09-27',
]
const TOTAUX_SERVICE = [52, 57, 53, 56, 54, 56, 50, 54, 55, 52]

function ligneTableau(
  id: string,
  nom: string,
  derniereSaisie: string,
  evenement: [string, string],
  reunion: string,
  point: LigneTableau['point_ouvert_priorite'],
): LigneTableau {
  return {
    ministere_id: id,
    nom,
    description: null,
    derniere_saisie: derniereSaisie,
    prochain_evenement_date: evenement[0],
    prochain_evenement_titre: evenement[1],
    prochaine_reunion_date: reunion,
    prochaine_reunion_heure: null,
    point_ouvert_priorite: point,
  }
}

function session(
  id: string,
  type: LigneSession['type'],
  date: string,
  saisis: number,
  total: number,
  manquants: string[] = [],
): LigneSession {
  return {
    session_id: id,
    type,
    date,
    intitule: null,
    a_eu_lieu: true,
    nb_attendus: 8,
    nb_saisis: saisis,
    total_saisi: total,
    total,
    manquants,
  }
}

// Description et action attendue de chaque point du jeu d'exemple.
const TEXTES_POINTS: Record<string, [string, string]> = {
  'financement-welcome': [
    "Budget nécessaire pour l'accueil du 15 octobre (collation, supports imprimés).",
    'Décision du conseil sur le budget',
  ],
  'planning-trimestre': [
    "Les dates d'octobre à décembre doivent être arrêtées avant la réunion.",
    'Valider les dates du trimestre',
  ],
  'salle-louange': ["La salle du 10 octobre n'est pas encore confirmée.", 'Confirmer la salle'],
  'visuels-welcome': ["Affiche et flyer de l'accueil du 15 octobre.", 'Livrer les visuels'],
  'renfort-sortie': [
    'Il manque 4 accompagnateurs pour la sortie du 17 octobre.',
    'Trouver des volontaires',
  ],
  'reimpression-supports': ['Les livrets du trimestre sont épuisés.', 'Passer la commande'],
}

function point(
  id: string,
  ministereId: string,
  titre: string,
  priorite: LignePoint['priorite'],
  echeance: string,
  creeLe: string,
  statut: LignePoint['statut'] = 'a_traiter',
): LignePoint {
  return {
    id,
    ministere_id: ministereId,
    titre,
    description: TEXTES_POINTS[id]?.[0] ?? null,
    action_attendue: TEXTES_POINTS[id]?.[1] ?? null,
    priorite,
    echeance,
    cree_le: creeLe,
    cree_par: 'compte-1',
    statut,
    statut_le: creeLe,
    traitement_id: null,
    traite_le: null,
    traite_par: null,
    traite_commentaire: null,
  }
}

/** Lectures du jeu d'exemple : un objet neuf à chaque appel, que chaque test peut modifier. */
export function lecturesExemple(): LecturesCetteSemaine {
  return {
    semaine: { aujourdhui: '2026-09-30', dimanche: '2026-09-27', lundi: '2026-09-21', numero: 39 },
    indicateurs: [
      { id: ID_SERVICE, code: 'service', nature: 'dimanche' },
      { id: 'ind-actifs', code: 'actifs', nature: 'a_ce_jour' },
      { id: 'ind-en-fij', code: 'en_fij', nature: 'a_ce_jour' },
    ],
    totauxDimanche: DIMANCHES.map((dimanche, i) => ({
      indicateur_id: ID_SERVICE,
      dimanche,
      total: TOTAUX_SERVICE[i] ?? null,
      // Les quatre derniers dimanches sont incomplets (6 ministères sur 8).
      nb_saisis: i < 6 ? 8 : 6,
      nb_attendus: 8,
    })),
    ecartsDimanche: [
      { indicateur_id: ID_SERVICE, dimanche: '2026-09-27', ecart: 3, nb_comparables: 6 },
      { indicateur_id: ID_SERVICE, dimanche: '2026-09-20', ecart: -1, nb_comparables: 6 },
    ],
    totauxACeJour: [
      {
        indicateur_id: 'ind-actifs',
        code: 'actifs',
        total: 83,
        nb_saisis: 8,
        nb_actifs: 8,
        plus_ancienne: '2026-08-20',
        nb_plus_de_30_jours: 1,
      },
      {
        indicateur_id: 'ind-en-fij',
        code: 'en_fij',
        total: 64,
        nb_saisis: 8,
        nb_actifs: 8,
        plus_ancienne: '2026-09-13',
        nb_plus_de_30_jours: 0,
      },
    ],
    pourcentageFij: { en_fij: 64, actifs: 83, nb_ministeres: 8, pourcentage: 77 },
    carteFij: [
      { departement: '75', valeur: 4, saisi_le: '2026-09-21T09:30:00+00:00' },
      { departement: '77', valeur: 3, saisi_le: '2026-09-21T09:30:00+00:00' },
      { departement: '78', valeur: 2, saisi_le: '2026-09-21T09:30:00+00:00' },
      { departement: '91', valeur: 3, saisi_le: '2026-09-21T09:30:00+00:00' },
      { departement: '92', valeur: 5, saisi_le: '2026-09-21T09:30:00+00:00' },
      { departement: '93', valeur: 6, saisi_le: '2026-09-21T09:30:00+00:00' },
      { departement: '94', valeur: 4, saisi_le: '2026-09-21T09:30:00+00:00' },
      { departement: '95', valeur: 2, saisi_le: '2026-09-21T09:30:00+00:00' },
    ],
    // De la plus récente à la plus ancienne.
    sessions: [
      session('s-b4', 'batir', '2026-09-26', 6, 58, ['Coordination', 'Intégration']),
      session('s-a4', 'anti_dispersion', '2026-09-19', 8, 61),
      session('s-b3', 'batir', '2026-08-29', 8, 72),
      session('s-a3', 'anti_dispersion', '2026-08-22', 8, 59),
      session('s-b2', 'batir', '2026-08-01', 8, 66),
      session('s-a2', 'anti_dispersion', '2026-07-25', 8, 53),
      session('s-b1', 'batir', '2026-07-04', 8, 63),
      session('s-a1', 'anti_dispersion', '2026-06-27', 8, 50),
    ],
    ecartsSessions: [
      { session_id: 's-b4', ecart: 1, nb_comparables: 6 },
      { session_id: 's-a4', ecart: 2, nb_comparables: 8 },
    ],
    participations: [
      ['com', 13],
      ['jeu', 13],
      ['fij', 10],
      ['pju', 8],
      ['for', 7],
      ['soc', 7],
    ].map(([ministere, valeur]) => ({
      session_id: 's-b4',
      ministere_id: String(ministere),
      valeur: Number(valeur),
      deja_comptes: 0,
      compte_dans_total: Number(valeur),
      saisi_le: '2026-09-27T08:00:00+00:00',
    })),
    tableauMinisteres: [
      ligneTableau(
        'soc',
        'Social',
        '2026-09-06T10:00:00+00:00',
        ['2026-11-14', "Collecte d'hiver"],
        '',
        null,
      ),
      ligneTableau(
        'com',
        'Communication',
        '2026-09-27T10:00:00+00:00',
        ['2026-10-10', 'Soirée de louange'],
        '2026-10-05',
        'haute',
      ),
      ligneTableau(
        'for',
        'EJP Formation',
        '2026-09-27T10:00:00+00:00',
        ['2026-10-04', 'Nouvelle promotion'],
        '2026-10-01',
        null,
      ),
      ligneTableau(
        'fij',
        'FIJ',
        '2026-09-27T10:00:00+00:00',
        ['2026-10-08', 'Rencontre des pilotes'],
        '2026-10-08',
        null,
      ),
      ligneTableau(
        'jeu',
        'Jeunesse',
        '2026-09-27T10:00:00+00:00',
        ['2026-10-17', 'Sortie jeunesse'],
        '2026-10-09',
        'normale',
      ),
      ligneTableau(
        'pju',
        'Prodiges Junior',
        '2026-09-27T10:00:00+00:00',
        ['2026-11-22', 'Fête des Prodiges Junior'],
        '2026-10-12',
        'normale',
      ),
      ligneTableau(
        'coo',
        'Coordination',
        '2026-09-28T10:00:00+00:00',
        ['2026-10-03', 'Planning du trimestre'],
        '2026-10-06',
        'haute',
      ),
      ligneTableau(
        'int',
        'Intégration',
        '2026-09-29T10:00:00+00:00',
        ['2026-10-15', 'Welcome Prodiges'],
        '2026-10-02',
        'urgente',
      ),
    ].map((ligne) => ({
      ...ligne,
      // Social n'a aucune réunion prévue.
      prochaine_reunion_date:
        ligne.prochaine_reunion_date === '' ? null : ligne.prochaine_reunion_date,
    })),
    ministeres: MINISTERES_EXEMPLE.map((ministere) => ({ ...ministere })),
    points: {
      points: [
        point(
          'financement-welcome',
          'int',
          'Financement de Welcome Prodiges',
          'urgente',
          '2026-10-05',
          '2026-09-22T09:00:00+00:00',
          'attente_decision',
        ),
        point(
          'planning-trimestre',
          'coo',
          'Planning du trimestre à valider',
          'haute',
          '2026-09-28',
          '2026-09-21T09:00:00+00:00',
        ),
        point(
          'salle-louange',
          'com',
          'Salle pour la soirée de louange',
          'haute',
          '2026-10-03',
          '2026-09-23T09:00:00+00:00',
        ),
        point(
          'visuels-welcome',
          'int',
          'Visuels pour Welcome Prodiges',
          'normale',
          '2026-10-08',
          '2026-09-22T10:00:00+00:00',
        ),
        point(
          'renfort-sortie',
          'jeu',
          'Renfort de 4 STARs pour la sortie',
          'normale',
          '2026-10-10',
          '2026-09-24T09:00:00+00:00',
        ),
        point(
          'reimpression-supports',
          'pju',
          'Réimpression des supports',
          'normale',
          '2026-10-11',
          '2026-09-25T09:00:00+00:00',
        ),
      ],
      mentions: [
        { point_id: 'salle-louange', ministere_id: 'coo' },
        { point_id: 'visuels-welcome', ministere_id: 'com' },
        { point_id: 'renfort-sortie', ministere_id: 'soc' },
      ],
    },
  }
}

/** Les lectures de la base avant la première saisie : le dimanche de référence est vide. */
export function lecturesPremierDimanche(): LecturesCetteSemaine {
  const exemple = lecturesExemple()
  return {
    ...exemple,
    totauxDimanche: exemple.totauxDimanche.map((ligne) => ({
      ...ligne,
      total: null,
      nb_saisis: 0,
    })),
    ecartsDimanche: [],
    totauxACeJour: [],
    pourcentageFij: null,
    carteFij: [],
    sessions: [],
    ecartsSessions: [],
    participations: [],
    tableauMinisteres: exemple.tableauMinisteres.map((ligne) => ({
      ...ligne,
      derniere_saisie: null,
      prochain_evenement_date: null,
      prochain_evenement_titre: null,
      prochaine_reunion_date: null,
      point_ouvert_priorite: null,
    })),
    points: { points: [], mentions: [] },
  }
}
