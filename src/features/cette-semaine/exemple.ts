// Données d'exemple de la vue « Cette semaine », tirées du jeu d'exemple de l'étape 1
// (supabase/seed.sql, BRIEF section 13) vu le mercredi 30 septembre 2026 : dimanche de
// référence le 27 sept., semaine 39. Prêtes à afficher, comme les rendra la couche de données.
// Sert à l'aperçu de développement (/apercu/cette-semaine) et aux tests. `exemplePremierDimanche`
// montre les états vides du même jour, avant toute saisie (LISEZMOI, « Premier dimanche »).

import { comparerNoms } from '@/lib/metier/texte'
import { TEXTES_VIDES } from './textesVides'
import type {
  ApportSession,
  ColonnesConseil,
  DerniereSession,
  DonneesAdministration,
  DonneesBergerConseil,
  DonneesCarteFij,
  DonneesCetteSemaine,
  DonneesMinistere,
  LigneChiffre,
  LigneMinistere,
  PointADecider,
  ProfilVue,
} from './types'

export type SessionExemple = 'batir' | 'anti_dispersion'

const semaine = { numero: 39, periode: 'du 21 au 27 sept.' }

const noteChiffres =
  "Chaque chiffre additionne les saisies des ministères. Un STAR saisi par deux ministères n'est compté qu'une fois. Courbes : dix derniers dimanches ou quatre dernières sessions."

function texte(valeur: string) {
  return { texte: valeur, masque: false }
}

function saisie(valeur: string, unite: '%' | null = null) {
  return { etat: 'saisie', texte: valeur, unite } as const
}

const chiffres: LigneChiffre[] = [
  {
    id: 'service',
    libelle: 'STARs au service',
    valeur: saisie('52'),
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
    dateSignalee: false,
    completude: { texte: '6 sur 8', complet: false },
  },
  {
    id: 'actifs',
    libelle: 'STARs actifs',
    valeur: saisie('83'),
    ecart: null,
    courbe: null,
    date: 'À ce jour, 1 valeur de plus de 30 jours',
    dateCourte: null,
    dateSignalee: true,
    completude: { texte: '8 sur 8', complet: true },
  },
  {
    id: 'en_fij',
    libelle: 'STARs présents en FIJ',
    valeur: saisie('77', '%'),
    ecart: null,
    courbe: null,
    date: '64 sur 83 STARs actifs',
    dateCourte: null,
    dateSignalee: false,
    completude: { texte: '8 sur 8', complet: true },
  },
  {
    id: 'carte_fij',
    libelle: 'FIJ en Île-de-France',
    valeur: saisie('29'),
    ecart: null,
    courbe: null,
    date: 'Saisi par FIJ le 21 sept.',
    dateCourte: null,
    dateSignalee: false,
    completude: { texte: '8 dép.', complet: true },
  },
  {
    id: 'batir',
    libelle: "Présents à Bâtir l'Église",
    valeur: saisie('58'),
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
    dateSignalee: false,
    completude: { texte: '6 sur 8', complet: false },
  },
  {
    id: 'anti_dispersion',
    libelle: 'Présents à Anti-Dispersion',
    valeur: saisie('61'),
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
    dateSignalee: false,
    completude: { texte: '8 sur 8', complet: true },
  },
]

/**
 * Points ouverts dans l'ordre de « À décider » : en attente de décision, puis priorité, puis
 * échéance, puis création. Les trois premiers s'affichent.
 */
