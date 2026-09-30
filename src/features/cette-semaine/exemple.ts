// Données d'exemple de la vue « Cette semaine », tirées du jeu d'exemple de l'étape 1
// (supabase/seed.sql, BRIEF section 13) vu le mercredi 30 septembre 2026 : dimanche de
// référence le 27 sept., semaine 39. Prêtes à afficher, comme les rendra la couche de données.
// Sert à l'aperçu de développement (/apercu/cette-semaine) et aux tests.

import type {
  DerniereSession,
  DonneesCarteFij,
  DonneesCetteSemaine,
  LigneChiffre,
  LigneMinistere,
  PointADecider,
  ProfilVue,
} from './types'

export type SessionExemple = 'batir' | 'anti_dispersion'

const chiffres: LigneChiffre[] = [
  {
    id: 'service',
    libelle: 'STARs au service',
    valeur: '52',
    ecart: {
      texte: '+3',
      sens: 'hausse',
      description:
        '+3 par rapport à dimanche dernier, pour les 6 ministères qui ont saisi les deux fois',
    },
    courbe: {
      points: [
        { valeur: 52 },
        { valeur: 57 },
        { valeur: 53 },
        { valeur: 56 },
        { valeur: 54 },
        { valeur: 56 },
        { valeur: 50, incomplet: true },
        { valeur: 54, incomplet: true },
        { valeur: 55, incomplet: true },
        { valeur: 52, incomplet: true },
      ],
      description:
        'Dix derniers dimanches : 52, 57, 53, 56, 54, 56, 50, 54, 55, 52. Les quatre derniers sont incomplets.',
    },
    date: 'Dimanche 27 sept.',
    dateCourte: 'Dim. 27 sept.',
    completude: '6 sur 8',
    complet: false,
  },
  {
    id: 'actifs',
    libelle: 'STARs actifs',
    valeur: '83',
    date: 'À ce jour, 1 valeur de plus de 30 jours',
    dateSignalee: true,
    completude: '8 sur 8',
    complet: true,
  },
  {
    id: 'en_fij',
    libelle: 'STARs présents en FIJ',
    valeur: '77',
    unite: '%',
    date: '64 sur 83 STARs actifs',
    completude: '8 sur 8',
    complet: true,
  },
  {
    id: 'carte_fij',
    libelle: 'FIJ en Île-de-France',
    valeur: '29',
    date: 'Saisi par FIJ le 21 sept.',
    completude: '8 dép.',
    complet: true,
  },
  {
    id: 'batir',
    libelle: "Présents à Bâtir l'Église",
    valeur: '58',
    ecart: {
      texte: '+1',
      sens: 'hausse',
      description:
        '+1 par rapport à la session du 29 août, pour les 6 ministères qui ont saisi les deux fois',
    },
    courbe: {
      points: [{ valeur: 63 }, { valeur: 66 }, { valeur: 72 }, { valeur: 58, incomplet: true }],
      description: 'Quatre dernières sessions : 63, 66, 72, 58. La dernière est incomplète.',
    },
    date: 'Samedi 26 sept.',
    dateCourte: 'Sam. 26 sept.',
    completude: '6 sur 8',
    complet: false,
  },
  {
    id: 'anti_dispersion',
    libelle: 'Présents à Anti-Dispersion',
    valeur: '61',
    ecart: {
      texte: '+2',
      sens: 'hausse',
      description:
        '+2 par rapport à la session du 22 août, pour les 8 ministères qui ont saisi les deux fois',
    },
    courbe: {
      points: [{ valeur: 50 }, { valeur: 53 }, { valeur: 59 }, { valeur: 61 }],
      description: 'Quatre dernières sessions : 50, 53, 59, 61.',
    },
    date: 'Samedi 19 sept.',
    dateCourte: 'Sam. 19 sept.',
    completude: '8 sur 8',
    complet: true,
  },
]

