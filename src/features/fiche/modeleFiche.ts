// Données de la fiche d'un ministère (maquettes 04 et 12), prêtes à afficher : les textes arrivent
// déjà écrits (dates à l'heure de Paris, complétude). Les composants ne calculent
// aucune règle métier. Contrat entre `construireFiche.ts` (lectures de la base ou de l'aperçu) et
// les composants de `src/features/fiche/`.
//
// États vides (T36) : chaque bloc dit qu'il n'a rien à montrer par une union discriminée (`etat`),
// une liste vide ou `null`, jamais par un 0.

import type { NatureIndicateur, Priorite, StatutPoint, TypeCompte } from '@/lib/base'
import type { EtatFraicheur } from '@/lib/metier/fraicheur'
import type { Segment } from '@/lib/metier/phrases'

/** Profils qui lisent une fiche : le ministère la sienne (12), les autres en lecture (04). */
export type ProfilFiche = Extract<
  TypeCompte,
  'ministere' | 'berger' | 'conseil' | 'admin_plateforme'
>

/** Un champ libre écrit par un ministère ; masqué par EJP Tech, il s'affiche en `--encre-3`. */
export interface TexteLibre {
  texte: string
  masque: boolean
}

/** Un point de petite courbe : `valeur` nulle, un trou (jamais 0) ; `incomplet`, un cercle vide. */
export interface PointCourbeFiche {
  valeur: number | null
  incomplet?: boolean
}

export interface CourbeFiche {
  /** Du plus ancien au plus récent : dix dimanches ou douze mois. */
  points: PointCourbeFiche[]
  /** Équivalent texte : « Douze derniers mois : 6, 1, sans saisie, 2. » */
  description: string
}

/**
 * Valeur d'une ligne de chiffres. Un sensible s'affiche exact pour son ministère, le berger, le
 * conseil et EJP Tech (P52) : jamais « moins de 3 » ni « masqué ».
 */
export type ValeurFiche =
  /** « 10 », « 5 164 € », « 79 » avec l'unité « % ». */
  | { etat: 'saisie'; texte: string; unite: '%' | null }
  /** Jamais saisi : « Pas encore de saisie » (jamais 0). */
  | { etat: 'vide' }
  /** Calcul ou pourcentage qui ne se calcule pas : « Non calculé », « Non calculé, à vérifier ». */
  | { etat: 'non_calcule'; texte: string }

/** Écart à la période précédente, ou la mention de la période non saisie. */
export interface EcartFiche {
  /** « +1 », « −2 » (U+2212), ou « dimanche 20 sept. non saisi ». */
  texte: string
  sens: 'hausse' | 'baisse' | 'stable' | 'non_saisi'
  /** Étiquette accessible : « +1 par rapport à dimanche dernier ». */
  description: string
}

/** Une ligne des chiffres communs : STARs au service, actifs, en FIJ, lignes de référence de MDS. */
export interface LigneCommune {
  cle: string
  /** Libellé de la demande du ministère (`v_commun_fiche`), sinon celui du commun. */
  libelle: string
  valeur: ValeurFiche
  ecart: EcartFiche | null
  courbe: CourbeFiche | null
  /** « Dimanche 27 sept. », « Saisi le 24 sept. », « 11 sur 14, calculé », « 6 sur 8 ». */
  detail: string | null
  /** Détail en orange (valeur de plus de 30 jours, complétude incomplète), toujours avec son texte. */
  detailSignale: boolean
}

/** Somme de l'année d'un indicateur, avec son départ et sa complétude. */
export interface SommeFiche {
  /** « Depuis janvier : 112 ». */
  texte: string
  /** « 9 mois sur 9 », qui porte l'aide `fiche.sommeAnnee` sur la première ligne. */
  completude: string | null
}

/** Valeur du mois en cours d'un indicateur du mois : « Octobre en cours : 2 ». */
export interface MoisEnCoursFiche {
  texte: string
}

/** Une case de répartition : « Malaise : 4 », « Blessure : 1 », « Non réparti : 0 ». */
export interface CaseRepartition {
  libelle: string
  texte: string
}

/** Répartition d'un mois d'un indicateur sensible. */
export type RepartitionMois =
  | { mois: string; titre: string; etat: 'cases'; cases: CaseRepartition[] }
  /** « Pas de répartition pour septembre. » */
  | { mois: string; titre: string; etat: 'aucune'; texte: string }

/** Précision d'un mois (P46) : « Précision d'octobre : ... ». */
export interface PrecisionFiche {
  mois: string
  titre: string
  texte: TexteLibre
}

/** Ce qui s'affiche sous la ligne d'un indicateur sensible (P45 à P47). */
export interface DetailSensible {
  /** Précisions du dernier mois saisi et du mois en cours ; vide : rien n'est affiché. */
  precisions: PrecisionFiche[]
  /** Null : l'indicateur n'a pas de catégories, aucune répartition n'est affichée. */
  repartitions: RepartitionMois[] | null
}

