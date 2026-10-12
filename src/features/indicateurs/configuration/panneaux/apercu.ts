// Ce que les panneaux d'ajout et de calcul montrent avant l'envoi (configuration-indicateurs.md,
// 7.2) : l'aperçu de la saisie (« Publications, septembre 2026 : __ »), l'aperçu d'un calcul avec
// des nombres d'exemple (l'administration ne lit aucune valeur), les sources qu'un calcul accepte
// et les limites de la fiche. Fonctions pures : la base reste l'autorité, l'écran ne recopie pas
// ses règles au-delà de ce qui évite un aller-retour (F10).

import type { LimitesIndicateurs, NatureIndicateur, TypeCalcul, UniteIndicateur } from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'
import { formaterJourSemaine } from '@/lib/metier/dates'
import { formaterResultatCalcul } from '@/lib/metier/indicateurs'
import { ajouterMois, libelleMois, moisDe } from '@/lib/metier/periodes'
import { accorder, ESPACE_FINE, nombre } from '@/lib/metier/texte'
import { formaterValeur } from '@/lib/metier/unites'

/** Libellé affiché tant que la personne n'a rien écrit. */
export const LIBELLE_PAR_DEFAUT = 'Votre indicateur'

function enMinuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1)
}

/** La période que l'aperçu cite : le dernier mois fini, le dimanche de référence, ou « à ce jour ». */
export function periodeApercu(
  nature: NatureIndicateur | null,
  aujourdhui: DateIso | null,
  dimancheReference: DateIso | null,
): string | null {
  if (nature === 'a_ce_jour') return 'à ce jour'
  if (nature === 'mois' && aujourdhui !== null) {
    return enMinuscule(libelleMois(ajouterMois(moisDe(aujourdhui), -1)))
  }
  if (nature === 'dimanche' && dimancheReference !== null) {
    return formaterJourSemaine(dimancheReference)
  }
  return null
}

export interface EntreeApercuSaisie {
  libelle: string
  nature: NatureIndicateur | null
  unite: UniteIndicateur | null
  /** Jour de Paris (`v_semaine.aujourdhui`) ; `null` tant qu'il n'est pas lu. */
  aujourdhui: DateIso | null
  /** Dimanche de référence (`v_semaine.dimanche`). */
  dimancheReference: DateIso | null
}

/**
 * L'aperçu de la saisie : « Publications, septembre 2026 : __ ». La période s'ajoute au libellé
 * (R1) ; des euros portent leur signe, le reste n'a pas d'unité.
 */
export function apercuSaisie(entree: EntreeApercuSaisie): string {
  const libelle = entree.libelle.replace(/\s+/g, ' ').trim() || LIBELLE_PAR_DEFAUT
  const periode = periodeApercu(entree.nature, entree.aujourdhui, entree.dimancheReference)
  const tete = periode === null ? libelle : `${libelle}, ${periode}`
  return `${tete} : __${entree.unite === 'euros' ? `${ESPACE_FINE}€` : ''}`
}

/**
 * L'aperçu d'un calcul, avec des nombres d'exemple : un taux « 16 sur 20, soit 80 % », une moyenne
 * « 1 240 pour 53, soit 23,4 » (avec l'unité du haut : « 1 240 € pour 53, soit 23,4 € »).
 */
export function apercuCalcul(
  type: TypeCalcul | null,
  uniteHaut: UniteIndicateur = 'nombre',
): string {
  if (type === 'moyenne') {
    const haut = 1240
    const bas = 53
    return `Par exemple : ${formaterValeur(haut, uniteHaut)} pour ${nombre(bas)}, soit ${formaterResultatCalcul('moyenne', haut / bas, uniteHaut)}`
  }
  const haut = 16
  const bas = 20
  return `Par exemple : ${nombre(haut)} sur ${nombre(bas)}, soit ${formaterResultatCalcul('taux', (100 * haut) / bas, 'nombre')}`
}

/** Un indicateur qui peut servir de source à un calcul. */
export interface SourceCalcul {
  id: string
  libelle: string
  nature: NatureIndicateur
  unite: UniteIndicateur
}

/**
 * Le chiffre du bas qui va avec un chiffre du haut : un autre indicateur, du même rythme, ou « à ce
 * jour » (on prend alors sa valeur en vigueur à la fin de la période : 3.4). La base le contrôle
 * aussi (trigger des termes) ; la liste évite de proposer ce qu'elle refuserait.
 */
export function basCompatibles(
  sources: readonly SourceCalcul[],
  hautId: string,
): readonly SourceCalcul[] {
  const haut = sources.find((source) => source.id === hautId)
  if (haut === undefined) return sources
  return sources.filter(
    (source) =>
      source.id !== haut.id && (source.nature === haut.nature || source.nature === 'a_ce_jour'),
  )
}

/** Un calcul demande au moins deux sources dont l'une accepte l'autre comme bas. */
export function calculPossible(sources: readonly SourceCalcul[]): boolean {
  return sources.some((source) => basCompatibles(sources, source.id).length > 0)
}

export interface EtatLimite {
  /** « La fiche compte 12 indicateurs sur 30 au plus. » */
  phrase: string
  /** La fiche est pleine : la base refusera l'ajout. */
  plein: boolean
  /** Le refus de la base, dit avant l'envoi ; `null` tant qu'il reste de la place. */
  refus: string | null
}

/**
 * La place qui reste sur la fiche (`limites_indicateurs`, 30 lignes au plus). Un remplacement ne
 * compte pas l'indicateur qu'il remplace : la fiche pleine peut encore remplacer.
 */
export function etatLimite(limites: LimitesIndicateurs, remplace: boolean): EtatLimite {
  const { lignes, lignes_max: max } = limites
  const phrase = `La fiche compte ${nombre(lignes)} ${accorder(lignes, 'indicateur', 'indicateurs')} sur ${nombre(max)} au plus.`
  const plein = lignes - (remplace ? 1 : 0) >= max
  return {
    phrase,
    plein,
    refus: plein
      ? `Cette fiche compte déjà ${nombre(max)} indicateurs. Retirez-en un pour en ajouter un autre.`
      : null,
  }
}
