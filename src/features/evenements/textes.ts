// Textes des saisies d'événement et de réunion (maquette 11 et panneaux dérivés ; BRIEF section 9 ;
// docs/plan-etape-4.md, E5 ; docs/conception/validation-metier.md, 4.5). Les aides en bulle sont
// dans `src/components/aide/textesAide.ts`, les messages de date refusée et le lien « Signaler une
// difficulté » dans `src/features/signalement/textes.ts` : ils ne sont pas réécrits ici. Les
// messages de la base sont repris tels quels (docs/conception/contrat-etape-4.md, section 7).
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

/** Messages repris tels quels de la base (contrat de l'étape 4, section 7 ; T37). */
export const MESSAGES_BASE = {
  datePasseeAjout: 'La date ne peut pas être passée.',
  datePasseeMiseAJour: "La nouvelle date doit être aujourd'hui ou plus tard.",
  ligneIdentique: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
  /** Refus de droit (42501), commun à toutes les fonctions de l'API. */
  acces: "Cet élément n'existe pas ou vous n'y avez pas accès.",
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
  /** Texte visible sous le statut (maquette 11), à l'ajout comme à la mise à jour. */
  noteStatut: "La validation se fait en dehors de l'outil. Ici, on reporte seulement le statut.",
  /** Note sous les mentions (BRIEF section 9, T32). */
  noteMentions: 'Le ministère mentionné verra cet événement, et seulement cet événement.',
  /** Texte visible sous les mentions (aides-contextuelles.md, section 8 ; proposé). */
  mentionsFigees: 'Les mentions se choisissent à la création et ne changent plus.',
  /** Aucun ministère à cocher (plan de l'étape 4, E5). */
  aucuneMention: 'Aucun autre ministère actif à mentionner.',
  /** Mise à jour d'un événement sans mention (proposé). */
  sansMention: 'Aucun ministère mentionné.',
  /** Ligne au-dessus du statut, pour un événement à confirmer (validation-metier.md, 4.4). */
  aConfirmer:
    "Cet événement attend toujours sa validation. Validé en dehors de l'outil ? Choisissez « Validé ». Reporté ou annulé ? Changez la date ou choisissez « Annulé ».",
  boutonAjout: 'Ajouter au calendrier',
  boutonMiseAJour: 'Enregistrer la mise à jour',
  boutonEnCours: 'Envoi en cours',
  reussiteAjout: 'Événement ajouté au calendrier.',
  /** Proposé (plan de l'étape 4, E5). */
  reussiteMiseAJour: 'Événement mis à jour.',
  /** Validation avant l'envoi, sous le champ (proposés, sur le modèle des messages de la base). */
  erreurDateVide: 'Choisissez une date.',
  erreurNomVide: "Donnez un nom à l'événement.",
  erreurNomLong: "Le nom de l'événement fait 80 caractères au plus.",
  erreurStatut: 'Choisissez un statut.',
  erreurMention: 'Ce ministère ne peut pas être mentionné.',
  /** États de la mise à jour (plan de l'étape 4, E5). */
  introuvable: "Cet événement n'existe pas ou vous n'y avez pas accès.",
  revenirFiche: 'Revenir à ma fiche',
} as const

/** « Seul Communication met à jour cet événement. » : un ministère mentionné n'y touche pas. */
export function seulPorteur(nomPorteur: string): string {
  return `Seul ${nomPorteur} met à jour cet événement.`
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
  boutonEnCours: 'Envoi en cours',
  reussite: 'Réunion enregistrée.',
  erreurDateVide: 'Choisissez une date.',
  /** Date passée (proposé, sur le modèle du message de l'ajout d'un événement). */
  erreurDatePassee: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
  erreurHeure: 'Saisissez une heure, par exemple 20 h 00.',
  erreurObjetLong: "L'objet fait 80 caractères au plus.",
  erreurDecisionLongue: 'La décision attendue fait 80 caractères au plus.',
} as const

/** Longueur d'un nom d'événement, d'un objet ou d'une décision attendue (BRIEF, règle 9). */
export const LONGUEUR_MAX_COURT = 80

/** Le compteur paraît à partir de 60 caractères (LISEZMOI, « Validation »). */
export const DEBUT_COMPTEUR = 60