// Points ouverts dans l'ordre de « À décider » : en attente de décision, puis priorité, puis
// échéance, puis création. Les trois premiers s'affichent.
const pointsOuverts: PointADecider[] = [
  {
    id: 'financement-welcome',
    priorite: 'urgente',
    ministere: 'Intégration',
    echeance: { texte: 'avant le 5 oct.', depassee: false },
    titre: 'Financement de Welcome Prodiges',
    description: "Budget nécessaire pour l'accueil du 15 octobre (collation, supports imprimés).",
    attendu: 'Décision du conseil sur le budget',
    mentions: [],
  },
  {
    id: 'planning-trimestre',
    priorite: 'haute',
    ministere: 'Coordination',
    echeance: { texte: 'avant le 28 sept.', depassee: true },
    titre: 'Planning du trimestre à valider',
    description: "Les dates d'octobre à décembre doivent être arrêtées avant la réunion.",
    attendu: 'Valider les dates du trimestre',
    mentions: [],
  },
  {
    id: 'salle-louange',
    priorite: 'haute',
    ministere: 'Communication',
    echeance: { texte: 'avant le 3 oct.', depassee: false },
    titre: 'Salle pour la soirée de louange',
    description: "La salle du 10 octobre n'est pas encore confirmée.",
    attendu: 'Confirmer la salle',
    mentions: ['coordination'],
  },
  {
    id: 'visuels-welcome',
    priorite: 'normale',
    ministere: 'Intégration',
    echeance: { texte: 'avant le 8 oct.', depassee: false },
    titre: 'Visuels pour Welcome Prodiges',
    description: "Affiche et flyer de l'accueil du 15 octobre.",
    attendu: 'Livrer les visuels',
    mentions: ['communication'],
  },
  {
    id: 'renfort-sortie',
    priorite: 'normale',
    ministere: 'Jeunesse',
    echeance: { texte: 'avant le 10 oct.', depassee: false },
    titre: 'Renfort de 4 STARs pour la sortie',
    description: 'Il manque 4 accompagnateurs pour la sortie du 17 octobre.',
    attendu: 'Trouver des volontaires',
    mentions: ['social'],
  },
  {
    id: 'reimpression-supports',
    priorite: 'normale',
    ministere: 'Prodiges Junior',
    echeance: { texte: 'avant le 11 oct.', depassee: false },
    titre: 'Réimpression des supports',
    description: 'Les livrets du trimestre sont épuisés.',
    attendu: 'Passer la commande',
    mentions: [],
  },
]

function sessions(profil: ProfilVue): Record<SessionExemple, DerniereSession> {
  return {
    batir: {
      titre: "Bâtir l'Église, samedi 26 septembre",
      total: 58,
      saisis: 6,
      attendus: 8,
      apports: [
        { ministere: 'Communication', valeur: 13 },
        { ministere: 'Intégration', valeur: null },
        { ministere: 'Coordination', valeur: null },
        { ministere: 'Jeunesse', valeur: 13 },
        { ministere: 'Social', valeur: 7 },
        { ministere: 'FIJ', valeur: 10 },
        { ministere: 'Prodiges Junior', valeur: 8 },
        { ministere: 'EJP Formation', valeur: 7 },
      ],
      autres: [
        { libelle: 'Voir Anti-Dispersion', href: `?profil=${profil}&session=anti-dispersion` },
      ],
    },
    anti_dispersion: {
      titre: 'Anti-Dispersion, samedi 19 septembre',
      total: 61,
      saisis: 8,
      attendus: 8,
      apports: [
        { ministere: 'Communication', valeur: 9 },
        { ministere: 'Intégration', valeur: 7 },
        { ministere: 'Coordination', valeur: 6 },
        { ministere: 'Jeunesse', valeur: 10 },
        { ministere: 'Social', valeur: 7 },
        { ministere: 'FIJ', valeur: 9 },
        { ministere: 'Prodiges Junior', valeur: 7 },
        { ministere: 'EJP Formation', valeur: 6 },
      ],
      autres: [{ libelle: "Voir Bâtir l'Église", href: `?profil=${profil}` }],
    },
  }
}

const carte: DonneesCarteFij = {
  total: 29,
  departements: [
    { code: '75', nom: 'Paris', valeur: 4 },
    { code: '77', nom: 'Seine-et-Marne', valeur: 3 },
    { code: '78', nom: 'Yvelines', valeur: 2 },
    { code: '91', nom: 'Essonne', valeur: 3 },
    { code: '92', nom: 'Hauts-de-Seine', valeur: 5 },
    { code: '93', nom: 'Seine-Saint-Denis', valeur: 6 },
    { code: '94', nom: 'Val-de-Marne', valeur: 4 },
    { code: '95', nom: "Val-d'Oise", valeur: 2 },
  ],
}

