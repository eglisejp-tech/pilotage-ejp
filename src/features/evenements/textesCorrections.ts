// Textes des corrections d'un événement (T78, lot 1 ; docs/conception/calendrier-evenements.md,
// section 8.2, « Proposé » validé le 26 octobre 2026) : corriger le nom, modifier les mentions,
// retirer un événement créé par erreur, dans le panneau `/saisir/evenement/:id`. Les refus de la
// base passent par la table de traduction (`src/data/messagesBase.ts`). « Proposé » : texte que la
// conception ne donnait pas.

import { formaterJourCourt } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

export const TEXTES_CORRECTIONS = {
  /** Lien sous le nom, et titre de sa fenêtre. */
  corrigerNom: 'Corriger le nom',
  boutonNom: 'Enregistrer le nom',
  reussiteNom: 'Nom corrigé.',
  /** « Enregistrer le nom » sans rien changer (Proposé, sur le modèle de m155) : rien ne part. */
  nomDejaEnregistre: 'Ce nom est déjà enregistré. Modifiez-le pour le corriger.',

  /** Bouton de la ligne des mentions, et titre de sa fenêtre (modèle de T54). */
  modifierMentions: 'Modifier les mentions',
  libelleMentions: 'Ministères mentionnés',
  /** Sous les cases (Proposé, sur le modèle de T54) : ce que voit un ministère ajouté ou retiré. */
  noteMentions: 'Un ministère mentionné voit cet événement. Un ministère retiré ne le voit plus.',
  boutonMentions: 'Enregistrer les mentions',
  reussiteMentions: 'Mentions enregistrées.',
  mentionsDejaEnregistrees: 'Ces mentions sont déjà enregistrées. Cochez ou décochez un ministère.',
  /** À la place du bouton, après la date de l'événement : l'action reste visible avec sa raison. */
  mentionsFigees: "Les mentions ne changent plus : la date de l'événement est passée.",

  /** Bouton discret en bas du panneau, et bouton d'action de la fenêtre. */
  retirer: "Retirer l'événement",
  titreRetrait: 'Retirer cet événement ?',
  texteRetrait:
    "Il sort du calendrier et des comptages, chez vous et chez les ministères mentionnés. Il reste au journal. Ce retrait est définitif. Pour un événement qui n'aura pas lieu, choisissez plutôt le statut Annulé.",
  /** La même fenêtre pour EJP Tech (Proposé) : il ne porte pas l'événement, il ne choisit pas son statut. */
  texteRetraitEjpTech:
    'Il sort du calendrier et des comptages, chez le ministère qui le porte et chez les ministères mentionnés. Il reste au journal. Ce retrait est définitif.',
  garder: "Garder l'événement",
  retraitEnCours: 'Retrait en cours',
  reussiteRetrait: 'Événement retiré du calendrier.',
  /** À la place du bouton, après la date, pour le porteur : la raison et le lien de signalement. */
  retraitPasse:
    "Un événement passé se retire par EJP Tech. S'il a été créé par erreur, signalez-le.",

  enCours: 'Enregistrement en cours',
  annuler: 'Annuler',

  /** Titre du panneau ouvert par EJP Tech (Proposé) : il lit l'événement et peut le retirer. */
  titreConsultation: 'Événement',
  libelleDate: 'Date',
  libelleStatut: 'Statut',
  libellePorteur: 'Ministère',
  /** Action des états du panneau d'EJP Tech, qui n'a pas de fiche (Proposé). */
  revenirMinisteres: 'Revenir aux ministères',
} as const

/** Le point final, sauf après un mois abrégé qui le porte déjà (« le 26 oct. », « le 2 mars. »). */
function finDePhrase(texte: string): string {
  return texte.endsWith('.') ? texte : `${texte}.`
}

/** « Ancien nom : Soirée de lounge, corrigé le 26 oct. » */
export function ligneAncienNom(ancien: string, corrigeLe: DateIso | null): string {
  return corrigeLe === null
    ? finDePhrase(`Ancien nom : ${ancien}`)
    : finDePhrase(`Ancien nom : ${ancien}, corrigé le ${formaterJourCourt(corrigeLe)}`)
}

/** « Cet événement a été retiré le 26 oct. » (panneau ouvert par un ancien lien). */
export function ligneRetireLe(jour: DateIso | null): string {
  return jour === null
    ? 'Cet événement a été retiré.'
    : finDePhrase(`Cet événement a été retiré le ${formaterJourCourt(jour)}`)
}
