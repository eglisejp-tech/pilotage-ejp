// Textes de la fiche d'un ministère (maquettes 04 et 12) et de la liste des ministères (lot E2).
// Aucun composant n'écrit un de ces textes en dur. Sources : BRIEF, section 9 ; LISEZMOI des
// maquettes, « États » ; plan de l'étape 4, E2 (« Proposé » tant que LISEZMOI ne les donne pas).
// Les textes des indicateurs (« Pas encore de saisie », « à valider », « Indicateurs propres »,
// « Retirés », « Dernières saisies ») sont ceux de `src/features/indicateurs/textesVides.ts` (E1).

import { nomDuMois } from '@/lib/metier/dates'
import type { Mois } from '@/lib/metier/periodes'
import { terminerPhrase } from '@/lib/metier/texte'

/** Texte d'un champ libre masqué par EJP Tech (BRIEF, règle 9). */
export const TEXTE_MASQUE = '[texte masqué par EJP Tech]'

export const TEXTES_FICHE = {
  /** Surtitre de « Ma fiche » (maquette 12). */
  surtitreMinistere: 'Votre ministère',
  /** Lien du surtitre de la fiche 04 vers la liste. */
  lienMinisteres: 'Ministères',

  titreChiffres: 'Les chiffres du ministère',
  complementChiffres: 'Dernière saisie',
  colonneCourbe: 'Courbe',
  titrePoints: "Points d'attention",
  complementPoints: 'Créés ou mentionnés',
  titreDernieresSaisies: 'Dernières saisies',
  toutLeJournal: 'Tout le journal',
  noteDernieresSaisies: "Une correction est une nouvelle saisie. L'historique ne se modifie pas.",

  /** Boutons de saisie de « Ma fiche » (maquette 12), au ministère seulement. */
  saisirDimanche: 'Saisir les chiffres du dimanche',
  saisirMois: 'Saisir les chiffres du mois',
  saisirSession: 'Saisir une session',
  /** Premier usage d'un indicateur du mois, au-dessus de son action. Proposé (E2). */
  premiereSaisieDuMois: 'Un indicateur du mois attend sa première saisie.',
  /**
   * Ajout à valider lu par le berger, le conseil ou EJP Tech : le mot seul ne dit pas qui valide.
   * Le ministère lit la phrase de `texteAjoutAValider` (E1). Proposé (revue de E2).
   */
  aValiderParEjpTech: 'À valider par EJP Tech',

  /** Libellés des chiffres communs quand la demande du ministère n'en donne pas (BRIEF, section 4). */
  communs: {
    service: 'STARs au service',
    actifs: 'STARs actifs',
    en_fij: 'STARs présents en FIJ',
  },
  /** Détail du pourcentage FIJ d'un ministère : « 11 sur 14, calculé » (maquette 04). */
  calcule: 'calculé',
  /** Indicateur « à ce jour » saisi il y a plus de 30 jours. Proposé. */
  plusDe30Jours: 'il y a plus de 30 jours',

  repartition: 'Répartition par catégorie',
  /** Case cachée par le masquage secondaire. Proposé (BRIEF, section 9). */
  masque: 'masqué',

  points: {
    /** LISEZMOI, « États » (07, 12). */
    aucunMinistere: 'Aucun point ouvert pour votre ministère.',
    /** Fiche 04 lue par le berger, le conseil ou EJP Tech. Proposé (E2). */
    aucun: (nom: string) => `Aucun point ouvert pour ${nom}.`,
    attendu: 'Attendu :',
    /** Échéance passée : toujours le mot, jamais la couleur seule (BRIEF, section 9). */
    depassee: ', dépassée',
    /** LISEZMOI, écarts connus (07 et 12). */
    mentionnePar: (nom: string) => `Mentionné par ${nom}.`,
    /** « Traité le 3 oct. » : l'abréviation du mois sert de point final. */
    traiteLe: (jour: string) => terminerPhrase(`Traité le ${jour}`),
  },

  /** `/ministeres/:id` d'un identifiant inconnu ou d'un ministère désactivé. Proposé (E2). */
  introuvable: "Ce ministère n'existe pas ou n'est plus actif.",
  revenirAuxMinisteres: 'Revenir aux ministères',

  /** Problème passager d'un écran ou d'un bloc (LISEZMOI, « États »). */
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
  chargement: 'Chargement',

  liste: {
    titre: 'Ministères',
    /**
     * BRIEF, section 9 : « Du moins récent au plus récent. Ouvrez un ministère pour voir sa
     * fiche. » La phrase du milieu dit où commencent les ministères sans saisie. Proposé (revue
     * de E2).
     */
    phrase:
      'Du moins récent au plus récent. Les ministères sans saisie récente sont en premier. Ouvrez un ministère pour voir sa fiche.',
    /** Premier usage. Proposé (E2). */
    aucun: "Aucun ministère actif. L'administration de l'église crée les ministères.",
    colonneMinistere: 'Ministère',
    colonneMiseAJour: 'Mise à jour',
    colonneEvenement: 'Prochain événement',
    colonneReunion: 'Prochaine réunion',
    colonnePoint: 'Point ouvert',
    /** Textes de la vue de l'église (étape 3), repris pour les mêmes colonnes. */
    aucunEvenement: 'Aucun événement prévu',
    reunionNonRenseignee: 'Non renseignée',
    aucunPointOuvert: 'Aucun',
  },
} as const

