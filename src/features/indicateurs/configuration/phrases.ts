// Phrases de la configuration des indicateurs (configuration-indicateurs.md, 7.1 et 7.2). Chaque
// phrase se lit sans tableau, compte ce que la base a donné et ne cite jamais un texte écrit par
// un ministère (voix active, aucun tiret cadratin).

import type { TypeCompte } from '@/lib/base'
import { accorder, listeNoms, nombre, terminerPhrase } from '@/lib/metier/texte'

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
  /** Indicateurs actifs ajoutés par un ministère. */
  ajoutesParMinisteres: number
  /** Ajouts qui attendent la validation d'EJP Tech. */
  enAttente: number
  /** Dont ceux qui attendent depuis plus de 7 jours. */
  enAttenteLongue: number
}

/**
 * Phrases de l'écran Indicateurs : « 94 indicateurs actifs pour 22 ministères, dont 7 ajoutés par
 * les ministères. », puis, s'il y a lieu, « 1 ajout attend la validation d'EJP Tech. ». Pour
 * l'administration seulement et au-delà de 7 jours, la même phrase se complète : « 1 ajout attend la
 * validation d'EJP Tech, depuis plus de 7 jours. Prévenez EJP Tech. » (ou « 3 ajouts attendent la
 * validation d'EJP Tech, dont 1 depuis plus de 7 jours. Prévenez EJP Tech. »). EJP Tech décide dans
 * le bloc « À valider » : il ne reçoit pas ce rappel.
 */
export function phrasesEglise(comptes: ComptesEglise, profil: TypeCompte): string[] {
  const dont =
    comptes.ajoutesParMinisteres > 0
      ? `, dont ${nombre(comptes.ajoutesParMinisteres)} ${accorder(comptes.ajoutesParMinisteres, 'ajouté', 'ajoutés')} par les ministères`
      : ''
  const phrases = [
    `${nombre(comptes.actifs)} ${accorder(comptes.actifs, 'indicateur actif', 'indicateurs actifs')} pour ${nombre(comptes.ministeres)} ${accorder(comptes.ministeres, 'ministère', 'ministères')}${dont}.`,
  ]
  if (comptes.enAttente > 0) {
    const debut = `${nombre(comptes.enAttente)} ${accorder(comptes.enAttente, 'ajout attend', 'ajouts attendent')} la validation d'EJP Tech`
    const prevenir = profil === 'admin_eglise' && comptes.enAttenteLongue > 0
    // Une seule phrase : l'attente longue la complète, elle ne s'écrit pas à part.
    const longue =
      comptes.enAttenteLongue >= comptes.enAttente
        ? `, depuis plus de ${ATTENTE_LONGUE_JOURS} jours`
        : `, dont ${nombre(comptes.enAttenteLongue)} depuis plus de ${ATTENTE_LONGUE_JOURS} jours`
    phrases.push(prevenir ? `${debut}${longue}. Prévenez EJP Tech.` : `${debut}.`)
  }
  return phrases
}

export interface ComptesMinistere {
  nom: string
  /** Indicateurs suivis : actifs ou à valider, calculs compris. */
  suivis: number
  /** Dont les prévus de la coordination. */
  prevus: number
  /** Dont ajoutés par le ministère (suggestions comprises). */
  ajoutesParLeMinistere: number
  /** Dont ajoutés par l'administration ou EJP Tech, hors prévus. */
  ajoutesParLEglise: number
}

/**
 * Phrase d'un ministère : « Kumi suit 7 indicateurs sur 30 au plus : 6 prévus par la coordination
 * et 1 ajouté par Kumi. » (un ajout de l'église se dit « ajouté par l'administration de l'église ou
 * EJP Tech »). `null` quand il ne suit aucun indicateur : l'état vide parle à la place.
 */
export function phraseMinistere(comptes: ComptesMinistere): string | null {
  if (comptes.suivis === 0) return null
  const parties: string[] = []
  if (comptes.prevus > 0) {
    parties.push(
      `${nombre(comptes.prevus)} ${accorder(comptes.prevus, 'prévu', 'prévus')} par la coordination`,
    )
  }
  if (comptes.ajoutesParLeMinistere > 0) {
    parties.push(
      `${nombre(comptes.ajoutesParLeMinistere)} ${accorder(comptes.ajoutesParLeMinistere, 'ajouté', 'ajoutés')} par ${comptes.nom}`,
    )
  }
  if (comptes.ajoutesParLEglise > 0) {
    parties.push(
      `${nombre(comptes.ajoutesParLEglise)} ${accorder(comptes.ajoutesParLEglise, 'ajouté', 'ajoutés')} par l'administration de l'église ou EJP Tech`,
    )
  }
  const detail = parties.length > 0 ? ` : ${listeNoms(parties)}` : ''
  return terminerPhrase(
    `${comptes.nom} suit ${nombre(comptes.suivis)} ${accorder(comptes.suivis, 'indicateur', 'indicateurs')} sur ${nombre(LIGNES_MAX)} au plus${detail}`,
  )
}

/** « 8 sur 30, dont 1 ajouté par Kumi » : la colonne « Indicateurs » du tableau. */
export function texteIndicateursMinistere(
  nom: string,
  suivis: number,
  ajoutesParLeMinistere: number,
): string {
  const dont =
    ajoutesParLeMinistere > 0
      ? `, dont ${nombre(ajoutesParLeMinistere)} ${accorder(ajoutesParLeMinistere, 'ajouté', 'ajoutés')} par ${nom}`
      : ''
  return `${nombre(suivis)} sur ${nombre(LIGNES_MAX)}${dont}`
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
