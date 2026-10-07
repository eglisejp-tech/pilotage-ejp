// Construction de la fiche d'un ministère (maquettes 04 et 12, lot E2) à partir des lignes lues
// dans la base (ou des lignes d'exemple de l'aperçu). Fonctions pures : aucune lecture, aucune
// date du navigateur. Le jour de Paris et le dimanche de référence viennent de `v_semaine`.
//
// Rien n'est recompté : les vues donnent les sommes de l'année, leur complétude et les calculs.
// Un sensible se lit exact par son ministère, le berger, le conseil et EJP Tech (P52) : ni
// « moins de 3 » ni répartition masquée. Seul le pourcentage FIJ d'un ministère se calcule ici,
// de ses deux dernières valeurs (BRIEF, règle 4 ; `pourcentageFij`).

import type { IndicateurCommun } from '@/data/eglise'
import type { MinistereFiche, PointsFiche, SensibleFiche } from '@/data/fiche'
import type { MinistereListe } from '@/data/ministeres'
import type {
  LigneTable,
  LigneVue,
  NatureIndicateur,
  RaisonNonCalcule,
  UniteIndicateur,
} from '@/lib/base'
import type {
  AidesLigne,
  CaseRepartition,
  CourbeFiche,
  DetailSensible,
  DonneesFiche,
  EcartFiche,
  LigneCommune,
  LigneIndicateurFiche,
  LigneRetiree,
  PointCourbeFiche,
  PointFiche,
  PrecisionFiche,
  ProfilFiche,
  RepartitionMois,
  SectionFiche,
  SommeFiche,
  TexteLibre,
  ValeurFiche,
} from '@/features/fiche/modeleFiche'
import {
  partAVerifier,
  sansPrefixeNonCalcule,
  TEXTE_MASQUE,
  TEXTES_FICHE,
  titrePrecision,
} from '@/features/fiche/textesFiche'
import {
  moisEnCoursSansSaisie,
  pasDeRepartition,
  TEXTES_VIDES_INDICATEURS,
  texteAjoutAValider,
} from '@/features/indicateurs/textesVides'
import { libelleCompletude, completude } from '@/lib/metier/completude'
import {
  ajouterJours,
  formaterJourCourt,
  formaterJourSemaineTitre,
  jourDeParis,
  joursEntre,
} from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { ecartMinistere } from '@/lib/metier/ecarts'
import { fraicheur, joursDepuis, libelleMiseAJour } from '@/lib/metier/fraicheur'
import {
  formaterResultatCalcul,
  libelleCompletudePeriodes,
  regrouperParRythme,
  retires as retiresRanges,
  texteNonCalcule,
} from '@/lib/metier/indicateurs'
import { libelleDepuisMois, libelleMois, libelleMoisEnCours, moisDe } from '@/lib/metier/periodes'
import { phraseDeLaFiche } from '@/lib/metier/phrases'
import { estOuvert, libelleEcheance, trierOuverts, trierTraites } from '@/lib/metier/points'
import { formaterPourcentage, pourcentageFij } from '@/lib/metier/pourcentage'
import { nombre, nombreEnDebutDePhrase } from '@/lib/metier/texte'
import { formaterValeur } from '@/lib/metier/unites'

/** Toutes les lignes que la fiche lit (une par requête de `src/data/`). */
export interface LecturesFiche {
  semaine: Pick<LigneVue<'v_semaine'>, 'aujourdhui' | 'dimanche'>
  ministere: MinistereFiche
  /** `v_tableau_ministeres.derniere_saisie` du ministère ; null : aucune saisie. */
  derniereSaisie: string | null
  communs: IndicateurCommun[]
  libellesCommuns: LigneVue<'v_commun_fiche'>[]
  mesuresCommuns: LigneVue<'v_mesure_periode'>[]
  totauxDimanche: LigneVue<'v_total_dimanche'>[]
  totauxACeJour: LigneVue<'v_total_a_ce_jour'>[]
  suivi: LigneVue<'v_indicateur_suivi'>[]
  calculs: LigneVue<'v_calcul'>[]
  series: LigneVue<'v_indicateur_serie'>[]
  sensibles: SensibleFiche[]
  categories: LigneTable<'categorie_sensible'>[]
  repartitions: LigneVue<'v_ventilation_sensible'>[]
  precisions: LigneVue<'v_precision_sensible'>[]
  points: PointsFiche
  ministeres: MinistereListe[]
}

