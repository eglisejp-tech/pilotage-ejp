// Métier des indicateurs (plan de l'étape 4, E1 ; docs/conception/configuration-indicateurs.md,
// R6, 3.4 et 7.5) : ordre des lignes d'une fiche, qui se saisit, libellé d'un calcul, texte du
// « Non calculé ». Rien ici ne recalcule un total : les vues de la base font les sommes, les
// taux et la complétude (`v_indicateur_suivi`, `v_calcul`), ce module les met en forme.
//
// Aucune fonction ne lit la date du navigateur : « aujourd'hui » est le jour de Paris de
// `v_semaine.aujourdhui`, passé en paramètre (BRIEF section 3, règle 11).

import type {
  CalculIndicateur,
  EtatIndicateur,
  LigneVue,
  NatureIndicateur,
  RaisonNonCalcule,
  UniteIndicateur,
} from '@/lib/base'
import { formaterJourCourt, formaterJourSemaine, nomDuMois } from './dates'
import type { DateIso } from './dates'
import { estMois, moisDe, premierMoisPermis } from './periodes'
import { formaterPourcentage, NON_CALCULE } from './pourcentage'
import { accorder, comparerNoms, ESPACE_FINE, nombre, terminerPhrase } from './texte'
import { formaterHeureEnMinutes, formaterValeur, MOINS_DE_3 } from './unites'

/** Rythmes dans l'ordre de la fiche (R6) : chaque dimanche, chaque mois, puis « à ce jour ». */
export const RYTHMES: readonly NatureIndicateur[] = ['dimanche', 'mois', 'a_ce_jour']

const LIBELLES_RYTHME: Readonly<Record<NatureIndicateur, string>> = {
  dimanche: 'Chaque dimanche',
  mois: 'Chaque mois',
  a_ce_jour: 'À ce jour',
}

/** Titre de section d'un rythme : « Chaque dimanche », « Chaque mois », « À ce jour ». */
export function libelleRythme(nature: NatureIndicateur): string {
  return LIBELLES_RYTHME[nature]
}

/** Ce qu'il faut savoir d'un indicateur pour le ranger. */
export interface IndicateurRangeable {
  nature: NatureIndicateur
  libelle: string
}

/** Comparaison de la fiche (R6) : par rythme, puis par ordre alphabétique français du libellé. */
export function comparerIndicateurs(a: IndicateurRangeable, b: IndicateurRangeable): number {
  const parRythme = RYTHMES.indexOf(a.nature) - RYTHMES.indexOf(b.nature)
  return parRythme !== 0 ? parRythme : comparerNoms(a.libelle, b.libelle)
}

/** Copie rangée par rythme puis par ordre alphabétique : les lignes d'un dispositif se suivent. */
export function trierIndicateurs<T extends IndicateurRangeable>(indicateurs: readonly T[]): T[] {
  return [...indicateurs].sort(comparerIndicateurs)
}

export interface SectionRythme<T> {
  nature: NatureIndicateur
  /** « Chaque dimanche », « Chaque mois », « À ce jour ». */
  titre: string
  indicateurs: T[]
}

/** Sections de la fiche, dans l'ordre des rythmes, sans section vide, chacune rangée (R6). */
export function regrouperParRythme<T extends IndicateurRangeable>(
  indicateurs: readonly T[],
): SectionRythme<T>[] {
  const rangees = trierIndicateurs(indicateurs)
  return RYTHMES.flatMap((nature) => {
    const section = rangees.filter((indicateur) => indicateur.nature === nature)
    return section.length === 0
      ? []
      : [{ nature, titre: libelleRythme(nature), indicateurs: section }]
  })
}

/** Un calcul se déclare, il ne se saisit jamais. */
export function estCalcul(indicateur: { calcul: CalculIndicateur | null }): boolean {
  return indicateur.calcul !== null
}

/** Ajout qui attend la validation d'EJP Tech : il se saisit déjà, hors des totaux. */
export function estAValider(etat: EtatIndicateur): boolean {
  return etat === 'en_attente'
}

