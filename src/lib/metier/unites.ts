// Unités des indicateurs et leur écriture (plan de l'étape 4, B1 et E1 ; BRIEF section 9,
// « Formats »). Une valeur est toujours un entier : « 14 », « 12 480 », « 5 164 € », « 10 h 42 »,
// « 3 jours ». L'heure se saisit en minutes depuis minuit (0 à 1439), sans unité « minutes ».
// Pour un indicateur sensible, la valeur 1 ou 2 se lit « moins de 3 » (seuil sans fuite, B2).

import type { UniteIndicateur } from '@/lib/base'
import { formaterHeure } from './dates'
import { accorder, ESPACE_FINE, nombre } from './texte'

/** Plafond de chaque unité (inclus), vérifié aussi par `private.controler_mesure`. */
export const PLAFOND_UNITE: Readonly<Record<UniteIndicateur, number>> = {
  nombre: 9999,
  grand_nombre: 9_999_999,
  euros: 9_999_999,
  heure: 1439,
  jours: 99_999,
}

/** Ce que voient le berger, le conseil et EJP Tech à la place de 1 ou 2 pour un sensible. */
export const MOINS_DE_3 = 'moins de 3'

/** Plafond de l'unité : la plus haute valeur qu'on peut saisir. */
export function plafondUnite(unite: UniteIndicateur): number {
  return PLAFOND_UNITE[unite]
}

/** Un entier de 0 au plafond de l'unité ? */
export function valeurPermise(valeur: number, unite: UniteIndicateur): boolean {
  return Number.isInteger(valeur) && valeur >= 0 && valeur <= PLAFOND_UNITE[unite]
}

/** Minutes depuis minuit en « 10 h 42 », « 8 h 05 », « 20 h » (heure de 0 à 1439). */
export function formaterHeureEnMinutes(minutes: number): string {
  if (!valeurPermise(minutes, 'heure'))
    throw new RangeError(`Heure invalide (0 à 1439) : ${minutes}`)
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  return formaterHeure(`${heures}:${String(reste).padStart(2, '0')}`)
}

/** Valeur exacte avec son unité : « 14 », « 12 480 », « 5 164 € », « 10 h 42 », « 3 jours ». */
export function formaterValeur(valeur: number, unite: UniteIndicateur): string {
  switch (unite) {
    case 'nombre':
    case 'grand_nombre':
      return nombre(valeur)
    case 'euros':
      return `${nombre(valeur)}${ESPACE_FINE}€`
    case 'heure':
      return formaterHeureEnMinutes(valeur)
    case 'jours':
      return `${nombre(valeur)} ${accorder(valeur, 'jour', 'jours')}`
  }
}

/**
 * Valeur d'un indicateur sensible vue avec le seuil : 1 et 2 deviennent « moins de 3 », les
 * autres valeurs restent exactes (0 est une vraie valeur).
 */
export function formaterValeurSeuil(valeur: number, unite: UniteIndicateur): string {
  return valeur === 1 || valeur === 2 ? MOINS_DE_3 : formaterValeur(valeur, unite)
}

/** Suffixe affiché après le champ de saisie, ou null quand l'unité n'en a pas. */
export function suffixeUnite(unite: UniteIndicateur): string | null {
  if (unite === 'euros') return '€'
  if (unite === 'jours') return 'jours'
  return null
}

/** Heure saisie en heures et minutes vers des minutes depuis minuit ; null si hors limites. */
export function minutesDepuisHeure(heures: number, minutes: number): number | null {
  if (!Number.isInteger(heures) || !Number.isInteger(minutes)) return null
  if (heures < 0 || heures > 23 || minutes < 0 || minutes > 59) return null
  return heures * 60 + minutes
}

/** Minutes depuis minuit vers heures et minutes pour les deux champs de saisie. */
export function heureDepuisMinutes(minutes: number): { heures: number; minutes: number } {
  if (!valeurPermise(minutes, 'heure'))
    throw new RangeError(`Heure invalide (0 à 1439) : ${minutes}`)
  return { heures: Math.floor(minutes / 60), minutes: minutes % 60 }
}