/** Qui lit la fiche : le ministère lit ses valeurs exactes et voit ses boutons de saisie. */
export interface LecteurFiche {
  profil: ProfilFiche
}

/** Nombre de jours pendant lesquels un point traité reste sur la fiche (BRIEF, section 9). */
export const JOURS_POINTS_TRAITES = 7

const SANS_SAISIE_COURBE = 'sans saisie'

// Textes libres

function texteLibre(texte: string): TexteLibre {
  return { texte, masque: texte === TEXTE_MASQUE }
}

function texteLibreOuNull(texte: string | null): TexteLibre | null {
  return texte === null || texte.trim() === '' ? null : texteLibre(texte)
}

// Courbes

function descriptionCourbe(debut: string, points: readonly PointCourbeFiche[]): string {
  const valeurs = points
    .map((point) => (point.valeur === null ? SANS_SAISIE_COURBE : nombre(point.valeur)))
    .join(', ')
  const incomplets = points.filter((point) => point.incomplet === true).length
  const suite =
    incomplets === 0
      ? ''
      : incomplets === 1
        ? ' Une période est incomplète.'
        : ` ${nombreEnDebutDePhrase(incomplets)} périodes sont incomplètes.`
  return `${debut} : ${valeurs}.${suite}`
}

/** Null : aucun point saisi sur toute la période. */
function courbeDe(debut: string, points: PointCourbeFiche[]): CourbeFiche | null {
  if (points.every((point) => point.valeur === null)) return null
  return {
    points: points.map(({ valeur, incomplet }) =>
      incomplet === true ? { valeur, incomplet } : { valeur },
    ),
    description: descriptionCourbe(debut, points),
  }
}

// Valeurs

const VIDE: ValeurFiche = { etat: 'vide' }

function valeurDe(valeur: number | null, unite: UniteIndicateur): ValeurFiche {
  if (valeur === null) return VIDE
  return { etat: 'saisie', texte: formaterValeur(valeur, unite), unite: null }
}

function ecartFiche(
  valeur: number | null,
  precedente: number | null,
  datePrecedente: DateIso,
): EcartFiche | null {
  const ecart = ecartMinistere(valeur, precedente, datePrecedente, 'dimanche')
  if (ecart === null) return null
  const sens =
    ecart.ecart === null
      ? 'non_saisi'
      : ecart.ecart > 0
        ? 'hausse'
        : ecart.ecart < 0
          ? 'baisse'
          : 'stable'
  return { texte: ecart.texte, sens, description: ecart.etiquette }
}

// Chiffres communs

interface Contexte {
  lectures: LecturesFiche
  lecteur: LecteurFiche
  /** Le lecteur lit-il les valeurs exactes de la fiche ? Le ministère seul. */
  exact: boolean
  /** 1er du mois en cours (heure de Paris). */
  moisCourant: DateIso
}

function idCommun(lectures: LecturesFiche, code: string): string | undefined {
  return lectures.communs.find((commun) => commun.code === code)?.id
}

/** Valeurs du ministère pour un commun, de la plus ancienne à la plus récente. */
function mesuresDuCommun(lectures: LecturesFiche, code: string): LigneVue<'v_mesure_periode'>[] {
  const id = idCommun(lectures, code)
  return lectures.mesuresCommuns
    .filter((mesure) => mesure.indicateur_id === id && mesure.valeur !== null)
    .sort((a, b) => (a.periode < b.periode ? -1 : a.periode > b.periode ? 1 : 0))
}

function libelleDemande(lectures: LecturesFiche, code: 'service' | 'actifs' | 'en_fij'): string {
  const demande = lectures.libellesCommuns.find(
    (ligne) => ligne.commun_code === code && !ligne.reference_eglise,
  )
  return demande?.libelle ?? TEXTES_FICHE.communs[code]
}