/**
 * Un indicateur reçoit-il une saisie ? Actif ou à valider, jamais un calcul ni un retiré (la
 * base le refuse aussi : trigger `controler_mesure` et politique d'ajout de `mesure`).
 */
export function estSaisissable(indicateur: {
  calcul: CalculIndicateur | null
  etat: EtatIndicateur
}): boolean {
  return indicateur.calcul === null && indicateur.etat !== 'retire'
}

export type RefusMois = 'invalide' | 'futur' | 'trop_ancien'

/**
 * Pourquoi un mois ne se saisit pas aujourd'hui, ou `null` s'il se saisit : ni futur (le mois en
 * cours est permis, pour tout indicateur, sensible compris : décision du 6 octobre 2026), ni avant
 * le 1er janvier de l'année précédente. Le jour de saisie est le 1er du mois, posé par la base.
 */
export function refusDeMois(mois: string, aujourdhui: DateIso): RefusMois | null {
  if (!estMois(mois)) return 'invalide'
  if (mois > moisDe(aujourdhui)) return 'futur'
  if (mois < premierMoisPermis(aujourdhui)) return 'trop_ancien'
  return null
}

/**
 * Valeur d'une période pour l'écran : « moins de 3 » pour un sensible masqué par la base, la
 * valeur écrite avec son unité sinon, `null` pour une absence (jamais un 0 pour une absence : la
 * ligne dit « Pas encore de saisie »).
 */
export function libelleValeurMesure(
  valeur: number | null,
  moinsDe3: boolean,
  unite: UniteIndicateur,
): string | null {
  if (moinsDe3) return MOINS_DE_3
  return valeur === null ? null : formaterValeur(valeur, unite)
}

/** Complétude d'une somme de l'année : « 9 mois sur 9 », « 40 dimanches sur 40 ». */
export function libelleCompletudePeriodes(
  saisies: number,
  attendues: number,
  nature: NatureIndicateur,
): string {
  const [singulier, pluriel] =
    nature === 'mois'
      ? ['mois', 'mois']
      : nature === 'dimanche'
        ? ['dimanche', 'dimanches']
        : ['valeur', 'valeurs']
  return `${nombre(saisies)} ${accorder(saisies, singulier, pluriel)} sur ${nombre(attendues)}`
}

/** Période d'un calcul dans une phrase : « septembre », « le dimanche 27 sept. », « le 27 sept. ». */
function quandPeriode(periode: DateIso, nature: NatureIndicateur): string {
  if (nature === 'mois') return nomDuMois(Number(periode.slice(5, 7)))
  return nature === 'dimanche'
    ? `le ${formaterJourSemaine(periode)}`
    : `le ${formaterJourCourt(periode)}`
}

const formatDecimal = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Résultat d'un calcul écrit : un taux en pour cent entier (« 80 % »), une moyenne à une décimale
 * avec l'unité de son haut (« 23,4 € », « 1,5 jour », « 20 h 30 »).
 */
export function formaterResultatCalcul(
  calcul: CalculIndicateur,
  resultat: number,
  unite: UniteIndicateur,
): string {
  if (calcul === 'taux') return formaterPourcentage(Math.round(resultat))
  if (unite === 'heure') return formaterHeureEnMinutes(Math.min(1439, Math.round(resultat)))
  const decimal = formatDecimal.format(resultat)
  if (unite === 'euros') return `${decimal}${ESPACE_FINE}€`
  if (unite === 'jours') return `${decimal} ${accorder(resultat, 'jour', 'jours')}`
  return decimal
}

/** Ce que le texte du « Non calculé » doit savoir. */
export interface EntreeNonCalcule {
  raison: RaisonNonCalcule | null
  nature: NatureIndicateur
  /** Dernière période finie du calcul (`v_calcul.periode`). */
  periode: DateIso
  /** Libellé de la source qui manque (`v_calcul.non_calcule_source_id`), s'il est connu. */
  libelleSource?: string | null
}

/**
 * Texte du « Non calculé » : la raison est dite dans la ligne (plan E2). La source est citée entre
 * guillemets : le texte reste juste quel que soit le genre ou le nombre de son libellé.
 * « Non calculé : aucune saisie de « Demandes reçues » pour septembre. »
 * « Non calculé : « Demandes reçues » vaut 0 pour septembre. »
 */
