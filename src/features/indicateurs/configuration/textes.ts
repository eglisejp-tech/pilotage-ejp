// Textes des écrans `/indicateurs` et `/indicateurs/:id` (configuration-indicateurs.md, 7.1, 7.2 et
// 7.7). Français simple, voix active, aucun tiret cadratin. Aucun composant n'écrit un de ces
// textes en dur. Les textes marqués « Proposé » ne sont pas dans le texte de conception : ils
// attendent la validation de la personne responsable.

import type { EtatPrevus } from '@/features/indicateurs/configuration/prevus'
import { accorder, nombre } from '@/lib/metier/texte'

export const TEXTES_CONFIGURATION = {
  liste: {
    /** Colonnes du tableau (7.1). */
    colonneMinistere: 'Ministère',
    colonneIndicateurs: 'Indicateurs',
    colonnePrevus: 'Prévus',
    colonneSaisie: 'Saisie',
    colonneChangement: 'Dernier changement',
    /**
     * Aucun ministère actif (7.1) : le bouton « Ajouter un ministère » porte l'action (T66, t327,
     * t328 et m224 ; il ouvre Ministères et comptes).
     */
    aucunMinistere: 'Aucun ministère.',
    /** Proposé, administration en lecture (T60) : EJP Tech crée les ministères. */
    aucunMinistereLecture: 'Aucun ministère. EJP Tech crée les ministères.',
    actionMinisteres: 'Ajouter un ministère',
    /** Colonne « Prévus ». */
    creer: 'Créer',
    choisir: 'Choisir',
    crees: 'Créés',
    aucunPrevu: 'Aucun prévu',
    aChoisir: 'À choisir',
    /** Lien de « Aucun prévu » vers l'écran du ministère, où le choix se change (T72, Proposé). */
    changer: 'Changer',
    /** Colonne « Saisie » : proposé. */
    saisieReguliere: 'Régulière',
    aucuneSaisieASuivre: 'Rien à suivre',
    /** Colonne « Dernier changement » d'un ministère sans geste de configuration : proposé. */
    aucunChangement: 'Aucun',
    /** Proposé : le journal lu est plein et ne montre aucun geste de ce ministère. */
    changementAncien: 'Plus ancien',
  },
  ministere: {
    retour: 'Tous les indicateurs',
    /**
     * Titre du bloc des prévus (7.2), sans dire qui a prévu la liste (T66, t331 ; glossaire
     * « Indicateurs prévus »).
     */
    titrePrevus: 'Indicateurs prévus',
    /** Le libellé dit ce qu'on choisit (T66, t333). */
    choixModele: 'Nom du ministère dans la liste',
    choixModelePlaceholder: 'Choisissez un ministère de la liste',
    /**
     * Indication sous le choix, tant que rien n'est choisi : elle remplace la bulle
     * `indicateurs.modele` (T66, t334 et t335).
     */
    attenteChoix: 'Choisissez le nom qui correspond à ce ministère.',
    /** Dernier choix de la liste (7.2). */
    aucunPrevu: 'Aucun prévu',
    /** Proposé : le choix « Aucun prévu » est retenu (T66, t336). */
    aucunPrevuExplication: 'Aucun indicateur prévu pour ce ministère.',
    /**
     * Indication sous le choix quand la liste est présélectionnée d'après le nom du ministère :
     * une suggestion, jamais un choix (T72, Proposé).
     */
    indicationSuggestion:
      "Choix proposé d'après le nom du ministère : vérifiez-le avant d'enregistrer.",
    /** Le choix passe par la base avant toute création (T72). */
    boutonEnregistrerChoix: 'Enregistrer le choix',
    /** Revenir sur la liste choisie, tant qu'aucun de ses prévus n'est suivi (T72, Proposé). */
    changer: 'Changer',
    annulerChangement: 'Annuler',
    titreRetires: 'Retirés',
    /**
     * Le lien d'un ajout à valider vers le bloc de l'écran Indicateurs (7.2) : le même lien que la
     * modération (T66, t342).
     */
    voirAValider: 'Ouvrir les indicateurs à valider',
    /** Proposé : mention d'un calcul, qui ne se saisit pas. */
    calculSansSaisie: 'Se calcule tout seul',
    aucunRetire: 'Aucun indicateur retiré.',
  },
  /** Bouton « Créer » ou « Créer ces 6 indicateurs » pendant l'envoi (m227, Proposé). */
  creationEnCours: 'Création en cours',
  /** Bouton « Enregistrer le choix » pendant l'envoi (T72, Proposé). */
  enregistrementEnCours: 'Enregistrement en cours',
  /** Chargement de la liste, puis de l'écran d'un ministère (T65). */
  chargement: 'Chargement des indicateurs',
  chargementMinistere: 'Chargement des indicateurs du ministère',
  /** Erreurs de page (LISEZMOI, « États »). */
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
  /** Ministère inconnu ou désactivé, aucune requête de plus (formule « introuvable », m224). */
  introuvable: 'Ce ministère est introuvable.',
  revenir: 'Revenir aux indicateurs',
  /**
   * Sous le titre des deux écrans, pour l'administration de l'église, qui les lit sans aucun
   * bouton (décision T60, Proposé).
   */
  lecture: 'EJP Tech crée, corrige et retire les indicateurs. Adressez-lui vos demandes.',
} as const

