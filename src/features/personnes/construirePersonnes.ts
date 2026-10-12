// L'onglet « Personnes » en mots (T56) : les personnes actives sur 30 jours rangées par compte,
// les dernières connexions en phrases, le nombre de prénoms de plus de 12 mois. Les dates sont à
// l'heure de Paris ; les compteurs viennent de la base (`v_personnes`), jamais de la date du
// navigateur.

import type { Connexion, Personne } from '@/data/personnes'
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

/**
 * Les personnes qui ont utilisé l'outil depuis 30 jours (une connexion, un jour d'utilisation ou
 * une action), par compte (libellé dans l'ordre alphabétique), la plus récemment active d'abord.
 */
export function personnesActives(personnes: readonly Personne[]): CompteAffiche[] {
  const comptes = new Map<string, CompteAffiche>()
  const actives = personnes
    .filter((p) => p.connexions_30_jours + p.jours_30_jours + p.actions_30_jours > 0)
    .toSorted((a, b) => b.derniere_activite.localeCompare(a.derniere_activite))
  for (const personne of actives) {
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
    })
    comptes.set(personne.compte, groupe)
  }
  return [...comptes.values()].toSorted((a, b) => comparerNoms(a.libelle, b.libelle))
}

/** Déclarations de plus de 12 mois dont le prénom n'est pas encore effacé. */
export function nombreAEffacer(personnes: readonly Personne[]): number {
  return personnes.reduce((total, p) => total + p.declarations_anciennes, 0)
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
