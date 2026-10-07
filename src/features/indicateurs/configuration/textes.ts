// Textes des écrans `/indicateurs` et `/indicateurs/:id` (configuration-indicateurs.md, 7.1, 7.2 et
// 7.7). Français simple, voix active, aucun tiret cadratin. Aucun composant n'écrit un de ces
// textes en dur. Les textes marqués « Proposé » ne sont pas dans le texte de conception : ils
// attendent la validation de la personne responsable.

import { accorder, nombre } from '@/lib/metier/texte'

export const TEXTES_CONFIGURATION = {
  liste: {
    /** Colonnes du tableau (7.1). */
    colonneMinistere: 'Ministère',
    colonneIndicateurs: 'Indicateurs',
    colonnePrevus: 'Prévus',
    colonneSaisie: 'Saisie',
    colonneChangement: 'Dernier changement',
    /** Aucun ministère actif (7.1). */
    aucunMinistere: "Aucun ministère. Créez d'abord les ministères dans Ministères et comptes.",
    actionMinisteres: 'Ouvrir Ministères et comptes',
    /** Colonne « Prévus ». */
    creer: 'Créer',
    choisir: 'Choisir',
    crees: 'Créés',
    aucunPrevu: 'Aucun prévu',
    aChoisir: 'À choisir',
    /** Colonne « Saisie » : proposé. */
    saisieReguliere: 'Régulière',
    aucuneSaisieASuivre: 'Rien à suivre',
    /** Colonne « Dernier changement » d'un ministère sans geste de configuration : proposé. */
    aucunChangement: 'Aucun',
  },
  ministere: {
    retour: 'Tous les indicateurs',
    /** Titre du bloc des prévus (7.2). */
    titrePrevus: 'Prévus par la coordination',
    choixModele: 'Choisir dans la liste de la coordination',
    choixModelePlaceholder: 'Choisissez un ministère de la liste',
    /** Dernier choix de la liste (7.2). */
    aucunPrevu: 'Aucun prévu',
    /** Proposé : le choix « Aucun prévu » est retenu. */
    aucunPrevuExplication:
      'Aucun indicateur prévu pour ce ministère. Il saisit les chiffres communs.',
    boutonAucunPrevu: 'Enregistrer : aucun prévu',
    titreRetires: 'Retirés',
    /** Le lien d'un ajout à valider vers le bloc de l'écran Indicateurs (7.2). */
    voirAValider: 'Voir dans À valider',
    /** Proposé : mention d'un calcul, qui ne se saisit pas. */
    calculSansSaisie: 'Se calcule tout seul',
    aucunRetire: 'Aucun indicateur retiré.',
  },
  /** Erreurs de page (LISEZMOI, « États »). */
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
  /** Ministère inconnu ou désactivé, aucune requête de plus. */
  introuvable: "Ce ministère n'existe pas ou n'est plus actif.",
  revenir: 'Revenir aux indicateurs',
} as const

/** État vide d'un ministère sans indicateur suivi (7.2, LISEZMOI « États »). */
export function aucunIndicateurPour(nomMinistere: string): string {
  return `Aucun indicateur pour ${nomMinistere}. Il saisit les chiffres communs.`
}

/** « Créer ces 6 indicateurs » : le bouton du bloc « Prévus par la coordination » (7.2). */
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

/** Introduction de la liste des prévus (7.2) : « Liste « Kumi » de la coordination : 12 indicateurs à créer. » Proposé. */
export function introPrevus(nomModele: string, n: number): string {
  return `Liste « ${nomModele} » de la coordination : ${nombre(n)} ${accorder(n, 'indicateur', 'indicateurs')} à créer.`
}

/** Messages de réussite (7.2 et 7.7), annoncés pendant 6 secondes. */
export function reussiteCreationPrevus(n: number, nomMinistere: string): string {
  if (n === 0) return `Aucun indicateur prévu à créer pour ${nomMinistere}.`
  return `${nombre(n)} ${accorder(n, 'indicateur prévu créé', 'indicateurs prévus créés')}.`
}

/** Proposé : la réponse « Aucun prévu » est enregistrée. */
export function reussiteAucunPrevu(nomMinistere: string): string {
  return `Noté : aucun indicateur prévu pour ${nomMinistere}.`
}
