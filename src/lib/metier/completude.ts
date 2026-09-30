// Complétude d'un total (BRIEF.md section 3, règles 3 et 13 ; CLAUDE.md : « Tout total agrégé
// s'affiche avec sa complétude »).
//
// Les nombres viennent des vues (`nb_saisis`, `nb_attendus`, `nb_actifs`, `nb_ministeres`,
// `nb_plus_de_30_jours`, `manquants`) : ce module ne recompte rien, il met en forme.

import { accorder, nombre, trierNoms } from './texte'

export interface Completude {
  saisis: number
  attendus: number
  /** Ministères attendus qui n'ont pas saisi (jamais négatif). */
  manquants: number
  /** Vrai si au moins un ministère est attendu et que tous ont saisi. */
  complet: boolean
  /** « 6 sur 8 » */
  libelle: string
  /** « 6/8 ministères » */
  libelleMinisteres: string
}

function verifierCompte(valeur: number, nom: string): void {
  if (!Number.isInteger(valeur) || valeur < 0) {
    throw new RangeError(`${nom} doit être un entier positif ou nul : ${valeur}`)
  }
}

/** « 6 sur 8 » */
export function libelleCompletude(saisis: number, attendus: number): string {
  verifierCompte(saisis, 'saisis')
  verifierCompte(attendus, 'attendus')
  return `${nombre(saisis)} sur ${nombre(attendus)}`
}

/** « 6/8 ministères », « 1/1 ministère » */
export function libelleCompletudeMinisteres(saisis: number, attendus: number): string {
  verifierCompte(saisis, 'saisis')
  verifierCompte(attendus, 'attendus')
  return `${nombre(saisis)}/${nombre(attendus)} ${accorder(attendus, 'ministère', 'ministères')}`
}

/**
 * Complétude d'un total. Aucun ministère attendu (0 sur 0) n'est pas « complet » : il n'y a rien
 * à additionner, l'interface affiche « 0 sur 0 » sans marque de total complet.
 */
export function completude(saisis: number, attendus: number): Completude {
  return {
    saisis,
    attendus,
    libelle: libelleCompletude(saisis, attendus),
    libelleMinisteres: libelleCompletudeMinisteres(saisis, attendus),
    manquants: Math.max(0, attendus - saisis),
    complet: attendus > 0 && saisis >= attendus,
  }
}

/**
 * « Manquent : Coordination, Intégration », « Manque : Intégration » (liste des sessions, 14).
 * `null` si personne ne manque. Noms dans l'ordre alphabétique français.
 */
export function libelleManquants(noms: readonly string[]): string | null {
  if (noms.length === 0) return null
  return `${accorder(noms.length, 'Manque', 'Manquent')} : ${trierNoms(noms).join(', ')}`
}

/** Indicateur « à ce jour » : date affichée et signal des valeurs de plus de 30 jours (règle 13). */
export interface DateAceJour {
  /** « À ce jour », ou « À ce jour, 1 valeur de plus de 30 jours » */
  libelle: string
  /** Vrai s'il faut l'afficher en orange (`--attention`), toujours avec le texte. */
  attention: boolean
}

export function libelleAceJour(nbPlusDe30Jours: number): DateAceJour {
  verifierCompte(nbPlusDe30Jours, 'nbPlusDe30Jours')
  if (nbPlusDe30Jours === 0) return { libelle: 'À ce jour', attention: false }
  const valeurs = accorder(nbPlusDe30Jours, 'valeur', 'valeurs')
  return {
    libelle: `À ce jour, ${nombre(nbPlusDe30Jours)} ${valeurs} de plus de 30 jours`,
    attention: true,
  }
}

/** Complétude de la carte des FIJ : départements qui ont une valeur (« 8 dép. »). */
export function libelleDepartements(nbDepartements: number): string {
  verifierCompte(nbDepartements, 'nbDepartements')
  return `${nombre(nbDepartements)} dép.`
}
