// Textes des saisies d'événement et de réunion (maquette 11 et panneaux dérivés ; BRIEF section 9 ;
// docs/plan-etape-4.md, E5 ; docs/conception/validation-metier.md, 4.5). Les aides en bulle sont
// dans `src/components/aide/textesAide.ts`, les messages de date refusée et le lien « Signaler une
// difficulté » dans `src/features/signalement/textes.ts` : ils ne sont pas réécrits ici. Les
// messages de la base (docs/conception/contrat-etape-4.md, section 7) passent par la table de
// traduction `src/data/messagesBase.ts` (T66).
// « Proposé » : texte que ni le BRIEF ni LISEZMOI ne donnent encore.

import type { StatutEvenement } from '@/lib/base'
import { formaterJourAbrege, formaterJourLong } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { listeNoms } from '@/lib/metier/texte'

/** Les statuts dans l'ordre de la maquette 11 (deux colonnes), avec leur libellé. */
export const STATUTS_EVENEMENT: readonly { valeur: StatutEvenement; libelle: string }[] = [
  { valeur: 'brouillon', libelle: 'Brouillon' },
  { valeur: 'attente_validation', libelle: 'En attente de validation' },
  { valeur: 'valide', libelle: 'Validé' },
  { valeur: 'preparation', libelle: 'En préparation' },
  { valeur: 'termine', libelle: 'Terminé' },
  { valeur: 'annule', libelle: 'Annulé' },
]

/** Libellé d'un statut (« En attente de validation »). */
export function libelleStatut(statut: StatutEvenement): string {
  return STATUTS_EVENEMENT.find((choix) => choix.valeur === statut)?.libelle ?? statut
}

/**
 * Textes de la base (contrat de l'étape 4, section 7 ; T37) : les clés de la table de traduction
 * (`src/data/messagesBase.ts`), que l'aperçu simule. Ils ne s'affichent pas tels quels.
 */
export const MESSAGES_BASE = {
  datePasseeAjout: 'La date ne peut pas être passée.',
  datePasseeMiseAJour: "La nouvelle date doit être aujourd'hui ou plus tard.",
  ligneIdentique: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
  /** Heure de début sur une date à venir (T68, E1) : la phrase se dit telle quelle. */
  heureDebutAVenir: "L'heure de début se saisit le jour de l'événement ou après.",
  /** Heure de début sans le statut Terminé (T68, E2). */
  heureDebutSansTermine: "L'heure de début se saisit pour un événement terminé.",
  /** Heure prévue hors de 0 h à 23 h 59 (T68, E3). */
  heurePrevueInvalide: "L'heure prévue est invalide.",
} as const

export const TEXTES_EVENEMENT = {
  titreAjout: 'Ajouter un événement',
  titreMiseAJour: "Mettre à jour l'événement",
  libelleDate: 'Date',
  libelleNom: "Nom de l'événement",
  libelleStatut: 'Statut',
  libelleMentions: 'Ministères mentionnés',
  /** Titre du groupe de cases : un champ facultatif le dit (LISEZMOI, « Validation »). */
  titreMentions: 'Ministères mentionnés (facultatif)',
  /** Note sous les mentions (BRIEF section 9, T32 ; texte revu par T66, t133). */
  noteMentions: 'Le ministère mentionné verra cet événement.',
  /** Sous les mentions de l'ajout : prévient avant d'agir (T66, t134). */
  mentionsFigees: 'Vous ne pourrez plus changer les mentions.',
  /** Aucun ministère à cocher (plan de l'étape 4, E5 ; T66, t135 : même texte que les points). */
  aucuneMention: 'Aucun autre ministère à mentionner.',
  /** Mise à jour d'un événement sans mention (proposé). */
  sansMention: 'Aucun ministère mentionné.',
  /** Ligne au-dessus du statut, pour un événement à confirmer (validation-metier.md, 4.4). */
  aConfirmer:
    'Cet événement attend toujours sa validation. Choisissez son nouveau statut ou changez sa date.',
  boutonAjout: 'Ajouter au calendrier',
  boutonMiseAJour: 'Enregistrer la mise à jour',
  /** « Enregistrement » quand on enregistre, « Envoi » quand quelque chose part (T66, t136). */
  boutonEnCours: 'Enregistrement en cours',
  reussiteAjout: 'Événement ajouté au calendrier.',
  /** Proposé (plan de l'étape 4, E5). */
  reussiteMiseAJour: 'Événement mis à jour.',
  /** Validation avant l'envoi, sous le champ (proposés, sur le modèle des messages de la base). */
  erreurDateVide: 'Choisissez une date.',
  erreurNomVide: "Donnez un nom à l'événement.",
  erreurNomLong: 'Raccourcissez le nom : 80 caractères au plus.',
  erreurStatut: 'Choisissez un statut.',
  /** Un ministère coché a été désactivé entre l'ouverture et l'envoi (T66, m124). */
  erreurMention: 'Un ministère coché a été désactivé. Décochez-le, puis réessayez.',
  /**
   * Heures de l'événement (T68), en minutes depuis minuit à l'heure de Paris. Libellés au
   * glossaire : « (facultatif) » pour un champ qui peut rester vide.
   */
  libelleHeurePrevue: 'Heure prévue (facultatif)',
  libelleHeureDebut: 'Heure de début (facultatif)',
  /**
   * Indications visibles sous le champ, nécessaires pour bien remplir (guide, section 4 ;
   * aides-contextuelles.md, section 1) : un culte déclaré ici serait compté deux fois, et un
   * champ vidé garde l'heure enregistrée.
   */
  noteHeurePrevue: 'Les cultes du dimanche ne se déclarent pas ici.',
  noteHeureDebut: "Une heure enregistrée se corrige, elle ne s'efface pas.",
  /**
   * Annonce aux lecteurs d'écran, invisible, quand « Terminé » fait paraître le champ (le focus
   * reste sur « Terminé »).
   */
  annonceHeureDebut: 'Le champ « Heure de début » apparaît sous le statut.',
  /** Heure illisible (T68, E3) : même phrase avant l'envoi et après le refus de la base. */
  erreurHeure: 'Choisissez une heure valide.',
  /**
   * Heure de début sans Terminé (T68, E2) : contrôle de la couche data et traduction du refus de
   * la base. Une heure de début sur une date à venir (E1) garde la phrase de la base.
   */
  erreurHeureDebutSansTermine: "Choisissez « Terminé » pour indiquer l'heure de début.",
  /** États de la mise à jour (plan de l'étape 4, E5 ; T66, t143 : le bouton donne l'action). */
  introuvable: 'Cet événement est introuvable.',
  revenirFiche: 'Revenir à ma fiche',
} as const

