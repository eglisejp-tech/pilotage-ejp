// Phrases de la configuration des indicateurs (configuration-indicateurs.md, 7.1 et 7.2). Chaque
// phrase se lit sans tableau, compte ce que la base a donné et ne cite jamais un texte écrit par
// un ministère (voix active, aucun tiret cadratin).

import type { TypeCompte } from '@/lib/base'
import { accorder, nombre } from '@/lib/metier/texte'

/**
 * Limite de lignes d'une fiche : saisis et calculs, prévus compris (`limites_indicateurs`,
 * `lignes_max`). La base reste l'autorité ; l'écran de la liste ne la relit pas fiche par fiche.
 */
export const LIGNES_MAX = 30

/** Au-delà de ce nombre de jours, l'administration prévient EJP Tech (7.1). */
export const ATTENTE_LONGUE_JOURS = 7

export interface ComptesEglise {
  /** Indicateurs actifs de tous les ministères, calculs compris. */
  actifs: number
  /** Ministères actifs. */
  ministeres: number
  /** Ajouts qui attendent la validation d'EJP Tech. */
  enAttente: number
  /** Dont ceux qui attendent depuis plus de 7 jours. */
  enAttenteLongue: number
}

/**
 * Phrases de l'écran Indicateurs (revues par T66, t319 à t322 et m222, m223) : « 94 indicateurs
 * actifs pour 22 ministères. » (le détail par ministère est dans le tableau), puis, s'il y a lieu,
 * l'attente des ajouts sans dire qui valide. L'administration lit « 1 indicateur attend sa
 * validation. » et, au-delà de 7 jours, la même phrase complétée : « 1 indicateur attend sa
 * validation depuis plus de 7 jours. Prévenez EJP Tech. » (ou « 3 indicateurs attendent leur
 * validation, dont 1 depuis plus de 7 jours. Prévenez EJP Tech. »). EJP Tech, qui valide dans le
 * bloc « À valider », lit « 1 indicateur à valider. ».
 */
export function phrasesEglise(comptes: ComptesEglise, profil: TypeCompte): string[] {
  const phrases = [
    `${nombre(comptes.actifs)} ${accorder(comptes.actifs, 'indicateur actif', 'indicateurs actifs')} pour ${nombre(comptes.ministeres)} ${accorder(comptes.ministeres, 'ministère', 'ministères')}.`,
  ]
  if (comptes.enAttente > 0) {
    const n = nombre(comptes.enAttente)
    if (profil === 'admin_plateforme') {
      phrases.push(`${n} ${accorder(comptes.enAttente, 'indicateur', 'indicateurs')} à valider.`)
      return phrases
    }
    const debut = `${n} ${accorder(comptes.enAttente, 'indicateur attend sa', 'indicateurs attendent leur')} validation`
    const prevenir = profil === 'admin_eglise' && comptes.enAttenteLongue > 0
    // Une seule phrase : l'attente longue la complète, elle ne s'écrit pas à part.
    const longue =
      comptes.enAttenteLongue >= comptes.enAttente
        ? ` depuis plus de ${ATTENTE_LONGUE_JOURS} jours`
        : `, dont ${nombre(comptes.enAttenteLongue)} depuis plus de ${ATTENTE_LONGUE_JOURS} jours`
    phrases.push(prevenir ? `${debut}${longue}. Prévenez EJP Tech.` : `${debut}.`)
  }
  return phrases
}

/**
 * Phrase d'un ministère : « 7 indicateurs suivis. » (T66, t329 ; guide, exemple 16 : le détail
 * reste dans le tableau). `null` quand il ne suit aucun indicateur : l'état vide parle à la place.
 */
export function phraseMinistere(suivis: number): string | null {
  if (suivis === 0) return null
  return `${nombre(suivis)} ${accorder(suivis, 'indicateur suivi', 'indicateurs suivis')}.`
}

/** « 8 sur 30 » : la colonne « Indicateurs » du tableau (T66, t325). */
export function texteIndicateursMinistere(suivis: number): string {
  return `${nombre(suivis)} sur ${nombre(LIGNES_MAX)}`
}

/** « de Kumi », « d'Intégration » : l'élision du nom d'un ministère dans un titre. */
export function deMinistere(nom: string): string {
  return /^[aeiouyàâäéèêëîïôöûü]/i.test(nom) ? `d'${nom}` : `de ${nom}`
}

/** « depuis 2 jours », « depuis aujourd'hui » : l'attente d'un ajout à valider (heure de Paris). */
export function texteDepuisJours(jours: number): string {
  if (jours <= 0) return "depuis aujourd'hui"
  return `depuis ${nombre(jours)} ${accorder(jours, 'jour', 'jours')}`
}