function ligneService(contexte: Contexte): LigneCommune {
  const { lectures } = contexte
  const reference = lectures.semaine.dimanche
  const mesures = mesuresDuCommun(lectures, 'service').filter((m) => m.periode <= reference)
  const parDimanche = new Map(mesures.map((mesure) => [mesure.periode, mesure.valeur]))
  const derniere = mesures.at(-1)
  const points = Array.from({ length: 10 }, (_, rang) => ({
    valeur: parDimanche.get(ajouterJours(reference, -7 * (9 - rang))) ?? null,
  }))
  const base = {
    cle: 'service',
    libelle: libelleDemande(lectures, 'service'),
    detailSignale: false,
  }
  if (derniere === undefined || derniere.valeur === null) {
    return { ...base, valeur: VIDE, ecart: null, courbe: null, detail: null }
  }
  const precedent = ajouterJours(derniere.periode, -7)
  return {
    ...base,
    valeur: { etat: 'saisie', texte: nombre(derniere.valeur), unite: null },
    ecart: ecartFiche(derniere.valeur, parDimanche.get(precedent) ?? null, precedent),
    courbe: courbeDe('Dix derniers dimanches', points),
    detail: formaterJourSemaineTitre(derniere.periode),
  }
}

/** Dernière valeur « à ce jour » d'un commun, ou undefined. */
function derniereACeJour(lectures: LecturesFiche, code: string) {
  return mesuresDuCommun(lectures, code).at(-1)
}

/**
 * « Saisi le 3 sept. », avec « il y a plus de 30 jours » en orange. Un indicateur propre le lit de
 * `v_indicateur_suivi.plus_de_30_jours` (`plusDe30`) ; un chiffre commun « à ce jour », qui n'a
 * pas cette colonne, le calcule de son jour de saisie.
 */
function detailSaisiLe(
  periode: DateIso,
  aujourdhui: DateIso,
  plusDe30: boolean = joursEntre(periode, aujourdhui) > 30,
): { texte: string; signale: boolean } {
  const texte = `Saisi le ${formaterJourCourt(periode)}`
  return plusDe30
    ? { texte: `${texte}, ${TEXTES_FICHE.plusDe30Jours}`, signale: true }
    : { texte, signale: false }
}

function ligneActifs(contexte: Contexte): LigneCommune {
  const { lectures } = contexte
  const derniere = derniereACeJour(lectures, 'actifs')
  const base = {
    cle: 'actifs',
    libelle: libelleDemande(lectures, 'actifs'),
    ecart: null,
    courbe: null,
  }
  if (derniere === undefined || derniere.valeur === null) {
    return { ...base, valeur: VIDE, detail: null, detailSignale: false }
  }
  const detail = detailSaisiLe(derniere.periode, lectures.semaine.aujourdhui)
  return {
    ...base,
    valeur: { etat: 'saisie', texte: nombre(derniere.valeur), unite: null },
    detail: detail.texte,
    detailSignale: detail.signale,
  }
}

function ligneEnFij(contexte: Contexte): LigneCommune {
  const { lectures } = contexte
  const actifs = derniereACeJour(lectures, 'actifs')?.valeur ?? null
  const enFij = derniereACeJour(lectures, 'en_fij')?.valeur ?? null
  const base = {
    cle: 'en_fij',
    libelle: libelleDemande(lectures, 'en_fij'),
    ecart: null,
    courbe: null,
    detailSignale: false,
  }
  if (actifs === null || enFij === null) return { ...base, valeur: VIDE, detail: null }
  const detail = `${nombre(enFij)} sur ${nombre(actifs)}, ${TEXTES_FICHE.calcule}`
  const pourcentage = pourcentageFij(enFij, actifs)
  return {
    ...base,
    valeur:
      pourcentage === null
        ? { etat: 'non_calcule', texte: TEXTES_VIDES_INDICATEURS.nonCalcule }
        : { etat: 'saisie', texte: nombre(pourcentage), unite: '%' },
    detail,
  }
}