const VOYELLE = /^[aeiouyàâéèêëîïôöûüh]/i

/** « de septembre », « d'octobre », « d'avril », « d'août ». */
export function duMois(mois: Mois): string {
  const nom = nomDuMois(Number(mois.slice(5, 7)))
  return VOYELLE.test(nom) ? `d'${nom}` : `de ${nom}`
}

/**
 * Part dont le haut dépasse le bas (P49) : « Septembre 2026 : 5 pour un total de 3. Vérifiez les
 * deux chiffres saisis. » Le détail ne répète pas « Non calculé », que la valeur de la ligne dit
 * déjà. Proposé (revue de E2).
 */
export function partAVerifier(quand: string, haut: string, bas: string): string {
  return `${quand} : ${haut} pour un total de ${bas}. Vérifiez les deux chiffres saisis.`
}

/** Sans le préfixe « Non calculé : » de `texteNonCalcule`, avec une majuscule en tête. */
export function sansPrefixeNonCalcule(texte: string, secours: string): string {
  const prefixe = 'Non calculé : '
  if (!texte.startsWith(prefixe)) return secours
  const reste = texte.slice(prefixe.length)
  return reste === '' ? secours : `${reste.charAt(0).toUpperCase()}${reste.slice(1)}`
}

/**
 * « Précision de septembre », « Précision d'octobre » (P46). Proposé : le BRIEF écrit
 * « Précision : ... », mais deux mois peuvent s'afficher sous la même ligne, le mois les distingue.
 */
export function titrePrecision(mois: Mois): string {
  return `Précision ${duMois(mois)}`
}

/**
 * Somme de l'année d'un sensible lue par un autre profil que son ministère : elle ne compte que
 * les mois affichés et le dit (BRIEF, section 4, « Indicateurs sensibles ») : « Depuis juin,
 * somme des mois affichés : 6, plus 2 mois sous 3 ». Proposé : le BRIEF écrit « Somme des mois
 * affichés : 14, plus 2 mois sous 3 » ; le départ s'ajoute, comme pour toute somme de l'année.
 */
export function sommeDesMoisAffiches(depuis: string, somme: string, moisSous3: number): string {
  return `${depuis}, somme des mois affichés : ${somme}, plus ${moisSous3} mois sous 3`
}

/** Sensible dont tous les mois saisis de l'année sont sous 3, lu par un autre profil. Proposé. */
export function tousLesMoisSous3(depuis: string): string {
  return `${depuis} : tous les mois saisis sont sous 3`
}
