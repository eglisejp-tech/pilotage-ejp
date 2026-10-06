// Champs des saisies des chiffres (lot E3) : quels indicateurs reçoivent un champ, dans quel ordre,
// avec quelle aide, quelle note et quelle valeur de départ. Rien n'est recompté ici : « Déjà
// saisi » et les valeurs de départ viennent de `v_mesure_periode` (la saisie la plus récente d'une
// période fait foi, BRIEF règle 2), la répartition et la précision du total le plus récent viennent
// des lignes brutes du ministère (`src/data/saisies.ts`).

import type { CodeAide } from '@/components/aide/textesAide'
import { noteDimancheDernier, noteSaisiLe } from '@/features/saisie-chiffres/textes'
import type {
  CalculIndicateur,
  EtatIndicateur,
  NatureIndicateur,
  UniteIndicateur,
} from '@/lib/base'
import { ajouterJours } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { estAValider, estSaisissable } from '@/lib/metier/indicateurs'
import { moisDe, premierJourDuMois } from '@/lib/metier/periodes'
import type { Mois } from '@/lib/metier/periodes'
import { comparerNoms } from '@/lib/metier/texte'

/** Une liste de catégories en cours compte de 3 à 6 catégories (P47, imposé par la base, T42). */
export const CATEGORIES_MIN = 3
export const CATEGORIES_MAX = 6

/** Texte d'un champ libre masqué par EJP Tech (BRIEF, règle 9). */
export const TEXTE_MASQUE = '[texte masqué par EJP Tech]'

/** Ce que la saisie lit d'un indicateur (`indicateur`, sous la RLS du ministère). */
export interface IndicateurDeSaisie {
  id: string
  /** « service », « actifs », « en_fij » pour un commun ; null pour un indicateur propre. */
  code: string | null
  libelle: string
  definition: string
  nature: NatureIndicateur
  unite: UniteIndicateur
  sensible: boolean
  calcul: CalculIndicateur | null
  etat: EtatIndicateur
  /** Null : indicateur commun. */
  ministere_id: string | null
  ordre: number
  saisi_dimanche_matin: boolean
  /** Code du catalogue : il relie un sensible à ses catégories. */
  modele_code: string | null
}

/** Une ligne de `v_mesure_periode` du ministère (valeurs exactes pour lui). */
export interface MesureDeSaisie {
  indicateur_id: string
  periode: DateIso
  valeur: number | null
  saisi_le: string
}

/** Une catégorie de `categorie_sensible`. */
export interface CategorieDeSaisie {
  prevu_code: string
  code: string
  libelle: string
  ordre: number
  retiree_le: string | null
}

/** Répartition et précision du total le plus récent d'un sensible pour le mois saisi. */
export interface DetailDuTotal {
  indicateur_id: string
  /** Null : ce total n'a pas de précision. */
  precision: string | null
  /** Null : ce total n'a pas de répartition. */
  repartition: Readonly<Record<string, number>> | null
}

/** Ce qu'un sensible ajoute à son champ (P46, P47). */
export interface DetailSensible {
  /** Catégories en cours, dans l'ordre de la liste ; vide : pas de grille. */
  categories: { code: string; libelle: string }[]
  /** Précision du total le plus récent, reprise dans le champ ; null si aucune ou masquée. */
  precisionDepart: string | null
  /** La précision du total le plus récent a été masquée par EJP Tech. */
  precisionMasquee: boolean
  /** Répartition du total le plus récent, reprise dans la grille ; null si aucune. */
  repartitionDepart: Readonly<Record<string, number>> | null
  /** Première grille du formulaire : elle porte l'aide `mois.repartition`. */
  aideGrille: boolean
  /** Premier champ « Précision » du formulaire : le rappel sur les données personnelles. */
  rappel: boolean
}

/** Un champ de saisie d'un chiffre. */
export interface ChampChiffre {
  /** Identifiant de l'indicateur. */
  id: string
  code: string | null
  libelle: string
  /** Définition visible sous le libellé (« Ce qu'on compte exactement »). */
  definition: string
  unite: UniteIndicateur
  nature: NatureIndicateur
  /** Ajout qui attend EJP Tech : il se saisit déjà, avec sa mention. */
  aValider: boolean
  /** Aide posée sur ce champ : au plus une par champ, une fois par code et par formulaire. */
  aide: CodeAide | null
  /** « grand » : moins et plus de 64 px (STARs au service) ; « compact » : champ seul. */
  variante: 'grand' | 'compact'
  /** Note fixe sous le champ (« Dimanche dernier : 9 », « Saisi le 24 sept. »). */
  note: string | null
  /** Saisie qui fait foi pour la période, s'il y en a une (« Déjà saisi : ... »). */
  deja: { valeur: number; saisi_le: string } | null
  /** Valeur reprise dans le champ ; null : champ vide. */
  depart: number | null
  /** Le champ doit être rempli (STARs au service). */
  obligatoire: boolean
  /** Sensible : précision et répartition ; null pour les autres. */
  sensible: DetailSensible | null
}