/** Lignes de référence de l'église pour MDS (K52a) : totaux et complétude de l'église. */
function ligneReference(contexte: Contexte, ligne: LigneVue<'v_commun_fiche'>): LigneCommune {
  const { lectures } = contexte
  const base = { cle: `reference-${ligne.commun_code}`, libelle: ligne.libelle, ecart: null }
  if (ligne.commun_code === 'service') {
    const id = idCommun(lectures, 'service')
    const reference = lectures.semaine.dimanche
    const totaux = lectures.totauxDimanche
      .filter((total) => total.indicateur_id === id)
      .sort((a, b) => (a.dimanche < b.dimanche ? -1 : 1))
    const duDimanche = totaux.find((total) => total.dimanche === reference)
    const points = totaux.slice(-10).map((total) => ({
      valeur: total.total,
      incomplet: !completude(total.nb_saisis, total.nb_attendus).complet,
    }))
    if (duDimanche === undefined) {
      return { ...base, valeur: VIDE, courbe: null, detail: null, detailSignale: false }
    }
    return {
      ...base,
      valeur:
        duDimanche.total === null
          ? VIDE
          : { etat: 'saisie', texte: nombre(duDimanche.total), unite: null },
      courbe: courbeDe('Dix derniers dimanches', points),
      detail: `${formaterJourSemaineTitre(reference)}, ${libelleCompletude(duDimanche.nb_saisis, duDimanche.nb_attendus)}`,
      detailSignale: !completude(duDimanche.nb_saisis, duDimanche.nb_attendus).complet,
    }
  }
  const total = lectures.totauxACeJour.find((ligneTotal) => ligneTotal.code === ligne.commun_code)
  if (total === undefined) {
    return { ...base, valeur: VIDE, courbe: null, detail: null, detailSignale: false }
  }
  return {
    ...base,
    valeur: { etat: 'saisie', texte: nombre(total.total), unite: null },
    courbe: null,
    detail: libelleCompletude(total.nb_saisis, total.nb_actifs),
    detailSignale: !completude(total.nb_saisis, total.nb_actifs).complet,
  }
}

function lignesCommunes(contexte: Contexte): LigneCommune[] {
  const references = contexte.lectures.libellesCommuns
    .filter((ligne) => ligne.reference_eglise)
    .sort((a, b) => a.ordre - b.ordre)
    .map((ligne) => ligneReference(contexte, ligne))
  return [ligneService(contexte), ligneActifs(contexte), ligneEnFij(contexte), ...references]
}

// Indicateurs propres

type LigneSuivi = LigneVue<'v_indicateur_suivi'>

function detailPeriode(
  ligne: LigneSuivi,
  periode: DateIso,
  aujourdhui: DateIso,
): { texte: string; signale: boolean } {
  if (ligne.nature === 'dimanche') {
    return { texte: formaterJourSemaineTitre(periode), signale: false }
  }
  if (ligne.nature === 'mois') return { texte: libelleMois(moisDe(periode)), signale: false }
  return detailSaisiLe(periode, aujourdhui, ligne.plus_de_30_jours)
}

function courbeIndicateur(contexte: Contexte, ligne: LigneSuivi): CourbeFiche | null {
  const serie = contexte.lectures.series
    .filter((point) => point.indicateur_id === ligne.indicateur_id)
    .sort((a, b) => a.rang - b.rang)
  if (serie.length === 0) return null
  const debut = ligne.nature === 'mois' ? 'Douze derniers mois' : 'Dix derniers dimanches'
  return courbeDe(
    debut,
    serie.map((point) => ({ valeur: point.valeur, incomplet: !point.complete })),
  )
}

function libelleDepart(nature: NatureIndicateur, depuis: DateIso): string {
  return nature === 'mois'
    ? libelleDepuisMois(moisDe(depuis))
    : `Depuis le ${formaterJourCourt(depuis)}`
}

/** Somme de l'année, exacte pour tous les lecteurs de la fiche, sensible compris (P52). */
function sommeIndicateur(ligne: LigneSuivi): SommeFiche | null {
  if (ligne.somme_depuis === null) return null
  const depuis = libelleDepart(ligne.nature, ligne.somme_depuis)
  const completudeTexte =
    ligne.somme_nb_saisies === null || ligne.somme_nb_attendues === null
      ? null
      : libelleCompletudePeriodes(ligne.somme_nb_saisies, ligne.somme_nb_attendues, ligne.nature)
  const texte =
    ligne.somme_annee === null
      ? `${depuis} : ${TEXTES_VIDES_INDICATEURS.sommeSansSaisie.toLowerCase()}`
      : `${depuis} : ${formaterValeur(ligne.somme_annee, ligne.unite)}`
  return { texte, completude: completudeTexte }
}