/** État vide d'un ministère sans indicateur suivi (7.2, LISEZMOI « États » ; T66, t330). */
export function aucunIndicateurPour(nomMinistere: string): string {
  return `Aucun indicateur pour ${nomMinistere}.`
}

/** « Créer ces 6 indicateurs » : le bouton du bloc « Indicateurs prévus » (7.2). */
export function boutonCreerPrevus(n: number): string {
  return `Créer ${n === 1 ? 'cet' : 'ces'} ${nombre(n)} ${accorder(n, 'indicateur', 'indicateurs')}`
}

/**
 * Libellé accessible du bouton « Créer » du tableau : « Créer les 6 indicateurs prévus de Kumi ».
 * Il commence par le texte visible du bouton (« Créer »).
 */
export function nomAccessibleCreer(n: number, ministere: string): string {
  return `Créer ${n === 1 ? "l'indicateur prévu" : `les ${nombre(n)} indicateurs prévus`} de ${ministere}`
}

/** « 6 à créer » : la colonne « Prévus » du tableau. */
export function texteACreer(n: number): string {
  return `${nombre(n)} à créer`
}

/** Introduction de la liste des prévus (7.2) : « Liste « Kumi » : 12 indicateurs à créer. » (T66, t332). */
export function introPrevus(nomModele: string, n: number): string {
  return `Liste « ${nomModele} » : ${nombre(n)} ${accorder(n, 'indicateur', 'indicateurs')} à créer.`
}

/** Messages de réussite (7.2 et 7.7), annoncés pendant 6 secondes. */
export function reussiteCreationPrevus(n: number, nomMinistere: string): string {
  if (n === 0) return `Aucun indicateur prévu à créer pour ${nomMinistere}.`
  return `${nombre(n)} ${accorder(n, 'indicateur prévu créé', 'indicateurs prévus créés')}.`
}

/** Proposé : la réponse « Aucun prévu » est enregistrée (formule « réussite », T66 t338, m226). */
export function reussiteAucunPrevu(nomMinistere: string): string {
  return reussiteChoixListe(TEXTES_CONFIGURATION.ministere.aucunPrevu, nomMinistere)
}

/** Proposé (T72) : la liste choisie est enregistrée, sur le modèle de « Aucun prévu ». */
export function reussiteChoixListe(nomListe: string, nomMinistere: string): string {
  return `Choix « ${nomListe} » enregistré pour ${nomMinistere}.`
}

/** Proposé (T72) : la liste choisie n'a plus aucun prévu suivi ; elle se change. */
export function prevusTousRetires(nomListe: string): string {
  return `Les indicateurs prévus de la liste « ${nomListe} » sont tous retirés.`
}

/** Nom accessible du lien « Changer » de la colonne « Prévus » : « Changer la liste de Kumi ». */
export function nomAccessibleChanger(ministere: string): string {
  return `Changer la liste de ${ministere}`
}

/**
 * En lecture (administration de l'église, T60), à la place du bloc « Indicateurs prévus » de
 * `/indicateurs/:id` : ce qui reste à créer ou à choisir, sans bouton, comme la colonne « Prévus »
 * de la liste. Null quand rien ne reste. Proposé ; sans dire qui a prévu la liste (T66, t331).
 */
export function prevusEnLecture(etat: EtatPrevus): string | null {
  if (etat.genre === 'a_creer') return introPrevus(etat.modele.nom, etat.manquants.length)
  if (etat.genre === 'a_choisir') {
    return 'Indicateurs prévus : la liste de ce ministère reste à choisir.'
  }
  return null
}
