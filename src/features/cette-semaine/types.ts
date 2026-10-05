// Données de la vue « Cette semaine » (maquettes 01, 02, 03), prêtes à afficher : les textes
// arrivent déjà formatés (dates à l'heure de Paris, complétude, fraîcheur). Les composants ne
// calculent aucune règle métier, ils ne font que les montrer (BRIEF, section 9).
//
// Contrat de l'étape 3 entre la couche de données (construire.ts, useCetteSemaine.ts, src/data)
// et l'écran (PageCetteSemaine et ses composants).
//
// États vides (docs/decisions.md, T22) : chaque bloc dit explicitement qu'il n'a rien à montrer,
// par une union discriminée (`etat`), par `null` ou par une liste vide, documentés champ par
// champ. Le texte affiché vient de TEXTES_VIDES (textesVides.ts), jamais d'un composant.

import type { TypeSession } from '@/lib/metier/phrases'

/**
 * Profils qui voient la vue de l'église. EJP Tech (`admin_plateforme`) la lit comme le berger,
 * en lecture seule (docs/decisions.md, T29) ; son accueil reste /moderation.
 */
export type ProfilVue = 'berger' | 'conseil' | 'ministere' | 'admin_eglise' | 'admin_plateforme'

/** Qui lit la vue. Un compte de ministère vient avec son ministère (son nom ouvre « Ma fiche »). */
export type Lecteur =
  | { profil: 'berger' | 'conseil' | 'admin_eglise' | 'admin_plateforme' }
  | { profil: 'ministere'; ministereId: string }

export type Priorite = 'urgente' | 'haute' | 'normale'

/** Semaine ISO du dimanche de référence : « Semaine 39, du 21 au 27 sept. ». */
export interface Semaine {
  numero: number
  /** « du 21 au 27 sept. » */
  periode: string
}

/** Un morceau de la phrase de la semaine. `aDecider` porte le surligneur (partie C). */
export interface MorceauPhrase {
  texte: string
  aDecider?: boolean
}

/**
 * Champ libre écrit par un ministère (titre, description, action attendue d'un point ; nom d'un
 * événement). `masque` : EJP Tech l'a remplacé par TEXTE_MASQUE ; il s'affiche alors en
 * `--encre-3` (BRIEF, « Modération »).
 */
export interface TexteLibre {
  texte: string
  masque: boolean
}

/** Écart à périmètre égal : « +3 » ou « −3 » (signe moins U+2212, jamais un tiret). */
export interface Ecart {
  texte: string
  sens: 'hausse' | 'baisse' | 'stable'
  /**
   * Étiquette accessible : « +3 par rapport à dimanche dernier, pour les 6 ministères qui ont
   * saisi les deux fois », « +1 par rapport à la session du 29 août, ... » (T23).
   */
  description: string
}

/** Un point de courbe. `valeur` nulle : trou (dimanche ou session sans saisie), jamais zéro. */
export interface PointCourbe {
  valeur: number | null
  /** Dimanche ou session incomplet (saisis moins nombreux que les attendus) : cercle vide. */
  incomplet?: boolean
}

export interface DonneesCourbe {
  /** Du plus ancien au plus récent : dix dimanches, ou quatre sessions du même type. */
  points: PointCourbe[]
  /**
   * Équivalent texte : « Dix derniers dimanches : 49, 51, sans saisie, 52. » (un trou s'écrit
   * TEXTES_VIDES.chiffres.pointDeCourbeSansSaisie).
   */
  description: string
}

/** Valeur d'une ligne de chiffres. */
export type ValeurAffichee =
  /** « 52 », « 77 » avec l'unité « % ». */
  | { etat: 'saisie'; texte: string; unite: '%' | null }
  /** Rien à additionner : TEXTES_VIDES.chiffres.valeur (« Pas encore de saisie »). */
  | { etat: 'vide' }
  /** Pourcentage FIJ, somme des actifs nulle : TEXTES_VIDES.chiffres.nonCalcule. */
  | { etat: 'non_calcule' }

/** Complétude d'un total (« 6 sur 8 », « 8 dép. »), jamais recalculée par l'écran. */
export interface CompletudeAffichee {
  texte: string
  /** Faux : la complétude s'affiche en orange (le texte « 6 sur 8 » dit déjà l'état). */
  complet: boolean
}

/**
 * Lignes du tableau des chiffres, toujours les six dans cet ordre : service, actifs, en_fij,
 * carte_fij, batir, anti_dispersion. `derniere_session` : troisième chiffre du résumé du
 * ministère sous 600 px (`DonneesMinistere.resume`).
 */
export type IdChiffre =
  'service' | 'actifs' | 'en_fij' | 'carte_fij' | 'batir' | 'anti_dispersion' | 'derniere_session'