function moisSensibles(contexte: Contexte, ligne: LigneSuivi): DateIso[] {
  const mois: DateIso[] = []
  if (ligne.derniere_periode !== null) mois.push(ligne.derniere_periode)
  const moisEnCoursSaisi = ligne.mois_en_cours_valeur !== null
  if (moisEnCoursSaisi && !mois.includes(contexte.moisCourant)) mois.push(contexte.moisCourant)
  return mois
}

function titreMois(contexte: Contexte, mois: DateIso): string {
  return mois === contexte.moisCourant
    ? libelleMoisEnCours(moisDe(mois))
    : libelleMois(moisDe(mois))
}

/** « Malaise : 4 » : valeur exacte (P52). */
function caseRepartition(ligne: LigneVue<'v_ventilation_sensible'>): CaseRepartition[] {
  return ligne.valeur === null ? [] : [{ libelle: ligne.libelle, texte: nombre(ligne.valeur) }]
}

function repartitionDuMois(contexte: Contexte, ligne: LigneSuivi, mois: DateIso): RepartitionMois {
  const titre = titreMois(contexte, mois)
  const cases = contexte.lectures.repartitions
    .filter((rep) => rep.indicateur_id === ligne.indicateur_id && rep.periode === mois)
    .sort((a, b) => a.ordre - b.ordre)
  const lisibles = cases.flatMap(caseRepartition)
  if (lisibles.length === 0) {
    return { mois, titre, etat: 'aucune', texte: pasDeRepartition(moisDe(mois)) }
  }
  return { mois, titre, etat: 'cases', cases: lisibles }
}

function aDesCategories(contexte: Contexte, indicateurId: string): boolean {
  const modele = contexte.lectures.sensibles.find((s) => s.id === indicateurId)?.modele_code
  if (modele === null || modele === undefined) {
    // Sans code de catalogue, une répartition déjà lue dit qu'il y a des catégories.
    return contexte.lectures.repartitions.some((rep) => rep.indicateur_id === indicateurId)
  }
  // Une répartition ne s'écrit que si la liste en cours compte de 3 à 6 catégories (B8) ; une
  // répartition déjà écrite reste lisible, même si la liste a changé depuis.
  const enCours = contexte.lectures.categories.filter(
    (categorie) => categorie.prevu_code === modele && categorie.retiree_le === null,
  ).length
  return (
    (enCours >= 3 && enCours <= 6) ||
    contexte.lectures.repartitions.some((rep) => rep.indicateur_id === indicateurId)
  )
}

function detailSensible(contexte: Contexte, ligne: LigneSuivi): DetailSensible {
  const mois = moisSensibles(contexte, ligne)
  const precisions: PrecisionFiche[] = mois.flatMap((m) => {
    const precision = contexte.lectures.precisions.find(
      (p) => p.indicateur_id === ligne.indicateur_id && p.mois === m,
    )
    return precision === undefined
      ? []
      : [{ mois: m, titre: titrePrecision(moisDe(m)), texte: texteLibre(precision.texte) }]
  })
  // Aucun mois à montrer (jamais saisi) : pas de ligne « Répartition par catégorie » sur un bloc
  // vide (T36). `[]` ne se distingue pas de « rien à afficher » pour un composant, `null` si.
  const repartitions =
    mois.length > 0 && aDesCategories(contexte, ligne.indicateur_id)
      ? mois.map((m) => repartitionDuMois(contexte, ligne, m))
      : null
  return { precisions, repartitions }
}

/** « Octobre en cours : 6 », « Octobre en cours : pas encore de saisie ». */
function texteMoisEnCours(mois: string, valeur: number | null, unite: UniteIndicateur): string {
  if (valeur === null) return moisEnCoursSansSaisie(mois)
  return `${libelleMoisEnCours(mois)} : ${formaterValeur(valeur, unite)}`
}

