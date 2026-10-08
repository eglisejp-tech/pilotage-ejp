// État des indicateurs prévus d'un ministère (configuration-indicateurs.md, 7.1 : « 6 à créer »,
// « Créés », « Aucun prévu » ou « À choisir »). Rien ici ne décide à la place de la base : un prévu
// compte comme créé dès qu'un indicateur de la fiche porte son code (`modele_code`), quel que soit
// son état, comme `creer_indicateurs_prevus` (un prévu retiré ne renaît pas).

import type {
  IndicateurConfiguration,
  LigneJournalConfiguration,
} from '@/data/indicateursConfiguration'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import type {
  ModeleCatalogue,
  PrevuCatalogue,
} from '@/features/indicateurs/configuration/catalogue'
import { normaliser } from '@/features/indicateurs/configuration/normaliser'

export type EtatPrevus =
  /** Le modèle est connu et des prévus manquent : « 6 à créer » et le bouton « Créer ». */
  | { genre: 'a_creer'; modele: ModeleCatalogue; manquants: PrevuCatalogue[] }
  /** Tous les prévus du modèle sont sur la fiche : « Créés ». */
  | { genre: 'crees'; modele: ModeleCatalogue }
  /** La réponse « Aucun prévu » a été enregistrée (Protocole, Prodiges Academy). */
  | { genre: 'aucun' }
  /** Le nom du ministère n'est pas reconnu : « À choisir » dans la liste de la coordination. */
  | { genre: 'a_choisir' }

/** Faut-il montrer le bloc « Prévus par la coordination » de la fiche d'un ministère ? */
export function resteAChoisirOuCreer(etat: EtatPrevus): boolean {
  return etat.genre === 'a_creer' || etat.genre === 'a_choisir'
}

/**
 * Ministères pour lesquels la réponse « Aucun prévu » a été enregistrée : une ligne de journal
 * `indicateurs_prevus_crees` dont le détail porte le modèle « aucun ».
 */
export function ministeresSansPrevu(
  creations: readonly LigneJournalConfiguration[],
): ReadonlySet<string> {
  return new Set(
    creations
      .filter((ligne) => ligne.action === 'indicateurs_prevus_crees')
      .filter((ligne) => ligne.detail?.['modele'] === MODELE_AUCUN)
      .map((ligne) => ligne.ministere_id),
  )
}

/**
 * Modèle d'un ministère, dans cet ordre : celui de ses prévus déjà créés (le plus représenté),
 * puis, sans prévu créé, celui dont le nom normalisé égale le sien, sauf si la réponse « Aucun
 * prévu » a été enregistrée. `null` : à choisir.
 */
function modeleDuMinistere(
  nom: string,
  codesCrees: ReadonlySet<string>,
  aucunEnregistre: boolean,
  modeles: readonly ModeleCatalogue[],
): ModeleCatalogue | null {
  let meilleur: ModeleCatalogue | null = null
  let meilleurNombre = 0
  for (const modele of modeles) {
    const nombre = modele.prevus.filter((prevu) => codesCrees.has(prevu.code)).length
    if (nombre > meilleurNombre) {
      meilleur = modele
      meilleurNombre = nombre
    }
  }
  if (meilleur !== null) return meilleur
  if (aucunEnregistre) return null
  const nomNormalise = normaliser(nom)
  return modeles.find((modele) => modele.code === nomNormalise) ?? null
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

/**
 * État des prévus d'un ministère : `indicateurs` sont les siens, tous états.
 * `aucunEnregistre` : la réponse « Aucun prévu » est dans le journal.
 * Le modèle se déduit des seuls indicateurs non retirés (correctif du 8 octobre 2026 : des prévus
 * d'un autre modèle, créés par erreur puis retirés, faisaient croire à ce modèle). Un prévu retiré
 * ne manque pas pour autant : la base ne le recrée jamais (creer_indicateurs_prevus).
 */
export function etatPrevus(
  nom: string,
  indicateurs: readonly Pick<IndicateurConfiguration, 'modele_code' | 'etat'>[],
  modeles: readonly ModeleCatalogue[],
  aucunEnregistre: boolean,
): EtatPrevus {
  const codesSuivis = codesDe(indicateurs.filter((indicateur) => indicateur.etat !== 'retire'))
  const codesCrees = codesDe(indicateurs)
  const modele = modeleDuMinistere(nom, codesSuivis, aucunEnregistre, modeles)
  if (modele === null) return aucunEnregistre ? { genre: 'aucun' } : { genre: 'a_choisir' }
  const manquants = modele.prevus.filter((prevu) => !codesCrees.has(prevu.code))
  return manquants.length > 0 ? { genre: 'a_creer', modele, manquants } : { genre: 'crees', modele }
}