export const pointsOuvertsExemple: PointADecider[] = [
  {
    id: 'financement-welcome',
    priorite: 'urgente',
    ministere: 'Intégration',
    echeance: { texte: 'avant le 5 oct.', depassee: false },
    titre: texte('Financement de Welcome Prodiges'),
    description: texte(
      "Budget nécessaire pour l'accueil du 15 octobre (collation, supports imprimés).",
    ),
    attendu: texte('Décision du conseil sur le budget'),
    mentions: [],
  },
  {
    id: 'planning-trimestre',
    priorite: 'haute',
    ministere: 'Coordination',
    echeance: { texte: 'avant le 28 sept.', depassee: true },
    titre: texte('Planning du trimestre à valider'),
    description: texte("Les dates d'octobre à décembre doivent être arrêtées avant la réunion."),
    attendu: texte('Valider les dates du trimestre'),
    mentions: [],
  },
  {
    id: 'salle-louange',
    priorite: 'haute',
    ministere: 'Communication',
    echeance: { texte: 'avant le 3 oct.', depassee: false },
    titre: texte('Salle pour la soirée de louange'),
    description: texte("La salle du 10 octobre n'est pas encore confirmée."),
    attendu: texte('Confirmer la salle'),
    mentions: ['Coordination'],
  },
  {
    id: 'visuels-welcome',
    priorite: 'normale',
    ministere: 'Intégration',
    echeance: { texte: 'avant le 8 oct.', depassee: false },
    titre: texte('Visuels pour Welcome Prodiges'),
    description: texte("Affiche et flyer de l'accueil du 15 octobre."),
    attendu: texte('Livrer les visuels'),
    mentions: ['Communication'],
  },
  {
    id: 'renfort-sortie',
    priorite: 'normale',
    ministere: 'Jeunesse',
    echeance: { texte: 'avant le 10 oct.', depassee: false },
    titre: texte('Renfort de 4 STARs pour la sortie'),
    description: texte('Il manque 4 accompagnateurs pour la sortie du 17 octobre.'),
    attendu: texte('Trouver des volontaires'),
    mentions: ['Social'],
  },
  {
    id: 'reimpression-supports',
    priorite: 'normale',
    ministere: 'Prodiges Junior',
    echeance: { texte: 'avant le 11 oct.', depassee: false },
    titre: texte('Réimpression des supports'),
    description: texte('Les livrets du trimestre sont épuisés.'),
    attendu: texte('Passer la commande'),
    mentions: [],
  },
]

function apport(ministere: string, valeur: number | null): ApportSession {
  return { ministere, valeur, saisis: null }
}