/** Ordre des champs propres : `ordre` de l'indicateur, puis libellé (BRIEF, section 9). */
function comparerOrdre(a: IndicateurDeSaisie, b: IndicateurDeSaisie): number {
  return a.ordre !== b.ordre ? a.ordre - b.ordre : comparerNoms(a.libelle, b.libelle)
}

/** Dernière saisie d'un indicateur (« à ce jour ») : période la plus récente, puis heure. */
function derniere(mesures: readonly MesureDeSaisie[], indicateurId: string): MesureDeSaisie | null {
  return mesures
    .filter((mesure) => mesure.indicateur_id === indicateurId && mesure.valeur !== null)
    .reduce<MesureDeSaisie | null>((plusRecente, mesure) => {
      if (plusRecente === null) return mesure
      if (mesure.periode !== plusRecente.periode) {
        return mesure.periode > plusRecente.periode ? mesure : plusRecente
      }
      return mesure.saisi_le > plusRecente.saisi_le ? mesure : plusRecente
    }, null)
}

/** Saisie qui fait foi pour une période (une ligne par période dans `v_mesure_periode`). */
function dePeriode(
  mesures: readonly MesureDeSaisie[],
  indicateurId: string,
  periode: DateIso,
): { valeur: number; saisi_le: string } | null {
  const ligne = mesures.find(
    (mesure) => mesure.indicateur_id === indicateurId && mesure.periode === periode,
  )
  return ligne && ligne.valeur !== null ? { valeur: ligne.valeur, saisi_le: ligne.saisi_le } : null
}

function champDeBase(indicateur: IndicateurDeSaisie): ChampChiffre {
  return {
    id: indicateur.id,
    code: indicateur.code,
    libelle: indicateur.libelle,
    definition: indicateur.definition,
    unite: indicateur.unite,
    nature: indicateur.nature,
    aValider: estAValider(indicateur.etat),
    aide: null,
    variante: 'compact',
    note: null,
    deja: null,
    depart: null,
    obligatoire: false,
    sensible: null,
  }
}

const AIDES_COMMUNS: Readonly<Record<string, CodeAide>> = {
  service: 'dimanche.service',
  actifs: 'dimanche.actifs',
  en_fij: 'dimanche.enFij',
}

const ORDRE_COMMUNS = ['service', 'actifs', 'en_fij']

export interface EntreeDimanche {
  dimanche: DateIso
  /** Le dimanche du jour avant midi : seuls les indicateurs saisis le matin (X3). */
  matin: boolean
  indicateurs: readonly IndicateurDeSaisie[]
  /** `v_mesure_periode` du ministère, nature « dimanche », toutes périodes. */
  mesuresDimanche: readonly MesureDeSaisie[]
  /** `v_mesure_periode` du ministère, nature « à ce jour ». */
  mesuresACeJour: readonly MesureDeSaisie[]
}

export interface ChampsDimanche {
  /** STARs au service, STARs actifs, dont en FIJ (maquette 08) ; vide le dimanche matin. */
  communs: ChampChiffre[]
  /** Indicateurs propres du dimanche et « à ce jour », actifs ou à valider. */
  propres: ChampChiffre[]
  /** Une saisie fait déjà foi pour ce dimanche : « Corriger les chiffres du dimanche ». */
  correction: boolean
}

/** Valeur de départ et note d'un champ, selon le rythme de l'indicateur. */
function completerDimanche(
  champ: ChampChiffre,
  { dimanche, mesuresDimanche, mesuresACeJour }: EntreeDimanche,
): ChampChiffre {
  if (champ.nature === 'a_ce_jour') {
    // Prérempli avec la dernière valeur, enregistré à chaque envoi (la valeur à ce jour).
    const valeur = derniere(mesuresACeJour, champ.id)
    return valeur === null
      ? champ
      : { ...champ, depart: valeur.valeur, note: noteSaisiLe(valeur.saisi_le) }
  }
  const deja = dePeriode(mesuresDimanche, champ.id, dimanche)
  return { ...champ, deja, depart: deja?.valeur ?? null }
}

/**
 * Champs de la saisie du dimanche (maquette 08, BRIEF section 9) : les trois communs, puis les
 * indicateurs propres « dimanche » et « à ce jour », actifs ou à valider, jamais un calcul, dans
 * l'ordre de `ordre`. Le dimanche du jour avant midi, seuls les indicateurs saisis le matin.
 */
