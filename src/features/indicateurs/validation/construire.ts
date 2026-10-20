// Lignes du bloc « À valider » (lot L4 ; validation-metier.md, 5.1), construites à partir de ce que
// la base rend. Les jours d'attente viennent de la base (heure de Paris) ; l'écran ne compte rien.
// L'administration de l'église lit l'attente sans « Pourquoi » : sa ligne n'en porte jamais.

import type {
  IndicateurConfiguration,
  LigneUsage,
  MinistereConfiguration,
} from '@/data/indicateursConfiguration'
import type {
  AttenteAdministration,
  DecisionRecente,
  RetraitRecent,
} from '@/data/validationIndicateurs'
import {
  estEnRetard,
  texteAttente,
  texteDecision,
  texteEnvoyeLe,
  texteRetraitMinistere,
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

/**
 * Les ajouts qui attendent EJP Tech, tels que l'administration les lit : les définitions
 * (`indicateur`), le nom des ministères et les jours d'attente (`v_usage_indicateurs`, jamais une
 * valeur). Ce sont les trois lectures de l'écran Indicateurs (L3a), lues une seule fois pour le
 * tableau et pour ce bloc. Jamais un « Pourquoi » : la base ne le rend pas à l'administration.
 */
export function construireAttentesAdministration(
  indicateurs: readonly IndicateurConfiguration[],
  ministeres: readonly MinistereConfiguration[],
  usage: readonly LigneUsage[],
): AttenteAdministration[] {
  const noms = new Map(ministeres.map((ministere) => [ministere.id, ministere.nom]))
  const jours = new Map(usage.map((ligne) => [ligne.indicateur_id, ligne.attente_jours]))
  return indicateurs.flatMap((indicateur) =>
    indicateur.etat !== 'en_attente' || indicateur.ministere_id === null
      ? []
      : [
          {
            indicateur_id: indicateur.id,
            ministere_id: indicateur.ministere_id,
            ministere_nom: noms.get(indicateur.ministere_id) ?? '',
            libelle: indicateur.libelle,
            definition: indicateur.definition,
            nature: indicateur.nature,
            cree_le: indicateur.cree_le,
            attente_jours: jours.get(indicateur.id) ?? null,
          },
        ],
  )
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

/** Un retrait de la liste repliée « Retirés par les ministères ces 30 derniers jours » (T62). */
export interface LigneRetraitMinistere {
  /** Identifiant du retrait (`retrait_indicateur.id`), cible du masquage de son motif. */
  id: string
  ministere: string
  libelle: string
  /** « Demande retirée le 14 oct. », « Retiré le 14 oct. ». */
  texte: string
  /** Le motif écrit par le ministère, ou le texte de masquage. */
  motif: string
  /**
   * Une demande retirée avant la décision : son « Pourquoi » (ou le texte de masquage) et
   * l'identifiant de la demande, cible de son masquage. Elle a quitté la file : c'est ici qu'EJP
   * Tech peut encore le masquer. Null pour un ajout validé.
   */
  pourquoi: { demandeId: string; texte: string } | null
}

/** Retraits des ministères des 30 derniers jours, du plus récent au plus ancien (T62). */
export function construireRetraitsMinisteres(
  retraits: readonly RetraitRecent[],
): LigneRetraitMinistere[] {
  return retraits
    .toSorted((a, b) => b.saisi_le.localeCompare(a.saisi_le))
    .map((retrait) => ({
      id: retrait.retrait_id,
      ministere: retrait.ministere_nom,
      libelle: retrait.libelle,
      texte: texteRetraitMinistere(retrait.etat_avant === 'en_attente', retrait.saisi_le),
      motif: retrait.motif,
      pourquoi:
        retrait.demande === null
          ? null
          : { demandeId: retrait.demande.id, texte: retrait.demande.pourquoi },
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