// Apports par valeur décroissante, puis par nom ; ceux qui n'ont pas saisi en dernier (T21).
function sessions(profil: ProfilVue): Record<SessionExemple, DerniereSession> {
  return {
    batir: {
      titre: "Bâtir l'Église, samedi 26 septembre",
      total: 58,
      saisis: 6,
      attendus: 8,
      apports: [
        apport('Communication', 13),
        apport('Jeunesse', 13),
        apport('FIJ', 10),
        apport('Prodiges Junior', 8),
        apport('EJP Formation', 7),
        apport('Social', 7),
        apport('Coordination', null),
        apport('Intégration', null),
      ],
      noteDoubleCompte: null,
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
        apport('Jeunesse', 10),
        apport('Communication', 9),
        apport('FIJ', 9),
        apport('Intégration', 7),
        apport('Prodiges Junior', 7),
        apport('Social', 7),
        apport('Coordination', 6),
        apport('EJP Formation', 6),
      ],
      noteDoubleCompte: null,
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

type LigneConseil = LigneMinistere & { href: string; conseil: ColonnesConseil }

function evenement(date: string, nom: string) {
  return { etat: 'prevu', date, nom: texte(nom) } as const
}

// Du moins récent au plus récent (fraîcheur en jours de calendrier), puis par nom.
const ministeres: LigneConseil[] = [
  {
    id: 'soc',
    nom: 'Social',
    href: '/ministeres/soc',
    fraicheur: { libelle: 'Il y a 24 jours', etat: 'a_surveiller' },
    prochainEvenement: evenement('14 nov.', "Collecte d'hiver"),
    conseil: { prochaineReunion: null, pointOuvert: null },
  },
  {
    id: 'com',
    nom: 'Communication',
    href: '/ministeres/com',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: evenement('10 oct.', 'Soirée de louange'),
    conseil: { prochaineReunion: '5 oct.', pointOuvert: 'haute' },
  },
  {
    id: 'for',
    nom: 'EJP Formation',
    href: '/ministeres/for',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: evenement('4 oct.', 'Nouvelle promotion'),
    conseil: { prochaineReunion: '1 oct.', pointOuvert: null },
  },
  {
    id: 'fij',
    nom: 'FIJ',
    href: '/ministeres/fij',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: evenement('8 oct.', 'Rencontre des pilotes'),
    conseil: { prochaineReunion: '8 oct.', pointOuvert: null },
  },
  {
    id: 'jeu',
    nom: 'Jeunesse',
    href: '/ministeres/jeu',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: evenement('17 oct.', 'Sortie jeunesse'),
    conseil: { prochaineReunion: '9 oct.', pointOuvert: 'normale' },
  },
  {
    id: 'pju',
    nom: 'Prodiges Junior',
    href: '/ministeres/pju',
    fraicheur: { libelle: 'Il y a 3 jours', etat: 'a_jour' },
    prochainEvenement: evenement('22 nov.', 'Fête des Prodiges Junior'),
    conseil: { prochaineReunion: '12 oct.', pointOuvert: 'normale' },
  },
  {
    id: 'coo',
    nom: 'Coordination',
    href: '/ministeres/coo',
    fraicheur: { libelle: 'Il y a 2 jours', etat: 'a_jour' },
    prochainEvenement: evenement('3 oct.', 'Planning du trimestre'),
    conseil: { prochaineReunion: '6 oct.', pointOuvert: 'haute' },
  },
  {
    id: 'int',
    nom: 'Intégration',
    href: '/ministeres/int',
    fraicheur: { libelle: 'Hier', etat: 'a_jour' },
    prochainEvenement: evenement('15 oct.', 'Welcome Prodiges'),
    conseil: { prochaineReunion: '2 oct.', pointOuvert: 'urgente' },
  },
]

/** Le ministère de l'aperçu « Ministère » : son nom seul ouvre « Ma fiche ». */
export const MINISTERE_EXEMPLE = 'com'

/** Données communes aux profils, une fois les lignes des ministères et la session choisies. */
interface Contenu {
  phraseEglise: DonneesCetteSemaine['phrase']
  phraseSemaine: DonneesCetteSemaine['phrase']
  ligneSecondaire: string | null
  chiffres: LigneChiffre[]
  resume: DonneesMinistere['resume']
  aDecider: PointADecider[]
  session: DonneesCetteSemaine['session']
  carte: DonneesCarteFij | null
  ministeres: LigneConseil[]
}

function pourProfil(profil: ProfilVue, contenu: Contenu): DonneesCetteSemaine {
  const commun = {
    semaine,
    ligneSecondaire: contenu.ligneSecondaire,
    chiffres: contenu.chiffres,
    noteChiffres,
    session: contenu.session,
    carte: contenu.carte,
  }
  // Ministère et administration : v_tableau_ministeres ne donne ni réunion ni point ouvert.
  const sansColonnesConseil = contenu.ministeres.map((ministere) => ({
    ...ministere,
    conseil: null,
  }))

  if (profil === 'berger' || profil === 'conseil') {
    return {
      ...commun,
      profil,
      phrase: contenu.phraseSemaine,
      aDecider: {
        points: contenu.aDecider.slice(0, 3),
        urgent: contenu.aDecider.some((point) => point.priorite === 'urgente'),
        lienTousLesPoints: '/points?vue=ouverts',
      },
      ministeres: contenu.ministeres,
    }
  }
  if (profil === 'admin_eglise') {
    return {
      ...commun,
      profil,
      phrase: contenu.phraseEglise,
      ministeres: sansColonnesConseil.map((ministere) => ({ ...ministere, href: null })),
    }
  }
  return {
    ...commun,
    profil,
    phrase: contenu.phraseEglise,
    resume: contenu.resume,
    ministeres: sansColonnesConseil.map((ministere) => ({
      ...ministere,
      href: ministere.id === MINISTERE_EXEMPLE ? '/ma-fiche' : null,
    })),
  }
}

function ligne(id: LigneChiffre['id']): LigneChiffre {
  const trouvee = chiffres.find((chiffre) => chiffre.id === id)
  if (!trouvee) throw new Error(`Ligne d'exemple absente : ${id}`)
  return trouvee
}

/** Données d'exemple pour un profil, avec la dernière session ou Anti-Dispersion. */
export function exempleCetteSemaine(
  profil: 'berger' | 'conseil',
  session?: SessionExemple,
): DonneesBergerConseil
export function exempleCetteSemaine(
  profil: 'admin_eglise',
  session?: SessionExemple,
): DonneesAdministration
export function exempleCetteSemaine(profil: 'ministere', session?: SessionExemple): DonneesMinistere
export function exempleCetteSemaine(
  profil: ProfilVue,
  session?: SessionExemple,
): DonneesCetteSemaine
export function exempleCetteSemaine(
  profil: ProfilVue,
  session: SessionExemple = 'batir',
): DonneesCetteSemaine {
  const phraseEglise = [
    { texte: "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi." },
  ]
  return pourProfil(profil, {
    phraseEglise,
    phraseSemaine: [
      { texte: "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et " },
      { texte: 'un point attend votre décision', aDecider: true },
      { texte: '.' },
    ],
    ligneSecondaire:
      "Bâtir l'Église progresse de 1 présent, et le total est incomplet : Coordination et Intégration n'ont pas saisi.",
    chiffres,
    resume: [ligne('service'), ligne('en_fij'), { ...ligne('batir'), id: 'derniere_session' }],
    aDecider: pointsOuvertsExemple,
    session: { etat: 'session', session: sessions(profil)[session] },
    carte,
    ministeres,
  })
}

// Premier dimanche : aucune saisie, aucune session déclarée, aucun point, aucun événement.

const vide = { etat: 'vide' } as const

function ligneVide(
  id: LigneChiffre['id'],
  libelle: string,
  date: string,
  completude: LigneChiffre['completude'],
  dateCourte: string | null = null,
): LigneChiffre {
  return {
    id,
    libelle,
    valeur: vide,
    ecart: null,
    courbe: null,
    date,
    dateCourte,
    dateSignalee: false,
    completude,
  }
}

const zeroSurHuit = { texte: '0 sur 8', complet: false }

const chiffresPremierDimanche: LigneChiffre[] = [
  ligneVide('service', 'STARs au service', 'Dimanche 27 sept.', zeroSurHuit, 'Dim. 27 sept.'),
  ligneVide('actifs', 'STARs actifs', TEXTES_VIDES.chiffres.dateAceJour, zeroSurHuit),
  ligneVide('en_fij', 'STARs présents en FIJ', TEXTES_VIDES.chiffres.dateAceJour, zeroSurHuit),
  ligneVide('carte_fij', 'FIJ en Île-de-France', TEXTES_VIDES.chiffres.dateAceJour, {
    texte: '0 dép.',
    complet: false,
  }),
  ligneVide('batir', "Présents à Bâtir l'Église", TEXTES_VIDES.chiffres.dateSansSession, null),
  ligneVide(
    'anti_dispersion',
    'Présents à Anti-Dispersion',
    TEXTES_VIDES.chiffres.dateSansSession,
    null,
  ),
]

/** Les états vides de la vue, le mercredi 30 septembre 2026, avant la première saisie. */
export function exemplePremierDimanche(profil: 'berger' | 'conseil'): DonneesBergerConseil
export function exemplePremierDimanche(profil: 'admin_eglise'): DonneesAdministration
export function exemplePremierDimanche(profil: 'ministere'): DonneesMinistere
export function exemplePremierDimanche(profil: ProfilVue): DonneesCetteSemaine
export function exemplePremierDimanche(profil: ProfilVue): DonneesCetteSemaine {
  const phrase = [{ texte: "Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept." }]
  const parId = (id: LigneChiffre['id']) => {
    const trouvee = chiffresPremierDimanche.find((chiffre) => chiffre.id === id)
    if (!trouvee) throw new Error(`Ligne d'exemple absente : ${id}`)
    return trouvee
  }
  return pourProfil(profil, {
    phraseEglise: phrase,
    phraseSemaine: phrase,
    ligneSecondaire: null,
    chiffres: chiffresPremierDimanche,
    resume: [
      parId('service'),
      parId('en_fij'),
      ligneVide(
        'derniere_session',
        TEXTES_VIDES.session.titre,
        TEXTES_VIDES.chiffres.dateSansSession,
        null,
      ),
    ],
    aDecider: [],
    session: { etat: 'aucune_session' },
    carte: null,
    // Sans aucune saisie, les ministères se rangent par nom.
    ministeres: ministeres
      .map((ministere) => ({
        ...ministere,
        fraicheur: { libelle: TEXTES_VIDES.ministeres.aucuneSaisie, etat: 'en_retard' } as const,
        prochainEvenement: { etat: 'aucun' } as const,
        conseil: { prochaineReunion: null, pointOuvert: null },
      }))
      .sort((a, b) => comparerNoms(a.nom, b.nom)),
  })
}
