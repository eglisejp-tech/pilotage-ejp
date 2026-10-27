// Textes de la liste « Incidents d'envoi » de la Modération (T76, lot C ; conception
// erreurs-envoi, section 8.3, Proposés). Aucun tiret cadratin ni demi-cadratin.

import type {
  GenreIncident,
  IssueIncident,
  NavigateurIncident,
  SystemeIncident,
  TypeCompte,
} from '@/lib/base'

export const TEXTES_INCIDENTS = {
  /** Titre de la liste repliée, avec le nombre d'incidents gardés. */
  titre: "Incidents d'envoi des 90 derniers jours",
  presentation: 'Les envois qui ont échoué sur les appareils, sans rien de ce qui a été saisi.',
  vide: 'Aucun incident ces 90 derniers jours.',
  chargement: 'Chargement des incidents',
  plus: 'Afficher 50 de plus',
  plusEnCours: 'Chargement en cours',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
  ministereSupprime: 'Ministère supprimé',
  rattrape: 'rattrapé par un nouvel essai',
  version: 'Version',
  versionLocale: 'Version locale',
  reference: 'Référence',
} as const

/** Le genre d'un incident ; le statut ou le code s'ajoute entre parenthèses quand il aide. */
export const GENRES_INCIDENT: Record<GenreIncident, string> = {
  sans_reponse: 'Pas de réponse',
  reponse_perdue: 'Réponse perdue',
  reponse_illisible: 'Réponse illisible',
  delai: 'Délai de 10 s dépassé',
  refus_inconnu: 'Refus inattendu',
  bogue: "Erreur de l'application",
  session: 'Connexion expirée',
}

export const ISSUES_INCIDENT: Record<IssueIncident, string> = {
  enregistre: 'enregistré',
  inconnue: 'issue inconnue',
  rien_enregistre: "rien d'enregistré",
}

/** Qui a envoyé, hors ministère : le profil (le compte n'est jamais gardé). */
export const PROFILS_INCIDENT: Record<TypeCompte, string> = {
  ministere: 'Ministère',
  berger: 'Berger',
  conseil: 'Conseil',
  admin_eglise: "Administration de l'église",
  admin_plateforme: 'EJP Tech',
}

export const NAVIGATEURS_INCIDENT: Record<NavigateurIncident, string> = {
  safari: 'Safari',
  chrome: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge',
  samsung: 'Samsung Internet',
  autre: 'Autre navigateur',
}

export const SYSTEMES_INCIDENT: Record<SystemeIncident, string> = {
  ios: 'iOS',
  android: 'Android',
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  autre: 'autre système',
}

/** Ce que la personne faisait, par écriture (catalogue de la conception, 4.5). */
export const OPERATIONS_LIBELLES: Readonly<Record<string, string>> = {
  accepter_conditions: 'Accepter les conditions',
  ajouter_evenement: 'Ajouter un événement',
  ajouter_suggestion: 'Demander un indicateur',
  changer_statut_point: "Changer le statut d'un point",
  choisir_modele_prevus: 'Choisir la liste des prévus',
  clore_signalement: 'Clore un signalement',
  corriger_indicateur: 'Corriger un indicateur',
  creer_calcul: 'Créer un calcul',
  creer_indicateur: 'Créer un indicateur',
  creer_indicateurs_prevus: 'Créer les indicateurs prévus',
  creer_point: 'Nouveau point',
  declarer_intervenant: 'Dire qui utilise le compte',
  declarer_session: 'Ajouter une session',
  effacer_prenom: 'Effacer un prénom',
  effacer_prenoms_anciens: 'Effacer les prénoms anciens',
  marquer_relu: 'Marquer relu',
  marquer_traite: 'Marquer traité',
  masquer_texte: 'Masquer un texte',
  modifier_mentions_point: "Modifier les mentions d'un point",
  modifier_session: 'Modifier une session',
  retirer_indicateur: 'Retirer un indicateur',
  retirer_mon_indicateur: 'Retirer un ajout',
  saisir_chiffres_mois: 'Chiffres du mois',
  saisir_fij_statistiques: 'Chiffres des FIJ par département',
  signaler_difficulte: 'Signaler une difficulté',
  supprimer_session: 'Supprimer une session',
  valider_indicateur: 'Valider un indicateur',
  prendre_en_charge_signalement: 'Prendre en charge un signalement',
  repondre_au_ministere: 'Répondre au ministère',
  confirmer_signalement: 'Confirmer un signalement',
  repondre_a_ejp_tech: 'Répondre à EJP Tech',
  corriger_titre_evenement: "Corriger le nom d'un événement",
  modifier_mentions_evenement: "Modifier les mentions d'un événement",
  retirer_evenement: 'Retirer un événement',
  ajouter_evenements_serie: 'Ajouter une série',
  corriger_titre_serie: "Corriger le nom d'une série",
  modifier_mentions_serie: "Modifier les mentions d'une série",
  retirer_serie: 'Retirer une série',
  evenement_etat: 'Mettre à jour un événement',
  fij_departement: 'Carte des FIJ',
  mesure: 'Chiffres du dimanche',
  participation: 'Présence à une session',
  passage: "Jour d'utilisation",
  reunion: 'Prochaine réunion',
  'creer-compte': 'Créer un compte',
  'relancer-invitation': "Renvoyer l'invitation",
  'desactiver-compte': 'Désactiver un compte',
  'reactiver-compte': 'Réactiver un compte',
  'reinitialiser-2fa': "Refaire l'activation",
  'corriger-adresse': "Corriger l'adresse",
  'supprimer-ministere': 'Supprimer un ministère',
  autre: 'Autre envoi',
}