// Du moins récent au plus récent (fraîcheur en jours de calendrier), puis par nom.
const ministeres: LigneMinistere[] = [
  {
    id: 'soc',
    nom: 'Social',
    fraicheur: { libelle: 'Il y a 24 jours', etat: 'a_surveiller' },
    prochainEvenement: "14 nov., Collecte d'hiver",
    prochaineReunion: 'Non renseignée',
    pointOuvert: null,
  },
  {
    id: 'com',
    nom: 'Communication',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: '10 oct., Soirée de louange',
    prochaineReunion: '5 oct.',
    pointOuvert: 'haute',
  },
  {
    id: 'for',
    nom: 'EJP Formation',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: '4 oct., Nouvelle promotion',
    prochaineReunion: '1 oct.',
    pointOuvert: null,
  },
  {
    id: 'fij',
    nom: 'FIJ',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: '8 oct., Rencontre des pilotes',
    prochaineReunion: '8 oct.',
    pointOuvert: null,
  },
  {
    id: 'jeu',
    nom: 'Jeunesse',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: '17 oct., Sortie jeunesse',
    prochaineReunion: '9 oct.',
    pointOuvert: 'normale',
  },
  {
    id: 'pju',
    nom: 'Prodiges Junior',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: '22 nov., Fête des Prodiges Junior',
    prochaineReunion: '12 oct.',
    pointOuvert: 'normale',
  },
  {
    id: 'coo',
    nom: 'Coordination',
    fraicheur: { libelle: 'Il y a 2 jours', etat: 'a_jour' },
    prochainEvenement: '3 oct., Planning du trimestre',
    prochaineReunion: '6 oct.',
    pointOuvert: 'haute',
  },
  {
    id: 'int',
    nom: 'Intégration',
    fraicheur: { libelle: 'Hier', etat: 'a_jour' },
    prochainEvenement: '15 oct., Welcome Prodiges',
    prochaineReunion: '2 oct.',
    pointOuvert: 'urgente',
  },
]

/** Le ministère de l'aperçu « Ministère » : son nom seul ouvre « Ma fiche ». */
export const MINISTERE_EXEMPLE = 'com'

function ministeresPour(profil: ProfilVue): LigneMinistere[] {
  if (profil === 'berger' || profil === 'conseil') {
    return ministeres.map((ministere) => ({ ...ministere, href: `/ministeres/${ministere.id}` }))
  }
  // Ministère et administration : v_tableau_ministeres ne donne ni réunion ni point ouvert.
  return ministeres.map((ministere) => ({
    id: ministere.id,
    nom: ministere.nom,
    fraicheur: ministere.fraicheur,
    prochainEvenement: ministere.prochainEvenement,
    ...(profil === 'ministere' && ministere.id === MINISTERE_EXEMPLE ? { href: '/ma-fiche' } : {}),
  }))
}

/** Données d'exemple pour un profil, avec la dernière session ou Anti-Dispersion. */
export function exempleCetteSemaine(
  profil: ProfilVue,
  session: SessionExemple = 'batir',
): DonneesCetteSemaine {
  const avecDecision = profil === 'berger' || profil === 'conseil'
  return {
    semaine: { numero: 39, periode: 'du 21 au 27 sept.' },
    phrase: avecDecision
      ? [
          { texte: "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et " },
          { texte: 'un point attend votre décision', aDecider: true },
          { texte: '.' },
        ]
      : [{ texte: "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi." }],
    ligneSecondaire:
      "Bâtir l'Église progresse de 1 présent, et le total est incomplet : Coordination et Intégration n'ont pas saisi.",
    chiffres,
    noteChiffres:
      "Chaque chiffre additionne les saisies des ministères. Un STAR saisi par deux ministères n'est compté qu'une fois. Courbes : dix derniers dimanches ou quatre dernières sessions.",
    aDecider: avecDecision ? pointsOuverts : [],
    lienTousLesPoints: '/points?vue=ouverts',
    session: sessions(profil)[session],
    carte,
    ministeres: ministeresPour(profil),
  }
}
