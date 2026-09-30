// Données de la vue « Cette semaine » (maquettes 01, 02, 03), prêtes à afficher : les textes
// arrivent déjà formatés (dates à l'heure de Paris, complétude, fraîcheur). Les composants ne
// calculent aucune règle métier, ils ne font que les montrer (BRIEF, section 9).

/** Profils qui voient la vue de l'église. EJP Tech n'en a pas. */
export type ProfilVue = 'berger' | 'conseil' | 'ministere' | 'admin_eglise'

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

/** Écart à périmètre égal : « +3 » ou « −3 » (signe moins U+2212, jamais un tiret). */
export interface Ecart {
  texte: string
  sens: 'hausse' | 'baisse' | 'stable'
  /** Étiquette accessible : « +3 par rapport à dimanche dernier, pour les 6 ministères... » */
  description: string
}

/** Un point de courbe. `valeur` nulle : trou (dimanche sans saisie), jamais zéro. */
export interface PointCourbe {
  valeur: number | null
  /** Dimanche ou session incomplet : cercle vide. */
  incomplet?: boolean
}

export interface DonneesCourbe {
  points: PointCourbe[]
  /** Équivalent texte : « Dix derniers dimanches : 49, 51, 55, 52 ». */
  description: string
}

/** Une ligne du tableau « Les chiffres de l'église ». */
export interface LigneChiffre {
  id: string
  libelle: string
  /** « 52 », « 77 » ; nulle : « Pas encore de saisie » (premier dimanche). */
  valeur: string | null
  /** « % » */
  unite?: string
  ecart?: Ecart
  courbe?: DonneesCourbe
  /** « Dimanche 27 sept. », « À ce jour », « 64 sur 83 STARs actifs » */
  date: string
  /** Forme courte pour le téléphone : « Dim. 27 sept. » */
  dateCourte?: string
  /** Date signalée en orange, avec son texte : « À ce jour, 1 valeur de plus de 30 jours ». */
  dateSignalee?: boolean
  /** « 6 sur 8 », « 8 dép. » */
  completude: string
  /** Faux : la complétude s'affiche en orange (le texte « 6 sur 8 » dit déjà l'état). */
  complet: boolean
}

/** Un point ouvert de « À décider », déjà trié (BRIEF, section 9). */
export interface PointADecider {
  id: string
  priorite: Priorite
  /** Ministère créateur : « Intégration » */
  ministere: string
  /** « avant le 5 oct. » ; `depassee` ajoute « dépassée » en rouge. */
  echeance?: { texte: string; depassee: boolean }
  titre: string
  description?: string
  /** Action attendue : « Décision du conseil sur le budget » */
  attendu?: string
  /** Ministères mentionnés, sans l'arobase : « coordination » */
  mentions: string[]
}

/** Apport d'un ministère à la dernière session : présents moins déjà comptés. */
export interface ApportSession {
  ministere: string
  /** Nulle : le ministère attendu n'a pas saisi (« À saisir »). */
  valeur: number | null
  /** Présents saisis, quand ils diffèrent de l'apport : « (13 saisis) ». */
  saisis?: number
}

export interface Lien {
  libelle: string
  href: string
}

/** Bloc de la dernière session passée (tous types confondus). */
export interface DerniereSession {
  /** « Bâtir l'Église, samedi 26 septembre » */
  titre: string
  /** Total sans double compte. */
  total: number
  saisis: number
  attendus: number
  apports: ApportSession[]
  /** « 61 présences saisies : 3 STARs saisis par deux ministères ne sont comptés qu'une fois. » */
  noteDoubleCompte?: string
  /** « Voir Anti-Dispersion », « Voir les autres rassemblements » */
  autres: Lien[]
}

export type CodeDepartement = '75' | '77' | '78' | '91' | '92' | '93' | '94' | '95'

export interface DepartementFij {
  code: CodeDepartement
  /** « Paris » */
  nom: string
  /** Nulle : département sans valeur. */
  valeur: number | null
}

export interface DonneesCarteFij {
  total: number
  departements: DepartementFij[]
}

/** Fraîcheur (règle 6) : vert jusqu'à 7 jours, orange de 8 à 30, rouge au-delà. */
export interface Fraicheur {
  /** « Aujourd'hui », « Hier », « Il y a 12 jours », « Aucune saisie » */
  libelle: string
  etat: 'a_jour' | 'a_surveiller' | 'en_retard'
}

/** Une ligne de « Les ministères », déjà triée du moins récent au plus récent. */
export interface LigneMinistere {
  id: string
  nom: string
  /** Fiche du ministère (berger, conseil) ou « Ma fiche » (le ministère lui-même). */
  href?: string
  fraicheur: Fraicheur
  /** « 14 nov., Collecte d'hiver » ou « Aucun événement prévu » */
  prochainEvenement: string
  /** Berger et conseil seulement : « 6 oct. » ou « Non renseignée » */
  prochaineReunion?: string
  /** Berger et conseil seulement : priorité la plus haute des points ouverts, nulle : « Aucun ». */
  pointOuvert?: Priorite | null
}

export interface DonneesCetteSemaine {
  semaine: Semaine
  phrase: MorceauPhrase[]
  /** Deux phrases au plus : ministères sans mise à jour, dernière session. */
  ligneSecondaire?: string
  chiffres: LigneChiffre[]
  noteChiffres: string
  /** Points ouverts dans l'ordre de « À décider » (berger et conseil). */
  aDecider: PointADecider[]
  lienTousLesPoints: string
  session: DerniereSession | null
  carte: DonneesCarteFij | null
  ministeres: LigneMinistere[]
}
