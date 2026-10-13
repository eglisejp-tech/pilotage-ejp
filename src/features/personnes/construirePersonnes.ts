// L'onglet « Personnes » en mots (T56) : les personnes actives sur 30 jours rangées par compte,
// les prénoms sans activité depuis (encore effaçables), les dernières connexions en phrases, le
// nombre de prénoms de plus de 12 mois, et les conditions que chaque personne a acceptées (T61).
// Les dates sont à l'heure de Paris ; les compteurs viennent de la base (`v_personnes`), jamais de
// la date du navigateur.

import type { Connexion, Personne } from '@/data/personnes'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'
import { dateDeVersionConditions } from '@/lib/metier/dateConditions'
import { PRENOM_EFFACE } from '@/lib/metier/declaration'
import { TEXTES_PERSONNES } from '@/features/personnes/textes'
import {
  formaterHeure,
  formaterHorodatage,
  formaterJourAbrege,
  heureDeParis,
  jourDeParis,
} from '@/lib/metier/dates'
import { comparerNoms } from '@/lib/metier/texte'

/** Une personne d'un compte, prête à afficher. */
export interface PersonneAffichee {
  /** Dernière déclaration de la personne : celle qu'efface « Effacer ce prénom ». */
  intervenantId: number
  prenom: string
  /** Prénom déjà effacé : pas de bouton. */
  efface: boolean
  connexions: number
  jours: number
  actions: number
  /** « 11 oct., 11 h » (heure de Paris). */
  derniereActivite: string
  /** « Conditions du 12 octobre 2026 acceptées le 13 oct., 9 h. » (T61). */
  conditions: string
}

/**
 * Les conditions qu'une personne a acceptées (T61) : la dernière version et son heure, en disant
 * quand ce n'est pas la version en cours ; ou rien encore.
 */
export function conditionsDe(
  versionAcceptee: string | null,
  accepteeLe: string | null,
  versionCourante: string = VERSION_CONDITIONS,
): string {
  if (versionAcceptee === null || accepteeLe === null) return TEXTES_PERSONNES.conditionsAucune
  const version = dateDeVersionConditions(versionAcceptee)
  const quand = formaterHorodatage(accepteeLe)
  return versionAcceptee >= versionCourante
    ? TEXTES_PERSONNES.conditionsAcceptees(version, quand)
    : TEXTES_PERSONNES.conditionsAnciennes(version, quand, dateDeVersionConditions(versionCourante))
}

export interface CompteAffiche {
  compte: string
  /** « Ministère Communication ». */
  libelle: string
  personnes: PersonneAffichee[]
}

export interface ConnexionAffichee {
  id: number
  /** « Dim. 11 oct., 11 h : Ministère Communication, Marie D. » */
  texte: string
}

/** « Dim. 11 oct., 11 h » : jour abrégé et heure de Paris d'un instant. */
export function quandConnexion(instant: string): string {
  return `${formaterJourAbrege(jourDeParis(instant))}, ${formaterHeure(heureDeParis(instant))}`
}

/** Une connexion, un jour d'utilisation ou une action depuis 30 jours. */
function estActive(personne: Personne): boolean {
  return personne.connexions_30_jours + personne.jours_30_jours + personne.actions_30_jours > 0
}

/** Rangées par compte (libellé dans l'ordre alphabétique), la plus récemment active d'abord. */
function parCompte(personnes: readonly Personne[]): CompteAffiche[] {
  const comptes = new Map<string, CompteAffiche>()
  const triees = personnes.toSorted((a, b) =>
    b.derniere_activite.localeCompare(a.derniere_activite),
  )
  for (const personne of triees) {
    const groupe = comptes.get(personne.compte) ?? {
      compte: personne.compte,
      libelle: personne.compte_libelle,
      personnes: [],
    }
    groupe.personnes.push({
      intervenantId: personne.intervenant_id,
      prenom: personne.prenom,
      efface: personne.prenom === PRENOM_EFFACE,
      connexions: personne.connexions_30_jours,
      jours: personne.jours_30_jours,
      actions: personne.actions_30_jours,
      derniereActivite: formaterHorodatage(personne.derniere_activite),
      conditions: conditionsDe(personne.version_acceptee, personne.acceptee_le),
    })
    comptes.set(personne.compte, groupe)
  }
  return [...comptes.values()].toSorted((a, b) => comparerNoms(a.libelle, b.libelle))
}

/**
 * Les personnes qui ont utilisé l'outil depuis 30 jours (une connexion, un jour d'utilisation ou
 * une action), par compte (libellé dans l'ordre alphabétique), la plus récemment active d'abord.
 */
export function personnesActives(personnes: readonly Personne[]): CompteAffiche[] {
  return parCompte(personnes.filter(estActive))
}

/**
 * Les prénoms sans activité depuis 30 jours et pas encore effacés, rangés de même : une personne
 * qui demande l'effacement longtemps après sa dernière venue s'efface tout de suite.
 */
export function personnesSansActivite(personnes: readonly Personne[]): CompteAffiche[] {
  return parCompte(personnes.filter((p) => !estActive(p) && p.prenom !== PRENOM_EFFACE))
}

/**
 * Prénoms (un par compte) qui ont au moins une déclaration de plus de 12 mois pas encore effacée :
 * une personne déclarée chaque semaine depuis un an compte pour un, pas pour 52.
 */
export function nombreAEffacer(personnes: readonly Personne[]): number {
  return personnes.filter((p) => p.declarations_anciennes > 0).length
}

/** Chaque connexion en une phrase, avec le libellé de son compte. */
export function connexionsAffichees(
  connexions: readonly Connexion[],
  libelles: ReadonlyMap<string, string>,
): ConnexionAffichee[] {
  return connexions.map((connexion) => ({
    id: connexion.id,
    texte: TEXTES_PERSONNES.connexion(
      quandConnexion(connexion.declare_le),
      libelles.get(connexion.compte) ?? TEXTES_PERSONNES.compteInconnu,
      connexion.prenom,
    ),
  }))
}