/** Une ligne de « Les chiffres de l'église ». */
export interface LigneChiffre {
  id: IdChiffre
  libelle: string
  valeur: ValeurAffichee
  /** Null : pas de valeur, pas de comparaison possible ou aucun ministère en commun. */
  ecart: Ecart | null
  /** Null : aucun point saisi sur toute la période (premier dimanche, type jamais tenu). */
  courbe: DonneesCourbe | null
  /**
   * « Dimanche 27 sept. », « À ce jour », « 64 sur 83 STARs actifs », « Saisi par FIJ le
   * 21 sept. », « Samedi 26 sept. » ; vide : TEXTES_VIDES.chiffres.dateAceJour ou
   * TEXTES_VIDES.chiffres.dateSansSession.
   */
  date: string
  /** Forme courte pour le téléphone : « Dim. 27 sept. » ; null : `date` sert telle quelle. */
  dateCourte: string | null
  /** Date signalée en orange, avec son texte : « À ce jour, 1 valeur de plus de 30 jours ». */
  dateSignalee: boolean
  /** Null : rien à compter (type de session sans aucune session passée). */
  completude: CompletudeAffichee | null
}

/** Un point ouvert de « À décider », déjà trié (BRIEF, section 9). */
export interface PointADecider {
  id: string
  priorite: Priorite
  /** Ministère créateur : « Intégration », « Social (désactivé) ». */
  ministere: string
  /** « avant le 5 oct. » ; `depassee` ajoute « dépassée » en rouge. Null : sans échéance. */
  echeance: { texte: string; depassee: boolean } | null
  titre: TexteLibre
  /** Null : champ laissé vide à la création. */
  description: TexteLibre | null
  /** Action attendue : « Décision du conseil sur le budget ». Null : champ laissé vide. */
  attendu: TexteLibre | null
  /** Noms complets des ministères mentionnés, sans l'arobase : « Prodiges Junior » (T24). */
  mentions: string[]
}

/** Bloc « À décider » (berger et conseil ; EJP Tech en lecture seule). */
export interface DonneesADecider {
  /**
   * Les trois premiers points ouverts dans l'ordre de « À décider » (selectionADecider).
   * Liste vide : TEXTES_VIDES.aDecider.aucunPoint.
   */
  points: PointADecider[]
  /** Au moins un point ouvert urgent, même au-delà des trois : sur téléphone, le bloc remonte. */
  urgent: boolean
  /** Onglet « Ouverts » des points d'attention. */
  lienTousLesPoints: string
}

/** Apport d'un ministère à la session : présents moins déjà comptés. */
export interface ApportSession {
  ministere: string
  /** Null : le ministère attendu n'a pas saisi (TEXTES_VIDES.session.apportManquant). */
  valeur: number | null
  /** Présents saisis, quand ils diffèrent de l'apport : « (13 saisis) ». Null sinon. */
  saisis: number | null
}

export interface Lien {
  libelle: string
  href: string
}

/** Une session passée, affichée dans son bloc. */
export interface DerniereSession {
  /** « Bâtir l'Église, samedi 26 septembre », « Soirée des parents, samedi 17 octobre » */
  titre: string
  /**
   * Total sans double compte. Null : aucun ministère n'a encore saisi (jamais 0 par défaut) :
   * TEXTES_VIDES.session.totalSansSaisie et TEXTES_VIDES.session.resumeSansSaisie(attendus).
   */
  total: number | null
  saisis: number
  attendus: number
  /** Par apport décroissant, puis par nom ; ceux qui n'ont pas saisi en dernier (T21). */
  apports: ApportSession[]
  /** « 61 présences saisies : 3 STARs saisis par deux ministères ne sont comptés qu'une fois. » */
  noteDoubleCompte: string | null
  /**
   * Un lien vers chaque autre type qui a une session passée (T20) : « Voir Anti-Dispersion »
   * (/?session=anti_dispersion), « Voir les autres rassemblements » (/?session=autre).
   */
  autres: Lien[]
}

/** Bloc de la session : la dernière session passée, ou celle du type choisi par `?session=`. */
export type DonneesBlocSession =
  | { etat: 'session'; session: DerniereSession }
  /** Aucune session passée, tous types confondus : TEXTES_VIDES.session.aucuneSession. */
  | { etat: 'aucune_session' }
  /**
   * `?session=` d'un type sans session passée : `titre` « Anti-Dispersion », message
   * TEXTES_VIDES.session.aucuneSessionDuType[type], liens vers les types qui en ont une.
   */
  | { etat: 'aucune_session_du_type'; type: TypeSession; titre: string; autres: Lien[] }

export type CodeDepartement = '75' | '77' | '78' | '91' | '92' | '93' | '94' | '95'

export interface DepartementFij {
  code: CodeDepartement
  /** « Paris » */
  nom: string
  /** Nulle : département sans valeur (TEXTES_VIDES.carte.departementSansValeur). */
  valeur: number | null
}