function ligneSaisie(contexte: Contexte, ligne: LigneSuivi): LigneIndicateurFiche {
  const aujourdhui = contexte.lectures.semaine.aujourdhui
  const detail =
    ligne.derniere_periode === null
      ? null
      : detailPeriode(ligne, ligne.derniere_periode, aujourdhui)
  return {
    id: ligne.indicateur_id,
    libelle: ligne.libelle,
    aValider:
      ligne.etat === 'en_attente'
        ? contexte.exact
          ? texteAjoutAValider('ministere', ligne.attente_jours)
          : TEXTES_FICHE.aValiderParEjpTech
        : null,
    calcul: false,
    jamaisSaisi: ligne.derniere_periode === null && ligne.mois_en_cours_valeur === null,
    valeur: ligne.derniere_periode === null ? VIDE : valeurDe(ligne.derniere_valeur, ligne.unite),
    courbe: courbeIndicateur(contexte, ligne),
    detail: detail?.texte ?? null,
    detailSignale: detail?.signale ?? false,
    somme: sommeIndicateur(ligne),
    moisEnCours:
      ligne.nature === 'mois'
        ? {
            texte: texteMoisEnCours(
              moisDe(contexte.moisCourant),
              ligne.mois_en_cours_valeur,
              ligne.unite,
            ),
          }
        : null,
    sensible: ligne.sensible ? detailSensible(contexte, ligne) : null,
    aides: {},
  }
}

function quandCalcul(nature: NatureIndicateur, periode: DateIso): string {
  if (nature === 'mois') return libelleMois(moisDe(periode))
  if (nature === 'dimanche') return formaterJourSemaineTitre(periode)
  return `Le ${formaterJourCourt(periode)}`
}

/** Raison du « Non calculé », avec `haut_depasse_bas` (P49, ajouté par B4 à `v_calcul`). */
type RaisonLue = RaisonNonCalcule | 'haut_depasse_bas'

/**
 * La raison telle que la base la rend : le type de `v_calcul` (E1) ne nomme pas encore
 * `haut_depasse_bas`, que B4 a ajoutée. La fonction élargit le type sans rien convertir.
 */
function raisonLue(calcul: LigneVue<'v_calcul'>): RaisonLue | null {
  return calcul.non_calcule_raison
}

const NON_CALCULE_A_VERIFIER = 'Non calculé, à vérifier'

function ligneCalcul(
  contexte: Contexte,
  ligne: LigneSuivi,
  calcul: LigneVue<'v_calcul'>,
): LigneIndicateurFiche {
  const raison = raisonLue(calcul)
  const quand = quandCalcul(ligne.nature, calcul.periode)
  let valeur: ValeurFiche
  let detail: string
  if (calcul.resultat !== null) {
    valeur =
      calcul.calcul === 'taux'
        ? { etat: 'saisie', texte: nombre(Math.round(calcul.resultat)), unite: '%' }
        : {
            etat: 'saisie',
            texte: formaterResultatCalcul(calcul.calcul, calcul.resultat, ligne.unite),
            unite: null,
          }
    const avecTermes =
      calcul.haut !== null && calcul.bas !== null && ligne.unite !== 'heure'
        ? ` (${nombre(calcul.haut)} ${calcul.calcul === 'taux' ? 'sur' : 'pour'} ${nombre(calcul.bas)})`
        : ''
    detail = `${quand}${avecTermes}`
  } else if (raison === 'haut_depasse_bas') {
    valeur = { etat: 'non_calcule', texte: NON_CALCULE_A_VERIFIER }
    detail =
      calcul.haut !== null && calcul.bas !== null
        ? partAVerifier(quand, nombre(calcul.haut), nombre(calcul.bas))
        : `${quand}.`
  } else {
    valeur = { etat: 'non_calcule', texte: TEXTES_VIDES_INDICATEURS.nonCalcule }
    const source = contexte.lectures.suivi.find(
      (s) => s.indicateur_id === calcul.non_calcule_source_id,
    )
    // La valeur dit déjà « Non calculé » : le détail ne le répète pas.
    detail = sansPrefixeNonCalcule(
      texteNonCalcule({
        raison,
        nature: ligne.nature,
        periode: calcul.periode,
        libelleSource: source?.libelle ?? null,
        aujourdhui: contexte.lectures.semaine.aujourdhui,
      }),
      `${quand}.`,
    )
  }
  return {
    id: ligne.indicateur_id,
    libelle: ligne.libelle,
    aValider: null,
    calcul: true,
    jamaisSaisi: false,
    valeur,
    courbe: null,
    detail,
    detailSignale: false,
    somme: sommeCalcul(ligne.nature, ligne.unite, calcul),
    moisEnCours: null,
    sensible: null,
    aides: {},
  }
}

