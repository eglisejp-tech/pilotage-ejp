// Ce que les filtres de l'écran 06 proposent à un profil, et ce que l'adresse a le droit de choisir.
// Fonctions pures : le hook (`useJournal.ts`) et l'aperçu les appellent de la même façon.

import type { CompteJournal } from '@/data/journal'
import type { MinistereListe } from '@/data/ministeres'
import type { FiltresJournal } from '@/features/journal/filtres'
import { actionsDuProfil, libelleAction } from '@/features/journal/libellesActions'
import type { OptionAction, OptionCompte, OptionMinistere } from '@/features/journal/modeleJournal'
import { TEXTES_JOURNAL } from '@/features/journal/textesJournal'
import type { TypeCompte } from '@/lib/base'
import { comparerNoms } from '@/lib/metier/texte'

/** Les actions du filtre « Action » pour ce profil, dans l'ordre du brief. */
export function optionsActions(profil: TypeCompte): OptionAction[] {
  return actionsDuProfil(profil).map((code) => ({ code, libelle: libelleAction(code) }))
}

/** Les comptes du filtre « Compte », par libellé ; un compte désactivé le dit. */
export function optionsComptes(comptes: readonly CompteJournal[]): OptionCompte[] {
  return comptes
    .map((compte) => ({
      id: compte.user_id,
      libelle:
        compte.desactive_le === null
          ? compte.libelle
          : `${compte.libelle} ${TEXTES_JOURNAL.desactive}`,
    }))
    .sort((a, b) => comparerNoms(a.libelle, b.libelle))
}

/** Un ministère désactivé garde son nom dans l'adresse : « Social (désactivé) ». */
export function optionMinistere(ministere: MinistereListe): OptionMinistere {
  return {
    id: ministere.id,
    nom:
      ministere.desactive_le === null
        ? ministere.nom
        : `${ministere.nom} ${TEXTES_JOURNAL.desactive}`,
  }
}

export interface ChoixPossibles {
  profil: TypeCompte
  /** Null pour un ministère, qui n'a pas le filtre « Compte ». */
  comptes: readonly OptionCompte[] | null
  actions: readonly OptionAction[]
  ministeres: readonly OptionMinistere[]
}

/**
 * Les filtres de l'adresse, réduits à ce que l'écran propose. Un ministère n'a ni filtre « Compte »
 * ni ministère d'adresse (la base ne lui rend déjà que son ministère et son compte). Une valeur
 * absente de sa liste (compte inconnu, action hors profil, ministère inexistant) est ignorée :
 * l'écran ne montre jamais un filtre qu'il ne peut pas nommer.
 */
export function filtresRetenus(brut: FiltresJournal, choix: ChoixPossibles): FiltresJournal {
  const ministere = choix.profil === 'ministere' ? null : brut.ministere
  return {
    compte:
      choix.comptes !== null && choix.comptes.some((compte) => compte.id === brut.compte)
        ? brut.compte
        : null,
    action: choix.actions.some((action) => action.code === brut.action) ? brut.action : null,
    periode: brut.periode,
    ministere: choix.ministeres.some((option) => option.id === ministere) ? ministere : null,
  }
}