export function champsDimanche(entree: EntreeDimanche): ChampsDimanche {
  const saisissables = entree.indicateurs.filter(
    (indicateur) =>
      estSaisissable(indicateur) &&
      (indicateur.nature === 'dimanche' || indicateur.nature === 'a_ce_jour'),
  )
  const communs = entree.matin
    ? []
    : ORDRE_COMMUNS.flatMap((code) => {
        const indicateur = saisissables.find(
          (candidat) => candidat.ministere_id === null && candidat.code === code,
        )
        if (!indicateur) return []
        const champ = completerDimanche(
          { ...champDeBase(indicateur), aide: AIDES_COMMUNS[code] ?? null },
          entree,
        )
        if (code !== 'service') return [champ]
        const precedent = dePeriode(
          entree.mesuresDimanche,
          indicateur.id,
          ajouterJours(entree.dimanche, -7),
        )
        return [
          {
            ...champ,
            variante: 'grand' as const,
            obligatoire: true,
            note: noteDimancheDernier(precedent?.valeur ?? null),
          },
        ]
      })
  const propres = saisissables
    .filter((indicateur) => indicateur.ministere_id !== null)
    .filter((indicateur) => !entree.matin || indicateur.saisi_dimanche_matin)
    .sort(comparerOrdre)
    .map((indicateur) => completerDimanche(champDeBase(indicateur), entree))
  const service = communs.find((champ) => champ.code === 'service')
  const correction = entree.matin
    ? propres.some((champ) => champ.deja !== null)
    : (service?.deja ?? null) !== null
  return { communs, propres, correction }
}

/** Dimanches où les STARs au service sont saisis (« (déjà saisi) » de la liste des dimanches). */
export function dimanchesSaisis(
  indicateurs: readonly IndicateurDeSaisie[],
  mesuresDimanche: readonly MesureDeSaisie[],
): Set<DateIso> {
  const service = indicateurs.find(
    (indicateur) => indicateur.ministere_id === null && indicateur.code === 'service',
  )
  if (!service) return new Set()
  return new Set(
    mesuresDimanche
      .filter((mesure) => mesure.indicateur_id === service.id && mesure.valeur !== null)
      .map((mesure) => mesure.periode),
  )
}

/** Le ministère a-t-il un indicateur saisi le dimanche matin (X3) ? */
export function aIndicateurDuMatin(indicateurs: readonly IndicateurDeSaisie[]): boolean {
  return indicateurs.some(
    (indicateur) =>
      indicateur.ministere_id !== null &&
      indicateur.nature === 'dimanche' &&
      indicateur.saisi_dimanche_matin &&
      estSaisissable(indicateur),
  )
}

/** Indicateurs du mois du ministère qui reçoivent un champ : actifs ou à valider, jamais un calcul. */
export function indicateursDuMois(
  indicateurs: readonly IndicateurDeSaisie[],
): IndicateurDeSaisie[] {
  return indicateurs
    .filter(
      (indicateur) =>
        indicateur.ministere_id !== null &&
        indicateur.nature === 'mois' &&
        estSaisissable(indicateur),
    )
    .sort(comparerOrdre)
}

/**
 * Mois « déjà saisis » : chaque indicateur du mois y a une valeur. Ils servent au mois choisi
 * d'abord (le dernier mois fini non saisi) et à la mention « (déjà saisi) » de la liste.
 */
export function moisComplets(
  indicateurs: readonly IndicateurDeSaisie[],
  mesuresMois: readonly MesureDeSaisie[],
): Set<Mois> {
  const ids = indicateursDuMois(indicateurs).map((indicateur) => indicateur.id)
  if (ids.length === 0) return new Set()
  const parMois = new Map<Mois, Set<string>>()
  for (const mesure of mesuresMois) {
    if (mesure.valeur === null || !ids.includes(mesure.indicateur_id)) continue
    const mois = moisDe(mesure.periode)
    const saisis = parMois.get(mois) ?? new Set<string>()
    saisis.add(mesure.indicateur_id)
    parMois.set(mois, saisis)
  }
  return new Set(
    [...parMois].filter(([, saisis]) => saisis.size === ids.length).map(([mois]) => mois),
  )
}

/**
 * Précision et répartition du total qui fait foi de chaque sensible : `totaux` vient du plus récent
 * au plus ancien (`lireTotauxDuMois`), le premier de chaque indicateur fait foi. Un total sans
 * précision ni répartition n'en a aucune, même si un total plus ancien du mois en avait.
 */
