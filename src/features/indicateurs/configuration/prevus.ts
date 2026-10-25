// État des indicateurs prévus d'un ministère (configuration-indicateurs.md, 7.1 : « 6 à créer »,
// « Créés », « Aucun prévu » ou « À choisir »). Depuis T72, la liste suivie est celle que la base a
// enregistrée pour le ministère (`v_ministere_modele`) : l'écran ne la déduit plus de son nom. Rien
// ici ne décide à la place de la base : un prévu compte comme créé dès qu'un indicateur de la fiche
// porte son code (`modele_code`), quel que soit son état, comme `creer_indicateurs_prevus` (un
// prévu retiré ne renaît pas).

import type { IndicateurConfiguration, LienModele } from '@/data/indicateursConfiguration'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import type {
  ModeleCatalogue,
  PrevuCatalogue,
} from '@/features/indicateurs/configuration/catalogue'

export type EtatPrevus =
  /**
   * La liste est choisie et des prévus manquent : « 6 à créer » et le bouton « Créer ».
   * `modifiable` : aucun prévu de la liste n'est suivi, la base accepte d'en changer.
   */
  | { genre: 'a_creer'; modele: ModeleCatalogue; manquants: PrevuCatalogue[]; modifiable: boolean }
  /** Tous les prévus de la liste choisie sont sur la fiche : « Créés ». */
  | { genre: 'crees'; modele: ModeleCatalogue; modifiable: boolean }
  /** « Aucun prévu » est la liste choisie (Prodiges Academy) : elle se change. */
  | { genre: 'aucun' }
  /**
   * Rien n'est choisi : « À choisir ». `suggestion` : la présélection d'après le nom du ministère
   * (code du catalogue ou « aucun »), jamais un choix ; null : aucune.
   */
  | { genre: 'a_choisir'; suggestion: string | null }

/** Faut-il montrer le bloc « Indicateurs prévus » de la fiche d'un ministère ? */
export function resteAChoisirOuCreer(etat: EtatPrevus): boolean {
  return etat.genre === 'a_creer' || etat.genre === 'a_choisir'
}

/**
 * Le bloc de la fiche montre aussi « Aucun prévu » et une liste dont aucun prévu n'est suivi : avec
 * « Changer », pour revenir sur le choix (T72).
 */
export function blocPrevusVisible(etat: EtatPrevus): boolean {
  return (
    resteAChoisirOuCreer(etat) ||
    etat.genre === 'aucun' ||
    (etat.genre === 'crees' && etat.modifiable)
  )
}

/** Liste choisie de chaque ministère, par identifiant. */
export function listesParMinistere(liens: readonly LienModele[]): ReadonlyMap<string, LienModele> {
  return new Map(liens.map((lien) => [lien.ministere_id, lien]))
}

/** Codes de modèle des indicateurs donnés. */
function codesDe(
  indicateurs: readonly Pick<IndicateurConfiguration, 'modele_code'>[],
): Set<string> {
  return new Set(
    indicateurs.flatMap((indicateur) =>
      indicateur.modele_code === null ? [] : [indicateur.modele_code],
    ),
  )
}

/** Une suggestion n'est retenue que si elle désigne « aucun » ou un modèle du catalogue lu. */
function suggestionValable(
  suggestion: string | null | undefined,
  modeles: readonly ModeleCatalogue[],
): string | null {
  if (suggestion === null || suggestion === undefined) return null
  if (suggestion === MODELE_AUCUN) return MODELE_AUCUN
  return modeles.some((modele) => modele.code === suggestion) ? suggestion : null
}

/**
 * État des prévus d'un ministère : `lien` est sa ligne de `v_ministere_modele` (absente : rien
 * n'est choisi), `indicateurs` sont les siens, tous états. Une liste choisie que le catalogue lu
 * ne connaît pas se lit comme « À choisir » : la base refusera tout autre geste.
 */
export function etatPrevus(
  lien: LienModele | undefined,
  indicateurs: readonly Pick<IndicateurConfiguration, 'modele_code' | 'etat'>[],
  modeles: readonly ModeleCatalogue[],
): EtatPrevus {
  const choisi = lien?.modele ?? null
  if (choisi === MODELE_AUCUN) return { genre: 'aucun' }
  const modele = choisi === null ? undefined : modeles.find((candidat) => candidat.code === choisi)
  if (modele === undefined) {
    return { genre: 'a_choisir', suggestion: suggestionValable(lien?.suggere, modeles) }
  }
  const codesCrees = codesDe(indicateurs)
  const codesSuivis = codesDe(indicateurs.filter((indicateur) => indicateur.etat !== 'retire'))
  const modifiable = !modele.prevus.some((prevu) => codesSuivis.has(prevu.code))
  const manquants = modele.prevus.filter((prevu) => !codesCrees.has(prevu.code))
  return manquants.length > 0
    ? { genre: 'a_creer', modele, manquants, modifiable }
    : { genre: 'crees', modele, modifiable }
}
