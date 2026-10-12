// Filtres de l'écran 06, dans l'adresse (BRIEF, section 9, « Adresses » : `/journal` avec `compte`,
// `action`, `periode` et `ministere`). Une valeur inconnue ou absente est ignorée : l'écran ne
// casse jamais sur une adresse recopiée à la main. La période par défaut (30 derniers jours) ne
// s'écrit pas dans l'adresse.

import { estCodeAction } from '@/features/journal/libellesActions'
import type { CodeAction } from '@/features/journal/libellesActions'
import { lirePeriode, PERIODE_PAR_DEFAUT } from '@/features/journal/periodes'
import type { Periode } from '@/features/journal/periodes'

export interface FiltresJournal {
  /** Identifiant du compte auteur ; null : « Tous les comptes ». */
  compte: string | null
  /** Code d'action ; null : « Toutes les actions ». */
  action: CodeAction | null
  periode: Periode
  /** Identifiant du ministère de l'adresse ; null : tous. */
  ministere: string | null
}

export const SANS_FILTRE: FiltresJournal = {
  compte: null,
  action: null,
  periode: PERIODE_PAR_DEFAUT,
  ministere: null,
}

/** Un identifiant raisonnable : lettres, chiffres, tiret et soulignement (un uuid en est un). */
const IDENTIFIANT = /^[0-9A-Za-z_-]{1,64}$/

function identifiant(valeur: string | null): string | null {
  return valeur !== null && IDENTIFIANT.test(valeur) ? valeur : null
}

/** Les filtres de l'adresse. */
export function lireFiltres(parametres: URLSearchParams): FiltresJournal {
  const action = parametres.get('action')
  return {
    compte: identifiant(parametres.get('compte')),
    action: action !== null && estCodeAction(action) ? action : null,
    periode: lirePeriode(parametres.get('periode')),
    ministere: identifiant(parametres.get('ministere')),
  }
}

/** L'adresse des filtres : les autres paramètres de `base` sont gardés, les filtres remplacés. */
export function ecrireFiltres(base: URLSearchParams, filtres: FiltresJournal): URLSearchParams {
  const suivants = new URLSearchParams(base)
  const ecrire = (cle: string, valeur: string | null) => {
    if (valeur === null) suivants.delete(cle)
    else suivants.set(cle, valeur)
  }
  ecrire('compte', filtres.compte)
  ecrire('action', filtres.action)
  ecrire('periode', filtres.periode === PERIODE_PAR_DEFAUT ? null : filtres.periode)
  ecrire('ministere', filtres.ministere)
  return suivants
}

/**
 * Y a-t-il quelque chose à retirer ? « Retirer les filtres » ouvre toute la période et ôte les
 * autres choix : il n'y a rien à retirer quand ce sont déjà tous les comptes, toutes les actions,
 * tous les ministères, depuis le début.
 */
export function aDesFiltres(filtres: FiltresJournal): boolean {
  return (
    filtres.compte !== null ||
    filtres.action !== null ||
    filtres.ministere !== null ||
    filtres.periode !== 'tout'
  )
}

/** Tous les filtres retirés : tous les comptes, toutes les actions, depuis le début. */
export const FILTRES_RETIRES: FiltresJournal = { ...SANS_FILTRE, periode: 'tout' }