export function texteNonCalcule(entree: EntreeNonCalcule): string {
  const quand = quandPeriode(entree.periode, entree.nature)
  const source = entree.libelleSource ? `« ${entree.libelleSource} »` : null
  if (entree.raison === 'source_non_saisie') {
    return source
      ? terminerPhrase(`${NON_CALCULE} : aucune saisie de ${source} pour ${quand}`)
      : terminerPhrase(`${NON_CALCULE} : une saisie de ${quand} manque`)
  }
  if (entree.raison === 'bas_nul') {
    return source
      ? terminerPhrase(`${NON_CALCULE} : ${source} vaut 0 pour ${quand}`)
      : terminerPhrase(`${NON_CALCULE} : le total de comparaison vaut 0 pour ${quand}`)
  }
  return `${NON_CALCULE}.`
}

/** Une ligne de `v_calcul` et ce qu'il faut en plus pour l'écrire. */
export interface EntreeCalcul {
  libelle: string
  nature: NatureIndicateur
  /** Unité du haut : celle d'une moyenne et des valeurs entre parenthèses. */
  unite: UniteIndicateur
  ligne: Pick<
    LigneVue<'v_calcul'>,
    | 'calcul'
    | 'periode'
    | 'haut'
    | 'bas'
    | 'resultat'
    | 'annee_resultat'
    | 'annee_nb_periodes'
    | 'annee_nb_attendues'
    | 'non_calcule_raison'
  >
  /** Départ de la somme de l'année, déjà écrit (« Depuis janvier ») ; sinon « Sur l'année ». */
  depuis?: string | null
  /** Libellé de la source qui manque, pour le « Non calculé ». */
  libelleSource?: string | null
}

/**
 * Ligne d'un calcul (BRIEF règle 4, configuration-indicateurs.md 3.4) :
 * « Taux de résolution : 80 % en septembre (16 sur 20). Depuis janvier : 78 % (9 mois sur 9). »
 * Un calcul sans résultat rend seulement le texte du « Non calculé » : le libellé de la ligne est
 * déjà affiché à côté. La somme de l'année est un rapport de sommes, jamais une moyenne de taux.
 */
export function phraseCalcul(entree: EntreeCalcul): string {
  const { ligne, libelle, nature, unite } = entree
  if (ligne.resultat === null) {
    return texteNonCalcule({
      raison: ligne.non_calcule_raison,
      nature,
      periode: ligne.periode,
      libelleSource: entree.libelleSource,
    })
  }
  const valeur = formaterResultatCalcul(ligne.calcul, ligne.resultat, unite)
  const quand = quandPeriode(ligne.periode, nature)
  const quandPhrase = nature === 'mois' ? `en ${quand}` : quand
  const detail =
    ligne.haut !== null && ligne.bas !== null
      ? ` (${detailCalcul(ligne.calcul, ligne.haut, ligne.bas, unite)})`
      : ''
  const periode = terminerPhrase(`${libelle} : ${valeur} ${quandPhrase}${detail}`)
  if (
    ligne.annee_resultat === null ||
    ligne.annee_nb_periodes === null ||
    ligne.annee_nb_attendues === null
  ) {
    return periode
  }
  const annee = formaterResultatCalcul(ligne.calcul, ligne.annee_resultat, unite)
  const completude = libelleCompletudePeriodes(
    ligne.annee_nb_periodes,
    ligne.annee_nb_attendues,
    nature,
  )
  return `${periode} ${entree.depuis ?? "Sur l'année"} : ${annee} (${completude}).`
}

function detailCalcul(
  calcul: CalculIndicateur,
  haut: number,
  bas: number,
  unite: UniteIndicateur,
): string {
  const lienDuHaut = calcul === 'taux' ? 'sur' : 'pour'
  const hautEcrit = calcul === 'taux' ? nombre(haut) : formaterValeur(haut, unite)
  return `${hautEcrit} ${lienDuHaut} ${nombre(bas)}`
}