function sommeCalcul(
  nature: NatureIndicateur,
  unite: UniteIndicateur,
  calcul: LigneVue<'v_calcul'>,
): SommeFiche | null {
  if (calcul.annee_nb_periodes === null || calcul.annee_nb_attendues === null) return null
  const completudeTexte = libelleCompletudePeriodes(
    calcul.annee_nb_periodes,
    calcul.annee_nb_attendues,
    nature,
  )
  if (calcul.annee_resultat !== null) {
    const valeur =
      calcul.calcul === 'taux'
        ? formaterPourcentage(Math.round(calcul.annee_resultat))
        : formaterResultatCalcul(calcul.calcul, calcul.annee_resultat, unite)
    return { texte: `Sur l'année : ${valeur}`, completude: completudeTexte }
  }
  if (
    calcul.annee_haut !== null &&
    calcul.annee_bas !== null &&
    calcul.annee_bas > 0 &&
    calcul.annee_haut > calcul.annee_bas
  ) {
    return {
      texte: `Sur l'année : ${NON_CALCULE_A_VERIFIER.toLowerCase()}`,
      completude: completudeTexte,
    }
  }
  return null
}

function lignesDeSection(
  contexte: Contexte,
  lignes: readonly LigneSuivi[],
): LigneIndicateurFiche[] {
  return lignes.flatMap((ligne) => {
    if (ligne.calcul === null) return [ligneSaisie(contexte, ligne)]
    // Un calcul étendu (différence, somme, évolution) n'est pas dans `v_calcul` avant le lot L1 :
    // sans résultat ni raison à dire, il n'a pas de ligne.
    const calcul = contexte.lectures.calculs.find((c) => c.indicateur_id === ligne.indicateur_id)
    return calcul === undefined ? [] : [ligneCalcul(contexte, ligne, calcul)]
  })
}

/** Place chaque aide sur la première ligne qui la concerne (aides-contextuelles.md). */
function placerAides(lignes: LigneIndicateurFiche[]): void {
  let calcule = false
  let somme = false
  for (const ligne of lignes) {
    const aides: AidesLigne = {}
    if (!calcule && ligne.calcul) {
      aides.calcule = true
      calcule = true
    }
    if (!somme && ligne.somme?.completude) {
      aides.somme = true
      somme = true
    }
    ligne.aides = aides
  }
}

function sectionsDeLaFiche(contexte: Contexte): {
  sections: SectionFiche[]
  retires: LigneRetiree[]
} {
  const propres = contexte.lectures.suivi.filter(
    (ligne) => ligne.ministere_id === contexte.lectures.ministere.id,
  )
  const sections = regrouperParRythme(propres)
    .map((section) => ({
      nature: section.nature,
      titre: section.titre,
      lignes: lignesDeSection(contexte, section.indicateurs),
    }))
    .filter((section) => section.lignes.length > 0)
  placerAides(sections.flatMap((section) => section.lignes))
  const retires = retiresRanges(propres).map((ligne) => ({
    id: ligne.indicateur_id,
    libelle: ligne.libelle,
    detail:
      ligne.retire_le === null
        ? 'Retiré'
        : `Retiré le ${formaterJourCourt(jourDeParis(ligne.retire_le))}`,
  }))
  return { sections, retires }
}

// Phrase

function phrase(contexte: Contexte) {
  const { lectures } = contexte
  const reference = lectures.semaine.dimanche
  const service = mesuresDuCommun(lectures, 'service').filter((m) => m.periode <= reference)
  const duDimanche = service.find((mesure) => mesure.periode === reference)
  const derniere = service.at(-1)
  const nbEnAttente = lectures.points.points.filter(
    (point) => point.ministere_id === lectures.ministere.id && point.statut === 'attente_decision',
  ).length
  return phraseDeLaFiche({
    dimanche: reference,
    service: duDimanche?.valeur ?? null,
    derniereSaisieService:
      derniere === undefined || derniere.valeur === null
        ? null
        : { valeur: derniere.valeur, dimanche: derniere.periode },
    actifs: derniereACeJour(lectures, 'actifs')?.valeur ?? null,
    enFij: derniereACeJour(lectures, 'en_fij')?.valeur ?? null,
    nbPointsEnAttenteDeDecision: nbEnAttente,
  })
}