/** « Seul Communication peut mettre à jour cet événement. » (T66, m133). */
export function seulPorteur(nomPorteur: string): string {
  return `Seul ${nomPorteur} peut mettre à jour cet événement.`
}

/** « Mentionnés : Coordination et Intégration. » (mise à jour, en lecture seule). */
export function ligneMentions(noms: readonly string[]): string {
  if (noms.length === 0) return TEXTES_EVENEMENT.sansMention
  return `${TEXTES_EVENEMENT.libelleMentions} : ${listeNoms(noms)}.`
}

/** « sam. 10 oct. » : jour abrégé dans une phrase. */
function jourDansLaPhrase(date: DateIso): string {
  const abrege = formaterJourAbrege(date)
  return abrege.charAt(0).toLowerCase() + abrege.slice(1)
}

/** « Report : du sam. 10 oct. au sam. 17 oct. » (plan de l'étape 4, E5). */
export function ligneReport(ancienne: DateIso, nouvelle: DateIso): string {
  return `Report : du ${jourDansLaPhrase(ancienne)} au ${jourDansLaPhrase(nouvelle)}`
}

/** « samedi 10 octobre 2026 » : la date choisie en toutes lettres, sous le champ (maquette 11). */
export function dateEnToutesLettres(date: DateIso): string {
  return `${formaterJourLong(date)} ${date.slice(0, 4)}`
}

export const TEXTES_REUNION = {
  titre: 'Prochaine réunion',
  libelleDate: 'Date',
  libelleHeure: 'Heure (facultatif)',
  libelleObjet: 'Objet (facultatif)',
  libelleDecision: 'Décision attendue (facultatif)',
  bouton: 'Enregistrer la réunion',
  boutonEnCours: 'Enregistrement en cours',
  reussite: 'Réunion enregistrée.',
  erreurDateVide: 'Choisissez une date.',
  /** Date passée (proposé, sur le modèle du message de l'ajout d'un événement). */
  erreurDatePassee: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
  erreurHeure: 'Saisissez une heure, par exemple 20 h 00.',
  /** Forme commune d'un texte trop long (T66, t145 et t147). */
  erreurObjetLong: "Raccourcissez l'objet : 80 caractères au plus.",
  erreurDecisionLongue: 'Raccourcissez la décision attendue : 80 caractères au plus.',
  /** Second appui après une réussite, sans rien changer (m135, Proposé) : rien ne part. */
  dejaEnregistree: 'Cette réunion est déjà enregistrée. Changez une information pour la corriger.',
  /** Sous l'objet ou la décision qu'EJP Tech a masqué : le champ s'ouvre vide (m136, Proposé). */
  texteMasque: 'Votre texte précédent a été masqué.',
} as const

/** Longueur d'un nom d'événement, d'un objet ou d'une décision attendue (BRIEF, règle 9). */
export const LONGUEUR_MAX_COURT = 80

/** Le compteur paraît à partir de 60 caractères (LISEZMOI, « Validation »). */
export const DEBUT_COMPTEUR = 60