export function detailsDesTotaux(
  totaux: readonly { id: number; indicateur_id: string }[],
  repartitions: readonly { mesure_id: number; categorie: string; valeur: number }[],
  precisions: readonly { mesure_id: number; texte: string }[],
): DetailDuTotal[] {
  const vus = new Set<string>()
  const details: DetailDuTotal[] = []
  for (const total of totaux) {
    if (vus.has(total.indicateur_id)) continue
    vus.add(total.indicateur_id)
    const lignes = repartitions.filter((ligne) => ligne.mesure_id === total.id)
    details.push({
      indicateur_id: total.indicateur_id,
      precision: precisions.find((ligne) => ligne.mesure_id === total.id)?.texte ?? null,
      repartition:
        lignes.length === 0
          ? null
          : Object.fromEntries(lignes.map((ligne) => [ligne.categorie, ligne.valeur] as const)),
    })
  }
  return details
}

/** Identifiants des totaux qui font foi (le premier de chaque indicateur). */
export function totauxQuiFontFoi(
  totaux: readonly { id: number; indicateur_id: string }[],
): number[] {
  const vus = new Set<string>()
  return totaux.flatMap((total) => {
    if (vus.has(total.indicateur_id)) return []
    vus.add(total.indicateur_id)
    return [total.id]
  })
}

export interface EntreeMois {
  mois: Mois
  indicateurs: readonly IndicateurDeSaisie[]
  /** `v_mesure_periode` du ministère, nature « mois ». */
  mesuresMois: readonly MesureDeSaisie[]
  /** `categorie_sensible`, toutes listes. */
  categories: readonly CategorieDeSaisie[]
  /** Précision et répartition du total le plus récent de chaque sensible pour ce mois. */
  details: readonly DetailDuTotal[]
}

/**
 * Champs de « Chiffres du mois » (BRIEF, section 9) : les indicateurs du mois du ministère, actifs
 * ou à valider, jamais un calcul, dans l'ordre de `ordre`, chacun repris avec la saisie qui fait
 * foi pour le mois. Un sensible a sa précision et, si la coordination a donné ses catégories, sa
 * grille, reprises du total le plus récent (P46, P47). Aides : `mois.sensible` sur le premier
 * sensible, `mois.aValider` sur le premier ajout à valider qui n'a pas déjà une aide, la grille de
 * `mois.repartition` sur la première grille, chacune une seule fois (4 aides au plus avec
 * `mois.periode`).
 */
export function champsMois(entree: EntreeMois): ChampChiffre[] {
  const periode = premierJourDuMois(entree.mois)
  let aideSensible = false
  let aideAValider = false
  let aideGrille = false
  let rappel = false
  return indicateursDuMois(entree.indicateurs).map((indicateur) => {
    const deja = dePeriode(entree.mesuresMois, indicateur.id, periode)
    const champ: ChampChiffre = { ...champDeBase(indicateur), deja, depart: deja?.valeur ?? null }
    if (indicateur.sensible && !aideSensible) {
      aideSensible = true
      champ.aide = 'mois.sensible'
    } else if (champ.aValider && !aideAValider) {
      aideAValider = true
      champ.aide = 'mois.aValider'
    }
    if (!indicateur.sensible) return champ

    const enCours = entree.categories
      .filter(
        (categorie) =>
          indicateur.modele_code !== null &&
          categorie.prevu_code === indicateur.modele_code &&
          categorie.retiree_le === null,
      )
      .sort((a, b) => a.ordre - b.ordre || comparerNoms(a.code, b.code))
      .map(({ code, libelle }) => ({ code, libelle }))
    // La base n'accepte une répartition que si la liste en cours compte de 3 à 6 catégories
    // (T42) : en dehors, l'indicateur n'a pas de grille.
    const categories =
      enCours.length >= CATEGORIES_MIN && enCours.length <= CATEGORIES_MAX ? enCours : []
    // Le détail ne vaut que pour le total qui fait foi : sans total ce mois, rien à reprendre.
    const detail =
      deja === null
        ? undefined
        : entree.details.find((candidat) => candidat.indicateur_id === indicateur.id)
    const masquee = detail?.precision === TEXTE_MASQUE
    const repartition = detail?.repartition ?? null
    champ.sensible = {
      categories,
      precisionDepart: masquee ? null : (detail?.precision ?? null),
      precisionMasquee: masquee,
      // Seules les catégories en cours se reprennent : une catégorie retirée reste dans l'ancienne
      // répartition (lue sur la fiche), la grille ne la propose plus.
      repartitionDepart:
        repartition === null || categories.length === 0
          ? null
          : Object.fromEntries(
              categories.map(({ code }) => [code, repartition[code] ?? 0] as const),
            ),
      aideGrille: categories.length > 0 && !aideGrille,
      rappel: !rappel,
    }
    if (categories.length > 0) aideGrille = true
    rappel = true
    return champ
  })
}