/** Fiche prête à afficher. */
export function construireFiche(lectures: LecturesFiche, lecteur: LecteurFiche): DonneesFiche {
  const contexte: Contexte = {
    lectures,
    lecteur,
    exact: lecteur.profil === 'ministere',
    moisCourant: `${moisDe(lectures.semaine.aujourdhui)}-01`,
  }
  const communs = lignesCommunes(contexte)
  const { sections, retires } = sectionsDeLaFiche(contexte)
  const lignes = sections.flatMap((section) => section.lignes)
  const { jours, etat } = fraicheur(lectures.derniereSaisie, lectures.semaine.aujourdhui)
  const ministere = contexte.exact
  const lignesDuMois = lignes.filter((ligne) => !ligne.calcul && ligne.moisEnCours !== null)
  // Un indicateur du mois jamais saisi, ni pour un mois fini ni pour le mois en cours : sinon la
  // ligne dirait « Octobre en cours : 6 » et « attend sa première saisie » à la fois.
  return {
    ministere: {
      id: lectures.ministere.id,
      nom: lectures.ministere.nom,
      code: lectures.ministere.code,
    },
    profil: lecteur.profil,
    phrase: phrase(contexte),
    // « Mis à jour il y a 3 jours », « Mis à jour aujourd'hui », ou « Aucune saisie » (règle 6).
    fraicheur: { libelle: libelleMiseAJour(jours), etat },
    communs,
    sections,
    retires,
    sansIndicateurPropre: sections.length === 0,
    actionSaisirMois: ministere && lignesDuMois.some((ligne) => ligne.jamaisSaisi),
    aDesIndicateursDuMois: ministere && lignesDuMois.length > 0,
    aideCourbe:
      communs.some((ligne) => ligne.courbe !== null) || lignes.some((l) => l.courbe !== null),
  }
}

// Points

function nomsMinisteres(ministeres: readonly MinistereListe[]): Map<string, string> {
  return new Map(
    ministeres.map((m) => [m.id, m.desactive_le === null ? m.nom : `${m.nom} (désactivé)`]),
  )
}

/**
 * Points de la fiche (BRIEF, section 9) : les points ouverts créés par le ministère ou qui le
 * mentionnent (priorité, puis échéance, puis création), puis ceux traités depuis 7 jours au plus.
 */
export function construirePointsFiche(
  lectures: LecturesFiche,
  lecteur: LecteurFiche,
): PointFiche[] {
  const aujourdhui = lectures.semaine.aujourdhui
  const noms = nomsMinisteres(lectures.ministeres)
  const nom = (id: string) => noms.get(id) ?? 'Ministère inconnu'
  const { points, mentions } = lectures.points
  const traitesRecents = trierTraites(points).filter((point) => {
    if (point.traite_le === null) return false
    const jours = joursDepuis(point.traite_le, aujourdhui)
    return jours !== null && jours <= JOURS_POINTS_TRAITES
  })
  const ouverts = trierOuverts(points.filter(estOuvert))
  return [...ouverts, ...traitesRecents].map((point) => {
    const echeance = estOuvert(point) ? libelleEcheance(point.echeance, aujourdhui) : null
    return {
      id: point.id,
      priorite: point.priorite,
      ministere: nom(point.ministere_id),
      echeance:
        echeance === null || point.echeance === null
          ? null
          : { texte: `avant le ${formaterJourCourt(point.echeance)}`, depassee: echeance.depassee },
      titre: texteLibre(point.titre),
      description: texteLibreOuNull(point.description),
      attendu: texteLibreOuNull(point.action_attendue),
      mentions: mentions
        .filter((mention) => mention.point_id === point.id)
        .map((mention) => nom(mention.ministere_id)),
      mentionnePar:
        lecteur.profil === 'ministere' && point.ministere_id !== lectures.ministere.id
          ? nom(point.ministere_id)
          : null,
      traite:
        point.traite_le === null
          ? null
          : {
              texte: TEXTES_FICHE.points.traiteLe(formaterJourCourt(jourDeParis(point.traite_le))),
              commentaire: texteLibreOuNull(point.traite_commentaire),
            },
    }
  })
}
