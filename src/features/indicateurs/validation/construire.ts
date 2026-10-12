// Lignes du bloc « À valider » (lot L4 ; validation-metier.md, 5.1), construites à partir de ce que
// la base rend. Les jours d'attente viennent de la base (heure de Paris) ; l'écran ne compte rien.
// L'administration de l'église lit l'attente sans « Pourquoi » : sa ligne n'en porte jamais.

import type { AttenteAdministration, DecisionRecente } from '@/data/validationIndicateurs'
import {
  estEnRetard,
  texteAttente,
  texteDecision,
  texteEnvoyeLe,
} from '@/features/indicateurs/validation/textes'
import type { LigneVue, NatureIndicateur } from '@/lib/base'
import { libelleRythme } from '@/lib/metier/indicateurs'

/** Une ligne du bloc : l'ajout d'un ministère qui attend EJP Tech. */
export interface LigneAValider {
  /** Identifiant de la demande (EJP Tech, qui décide) ou de l'indicateur (administration). */
  id: string
  ministere: string
  libelle: string
  definition: string
  /** « chaque mois » : le rythme dans la phrase « Nouvel indicateur : « X » (chaque mois) ». */
  rythme: string
  nature: NatureIndicateur
  /** « Envoyé le 2 oct. » ; le jour de Paris de l'envoi. */
  envoyeLe: string
  /** « depuis 3 jours » ; null si la base ne donne aucune durée. */
  depuis: string | null
  /** Plus de 7 jours d'attente : « en retard », en orange avec le mot. */
  enRetard: boolean
  /** Le « Pourquoi », pour EJP Tech seulement ; null pour l'administration. */
  pourquoi: string | null
  /** « 2 valeurs déjà saisies », pour EJP Tech seulement ; null sinon. */
  nbValeurs: number | null
}

/** Une décision de la liste repliée « Décidées ces 30 derniers jours ». */
export interface LigneDecidee {
  id: string
  ministere: string
  libelle: string
  /** « Validée le 8 oct. », « Refusée le 8 oct. ». */
  texte: string
  decision: 'valide' | 'refuse'
  /** Le motif d'un refus, en citation ; null pour une validation. */
  motif: string | null
}

function rythmeEnPhrase(nature: NatureIndicateur): string {
  const libelle = libelleRythme(nature)
  return libelle.charAt(0).toLowerCase() + libelle.slice(1)
}

/**
 * Lignes de la file d'EJP Tech : les ajouts (une correction du nom ne se décide pas encore : le
 * lot 2 de la configuration l'apporte), du plus ancien au plus récent.
 */
export function construireLignesEjpTech(
  demandes: readonly LigneVue<'v_a_valider'>[],
): LigneAValider[] {
  return demandes
    .filter((demande) => demande.objet === 'ajout')
    .toSorted((a, b) => a.saisi_le.localeCompare(b.saisi_le))
    .map((demande) => ({
      id: demande.demande_id,
      ministere: demande.ministere_nom,
      libelle: demande.libelle_actuel ?? demande.libelle_envoye,
      definition: demande.definition,
      rythme: rythmeEnPhrase(demande.nature),
      nature: demande.nature,
      envoyeLe: texteEnvoyeLe(demande.saisi_le),
      depuis: texteAttente(demande.attente_jours),
      enRetard: demande.en_retard || estEnRetard(demande.attente_jours),
      pourquoi: demande.pourquoi,
      nbValeurs: demande.nb_valeurs,
    }))
}

/** Lignes lues par l'administration : la même attente, sans « Pourquoi » ni nombre de valeurs. */
export function construireLignesAdministration(
  attentes: readonly AttenteAdministration[],
): LigneAValider[] {
  return attentes
    .toSorted((a, b) => a.cree_le.localeCompare(b.cree_le))
    .map((attente) => ({
      id: attente.indicateur_id,
      ministere: attente.ministere_nom,
      libelle: attente.libelle,
      definition: attente.definition,
      rythme: rythmeEnPhrase(attente.nature),
      nature: attente.nature,
      envoyeLe: texteEnvoyeLe(attente.cree_le),
      depuis: attente.attente_jours === null ? null : texteAttente(attente.attente_jours),
      enRetard: estEnRetard(attente.attente_jours),
      pourquoi: null,
      nbValeurs: null,
    }))
}

/** Décisions des 30 derniers jours, de la plus récente à la plus ancienne. */
export function construireDecidees(decisions: readonly DecisionRecente[]): LigneDecidee[] {
  return decisions
    .toSorted((a, b) => b.saisi_le.localeCompare(a.saisi_le))
    .map((decision) => ({
      id: decision.validation_id,
      ministere: decision.ministere_nom,
      libelle: decision.libelle,
      texte: texteDecision(decision.decision, decision.saisi_le),
      decision: decision.decision,
      motif: decision.decision === 'refuse' ? decision.motif : null,
    }))
}