export interface DonneesCarteFij {
  total: number
  /** Toujours les huit départements, dans l'ordre des codes. */
  departements: DepartementFij[]
}

/** Fraîcheur (règle 6) : vert jusqu'à 7 jours, orange de 8 à 30, rouge au-delà. */
export interface Fraicheur {
  /** « Aujourd'hui », « Hier », « Il y a 12 jours », « Aucune saisie » (en retard). */
  libelle: string
  etat: 'a_jour' | 'a_surveiller' | 'en_retard'
}

/** Colonne « Prochain événement ». */
export type ProchainEvenement =
  /** TEXTES_VIDES.ministeres.aucunEvenement */
  | { etat: 'aucun' }
  /** « 14 nov. » et le nom de l'événement : « 14 nov., Collecte d'hiver ». */
  | { etat: 'prevu'; date: string; nom: TexteLibre }

/** Colonnes « Prochaine réunion » et « Point ouvert », berger, conseil et EJP Tech seulement. */
export interface ColonnesConseil {
  /** « 6 oct. » ; null : TEXTES_VIDES.ministeres.reunionNonRenseignee. */
  prochaineReunion: string | null
  /** Priorité la plus haute des points ouverts ; null : TEXTES_VIDES.ministeres.aucunPointOuvert. */
  pointOuvert: Priorite | null
}

/** Une ligne de « Les ministères », déjà triée du moins récent au plus récent. */
export interface LigneMinistere {
  id: string
  nom: string
  /** Fiche du ministère (berger, conseil, EJP Tech), « Ma fiche » (le ministère lui-même), sinon null. */
  href: string | null
  fraicheur: Fraicheur
  prochainEvenement: ProchainEvenement
  /** Null pour le ministère et l'administration de l'église (colonnes retirées). */
  conseil: ColonnesConseil | null
}

/** Blocs de l'église, communs aux cinq profils. */
interface DonneesEglise {
  semaine: Semaine
  /**
   * Phrase de la semaine (berger, conseil) ou de l'église (ministère jusqu'à l'étape 4, T18 ;
   * administration). Personne n'a saisi : « Aucun ministère n'a encore saisi les chiffres du
   * dimanche 27 sept. » (phrases.ts).
   */
  phrase: MorceauPhrase[]
  /** Deux phrases au plus ; null : rien à signaler, la ligne ne s'affiche pas. */
  ligneSecondaire: string | null
  /** Les six lignes, chacune avec son propre état vide. */
  chiffres: LigneChiffre[]
  noteChiffres: string
  session: DonneesBlocSession
  /** Null : FIJ n'a jamais envoyé la carte (TEXTES_VIDES.carte.vide). */
  carte: DonneesCarteFij | null
  /** Ministères actifs. Liste vide : TEXTES_VIDES.ministeres.aucun. */
  ministeres: LigneMinistere[]
}

/**
 * Berger et conseil : surligneur, « À décider », chaque nom ouvre la fiche, cinq colonnes.
 * EJP Tech voit le même contenu, en lecture seule (T29).
 */
export interface DonneesBergerConseil extends DonneesEglise {
  profil: 'berger' | 'conseil' | 'admin_plateforme'
  /**
   * Vrai pour EJP Tech (`enLectureSeule`, src/lib/metier/droits.ts) : aucune action, ni « Marquer
   * traité » ni changement de statut. À l'étape 5, le bouton « Marquer traité » de « À décider »
   * ne s'affiche que si ce champ est faux, c'est-à-dire pour un décideur (`estDecideur`).
   */
  lectureSeule: boolean
  aDecider: DonneesADecider
  ministeres: (LigneMinistere & { href: string; conseil: ColonnesConseil })[]
}

/** Administration de l'église : ni C ni surligneur, ni « À décider », ni lien, trois colonnes. */
export interface DonneesAdministration extends DonneesEglise {
  profil: 'admin_eglise'
  ministeres: (LigneMinistere & { href: null; conseil: null })[]
}

/** Ministère : « L'église cette semaine », seul son nom ouvre « Ma fiche », trois colonnes. */
export interface DonneesMinistere extends DonneesEglise {
  profil: 'ministere'
  /**
   * Sous 600 px, avant « Tout voir » (BRIEF section 9) : STARs au service, STARs présents en
   * FIJ, dernière session (id `derniere_session` ; sans session : libellé « Présents à Bâtir
   * l'Église », valeur vide, date TEXTES_VIDES.chiffres.dateSansSession).
   */
  resume: [LigneChiffre, LigneChiffre, LigneChiffre]
  ministeres: (LigneMinistere & { conseil: null })[]
}

export type DonneesCetteSemaine = DonneesBergerConseil | DonneesAdministration | DonneesMinistere