/** Aides de la fiche placées sur une ligne (aides-contextuelles.md, « Fiche d'un ministère »). */
export interface AidesLigne {
  /** `fiche.calcule`, sur le libellé de la première ligne calculée. */
  calcule?: boolean
  /** `fiche.sommeAnnee`, à côté de la complétude de la première somme de l'année. */
  somme?: boolean
}

/** Une ligne d'indicateur propre (ou d'un calcul) de la fiche. */
export interface LigneIndicateurFiche {
  id: string
  libelle: string
  /** Ajout à valider : « À valider par EJP Tech » (lecteurs), ou la phrase du ministère. */
  aValider: string | null
  calcul: boolean
  /** Jamais saisi, ni pour un mois fini ni pour le mois en cours : « première saisie » attendue. */
  jamaisSaisi: boolean
  valeur: ValeurFiche
  courbe: CourbeFiche | null
  /** « Septembre 2026 », « Dimanche 27 sept. », « Saisi le 3 sept. », phrase du calcul. */
  detail: string | null
  detailSignale: boolean
  somme: SommeFiche | null
  moisEnCours: MoisEnCoursFiche | null
  sensible: DetailSensible | null
  aides: AidesLigne
}

/** Une section de rythme : « Chaque dimanche », « Chaque mois », « À ce jour ». */
export interface SectionFiche {
  nature: NatureIndicateur
  titre: string
  lignes: LigneIndicateurFiche[]
}

/** Un indicateur retiré, dans le bloc « Retirés » replié. */
export interface LigneRetiree {
  id: string
  libelle: string
  /** « Retiré le 5 sept. » */
  detail: string
}

/** Données de la fiche, sans les points ni les dernières saisies (blocs à part). */
export interface DonneesFiche {
  ministere: { id: string; nom: string; code: string | null }
  profil: ProfilFiche
  phrase: Segment[]
  fraicheur: { libelle: string; etat: EtatFraicheur }
  communs: LigneCommune[]
  sections: SectionFiche[]
  retires: LigneRetiree[]
  /** Aucun indicateur propre (hors retirés) : le texte de premier usage du profil. */
  sansIndicateurPropre: boolean
  /**
   * Ministère seulement : un indicateur du mois n'a jamais été saisi. Le bloc porte alors une
   * seule action, « Saisir les chiffres du mois » (plan, E2, « Ligne d'indicateur »).
   */
  actionSaisirMois: boolean
  /** Ministère seulement : il a au moins un indicateur du mois (bouton de l'en-tête). */
  aDesIndicateursDuMois: boolean
  /** `fiche.courbe` sur l'en-tête de la colonne des courbes, s'il y a au moins une courbe. */
  aideCourbe: boolean
}

/** Un point de la fiche, en lecture (les boutons arrivent à l'étape 5). */
export interface PointFiche {
  id: string
  /** Statut du point (`v_point.statut`) : les boutons d'action en lisent les droits (étape 5). */
  statut: StatutPoint
  /** Ministère créateur (`v_point.ministere_id`), pour les droits des boutons, jamais son nom. */
  ministereId: string
  /** Identifiants des ministères mentionnés (`v_point_mention.ministere_id`), pour les droits. */
  mentionIds: string[]
  priorite: Priorite
  /** Ministère créateur : « Communication », « Social (désactivé) ». */
  ministere: string
  /** « avant le 3 oct. », avec « dépassée » en rouge s'il y a lieu ; null sans échéance. */
  echeance: { texte: string; depassee: boolean } | null
  titre: TexteLibre
  description: TexteLibre | null
  attendu: TexteLibre | null
  /** Noms complets des ministères mentionnés : « @Coordination ». */
  mentions: string[]
  /** Ministère lecteur mentionné par un autre : « Mentionné par Intégration. » */
  mentionnePar: string | null
  /** Point traité depuis 7 jours au plus : « Traité le 30 sept. » et le commentaire. */
  traite: { texte: string; commentaire: TexteLibre | null } | null
}

/** Une ligne de « Dernières saisies » : « 27 sept., 12 h 41 », « STARs au service : 10 ». */
export interface DerniereSaisieFiche {
  id: number
  quand: string
  /** L'action en mots ; avec un objet, elle finit par « : » (« Nouveau point : »). */
  texte: string
  /** Titre d'un point ou d'un événement visé (texte libre) : masqué, il s'affiche en `--encre-3`. */
  objet: TexteLibre | null
}

/** État d'un bloc lu à part : chargement, problème passager, ou ses données. */
export type EtatBloc<T> =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'donnees'; donnees: T }
