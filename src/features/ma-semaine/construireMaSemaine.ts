// Construction de « Ma semaine » d'un ministère (BRIEF, section 9 ; décision T57) à partir de ce
// que le ministère lit déjà : ses saisies, ses sessions, sa carte FIJ s'il est FIJ, et deux totaux
// de l'église. Fonctions pures : aucune lecture, aucune date du navigateur (le jour de Paris, le
// lundi et le dimanche de référence viennent de `v_semaine`).
//
// Règles de ce fichier :
// - jamais le nom, la valeur ni la complétude d'un autre ministère : les totaux de l'église ne
//   gardent que des nombres agrégés, et `manquants` n'est jamais lu ;
// - un total de l'église porte toujours sa complétude (« 6 sur 8 ») ;
// - jamais un 0 pour une absence ;
// - la carte et les chiffres par département n'existent que pour le ministère FIJ.

import type { IndicateurCommun, SessionTotaux } from '@/data/eglise'
import type { LigneVue, TypeSession } from '@/lib/base'
import {
  ecartFiche,
  lignesCommunesDuMinistere,
  texteMoisEnCours,
} from '@/features/fiche/construireFiche'
import type { EcartFiche, LigneCommune, ValeurFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { NOMBRE_DEPARTEMENTS, RUBRIQUES_FIJ } from '@/features/saisie-fij/departements'
import type { Departement } from '@/lib/base'
import { libelleCompletude, libelleDepartements } from '@/lib/metier/completude'
import {
  formaterJourAbrege,
  formaterJourCourt,
  formaterJourSemaineTitre,
  jourDeParis,
} from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { libelleMois, libelleMoisEnCours, moisDe } from '@/lib/metier/periodes'
import { nomSession } from '@/lib/metier/phrases'
import { comparerNoms, ESPACE_INSECABLE, nombre } from '@/lib/metier/texte'
import { formaterValeur } from '@/lib/metier/unites'
import { TEXTES_MA_SEMAINE } from './textesMaSemaine'
import type { LigneEglise } from './types'

/** Une session passée telle que `v_session_completude` la donne, sans les noms des manquants. */
export interface SessionLue {
  session_id: string
  type: TypeSession
  intitule: string | null
  date: DateIso
  nb_attendus: number
  nb_saisis: number
  total: number | null
}

/**
 * Une ligne de `v_session_completude` devient une `SessionLue` : seuls ces champs passent, jamais
 * `manquants` (les noms des ministères qui n'ont pas saisi), même si la ligne le porte.
 */
export function versSessionLue(ligne: SessionTotaux): SessionLue {
  return {
    session_id: ligne.session_id,
    type: ligne.type,
    intitule: ligne.intitule,
    date: ligne.date,
    nb_attendus: ligne.nb_attendus,
    nb_saisis: ligne.nb_saisis,
    total: ligne.total,
  }
}

/** Ce que « Ma semaine » lit, une lecture de `src/data/` par propriété. */
export interface LecturesMaSemaine {
  ministereId: string
  /** `v_semaine` : jour de Paris, lundi et dimanche de référence. */
  semaine: { aujourdhui: DateIso; lundi: DateIso; dimanche: DateIso }
  /** Le ministère du compte est-il `fij` ? */
  estFij: boolean
  communs: IndicateurCommun[]
  libellesCommuns: LigneVue<'v_commun_fiche'>[]
  /** `v_mesure_periode` du ministère pour les trois communs. */
  mesuresCommuns: LigneVue<'v_mesure_periode'>[]
  /** `v_indicateur_suivi` du ministère. */
  suivi: LigneVue<'v_indicateur_suivi'>[]
  /** Sessions passées, de la plus récente à la plus ancienne (`lireSessionsPassees`). */
  sessions: readonly SessionLue[]
  /** Sessions où le ministère est attendu (`lireSessionsAttendues`). */
  attendues: readonly string[]
  /** Saisie la plus récente du ministère par session (`lireMesParticipations`). */
  mesParticipations: readonly { session_id: string; valeur: number }[]
  /** `v_total_dimanche`. */
  totauxDimanche: readonly LigneVue<'v_total_dimanche'>[]
  /** Dernière valeur de chaque département (`v_carte_fij`), ministère FIJ seulement. */
  carte: readonly { departement: Departement; valeur: number; saisi_le: string }[]
  /** `v_fij_statistique`, ministère FIJ seulement. */
  statistiques: readonly { dimanche: DateIso; nb_departements: number }[]
}

const VIDE: ValeurFiche = { etat: 'vide' }
const VALEURS_PAR_SEMAINE = RUBRIQUES_FIJ.length * NOMBRE_DEPARTEMENTS

function valeurNombre(valeur: number | null, texte?: string): ValeurFiche {
  if (valeur === null) return VIDE
  return { etat: 'saisie', texte: texte ?? nombre(valeur), unite: null }
}

function ligne(
  cle: string,
  libelle: string,
  valeur: ValeurFiche,
  detail: string | null,
  ecart: EcartFiche | null = null,
): LigneCommune {
  return { cle, libelle, valeur, ecart, courbe: null, detail, detailSignale: false }
}

// Sessions de la semaine

function parDate(a: { date: DateIso }, b: { date: DateIso }): number {
  return a.date === b.date ? 0 : a.date < b.date ? -1 : 1
}

/**
 * Sessions de la semaine où le ministère est attendu : du lundi à aujourd'hui, comme les lignes de
 * « Vos saisies ». Dans l'ordre des dates.
 */
export function sessionsDeLaSemaine(
  lectures: Pick<LecturesMaSemaine, 'semaine' | 'sessions' | 'attendues'>,
): SessionLue[] {
  const attendu = new Set(lectures.attendues)
  return lectures.sessions
    .filter(
      (session) =>
        attendu.has(session.session_id) &&
        session.date >= lectures.semaine.lundi &&
        session.date <= lectures.semaine.aujourdhui,
    )
    .toSorted(parDate)
}

/** Session du même type, juste avant, où le ministère était attendu. Null : aucune. */
function sessionPrecedente(
  session: SessionLue,
  lectures: Pick<LecturesMaSemaine, 'sessions' | 'attendues'>,
): SessionLue | null {
  if (session.type === 'autre') return null
  const attendu = new Set(lectures.attendues)
  return (
    lectures.sessions
      .filter(
        (autre) =>
          autre.type === session.type && autre.date < session.date && attendu.has(autre.session_id),
      )
      .toSorted(parDate)
      .at(-1) ?? null
  )
}

/**
 * Identifiants des sessions dont les présences sont lues : celles de la semaine et, pour l'écart,
 * la session précédente de chaque type. Triés, pour une clé de requête stable.
 */
export function sessionsALire(
  lectures: Pick<LecturesMaSemaine, 'semaine' | 'sessions' | 'attendues'>,
): string[] {
  const ids = new Set<string>()
  for (const session of sessionsDeLaSemaine(lectures)) {
    ids.add(session.session_id)
    const precedente = sessionPrecedente(session, lectures)
    if (precedente !== null) ids.add(precedente.session_id)
  }
  return [...ids].sort()
}

function lignesSessions(lectures: LecturesMaSemaine): LigneCommune[] {
  const saisies = new Map(lectures.mesParticipations.map((p) => [p.session_id, p.valeur]))
  return sessionsDeLaSemaine(lectures).map((session) => {
    const libelle = `${TEXTES_MA_SEMAINE.presentsA} ${nomSession(session.type, session.intitule)}`
    const presents = saisies.get(session.session_id)
    const detail = formaterJourSemaineTitre(session.date)
    if (presents === undefined) {
      return ligne(`session:${session.session_id}`, libelle, VIDE, detail)
    }
    const precedente = sessionPrecedente(session, lectures)
    const ecart =
      precedente === null
        ? null
        : ecartFiche(
            presents,
            saisies.get(precedente.session_id) ?? null,
            precedente.date,
            'session',
          )
    return ligne(`session:${session.session_id}`, libelle, valeurNombre(presents), detail, ecart)
  })
}

// Indicateurs propres

/** Indicateurs propres actifs du ministère, rythme dimanche puis mois, par nom. */
function lignesIndicateursPropres(lectures: LecturesMaSemaine): LigneCommune[] {
  const moisCourant = moisDe(lectures.semaine.aujourdhui)
  return lectures.suivi
    .filter(
      (suivi) =>
        suivi.ministere_id === lectures.ministereId &&
        suivi.calcul === null &&
        suivi.etat === 'actif' &&
        suivi.retire_le === null &&
        (suivi.nature === 'dimanche' || suivi.nature === 'mois'),
    )
    .toSorted((a, b) =>
      a.nature === b.nature ? comparerNoms(a.libelle, b.libelle) : a.nature === 'dimanche' ? -1 : 1,
    )
    .map((suivi): LigneCommune => {
      const cle = `indicateur:${suivi.indicateur_id}`
      const derniere =
        suivi.derniere_periode === null || suivi.derniere_valeur === null
          ? null
          : {
              periode: suivi.derniere_periode,
              texte: formaterValeur(suivi.derniere_valeur, suivi.unite),
              valeur: suivi.derniere_valeur,
            }
      if (suivi.nature === 'dimanche') {
        if (derniere === null) return ligne(cle, suivi.libelle, VIDE, null)
        // Une saisie d'un dimanche plus ancien n'est pas un chiffre de cette semaine : pas de
        // chiffre, la date de la dernière saisie.
        if (derniere.periode < lectures.semaine.dimanche) {
          return ligne(
            cle,
            suivi.libelle,
            VIDE,
            `${TEXTES_MA_SEMAINE.derniereSaisie} ${formaterJourSemaineTitre(derniere.periode).toLowerCase()}`,
          )
        }
        return ligne(
          cle,
          suivi.libelle,
          valeurNombre(derniere.valeur, derniere.texte),
          formaterJourSemaineTitre(derniere.periode),
        )
      }
      // Indicateur du mois : le mois en cours d'abord s'il a une saisie, avec le mois écoulé en
      // détail ; sinon le mois écoulé et « pas encore de saisie » pour le mois en cours.
      if (suivi.mois_en_cours_valeur !== null) {
        // « Août 2026 : 6 », espaces insécables : la valeur ne finit pas seule une ligne (T69).
        const deuxPoints = `${ESPACE_INSECABLE}:${ESPACE_INSECABLE}`
        const detail =
          derniere === null
            ? libelleMoisEnCours(moisCourant)
            : `${libelleMoisEnCours(moisCourant)}. ${libelleMois(moisDe(derniere.periode))}${deuxPoints}${derniere.texte}`
        return ligne(
          cle,
          suivi.libelle,
          valeurNombre(
            suivi.mois_en_cours_valeur,
            formaterValeur(suivi.mois_en_cours_valeur, suivi.unite),
          ),
          detail,
        )
      }
      const enCours = texteMoisEnCours(moisCourant, null, suivi.unite)
      if (derniere === null) return ligne(cle, suivi.libelle, VIDE, enCours)
      return ligne(
        cle,
        suivi.libelle,
        valeurNombre(derniere.valeur, derniere.texte),
        `${libelleMois(moisDe(derniere.periode))}. ${enCours}`,
      )
    })
}

// FIJ

function lignesFij(lectures: LecturesMaSemaine): LigneCommune[] {
  if (!lectures.estFij) return []
  const dernierEnvoi = lectures.carte.reduce<string | null>(
    (plusRecent, depart) =>
      plusRecent === null || new Date(depart.saisi_le) > new Date(plusRecent)
        ? depart.saisi_le
        : plusRecent,
    null,
  )
  const total = lectures.carte.reduce((somme, depart) => somme + depart.valeur, 0)
  const carte =
    dernierEnvoi === null
      ? ligne('carte_fij', TEXTES_MA_SEMAINE.carteFij, VIDE, null)
      : ligne(
          'carte_fij',
          TEXTES_MA_SEMAINE.carteFij,
          valeurNombre(total),
          `${libelleDepartements(lectures.carte.length)}, saisi le ${formaterJourCourt(jourDeParis(dernierEnvoi))}`,
        )
  const valeurs = lectures.statistiques
    .filter((statistique) => statistique.dimanche === lectures.semaine.dimanche)
    .reduce((somme, statistique) => somme + statistique.nb_departements, 0)
  const statistiques =
    valeurs === 0
      ? ligne('fij_statistiques', TEXTES_MA_SEMAINE.statistiquesFij, VIDE, null)
      : ligne(
          'fij_statistiques',
          TEXTES_MA_SEMAINE.statistiquesFij,
          valeurNombre(valeurs),
          `sur ${nombre(VALEURS_PAR_SEMAINE)}, ${formaterJourSemaineTitre(lectures.semaine.dimanche).toLowerCase()}`,
        )
  return [carte, statistiques]
}

// Chiffres du ministère

/** « Vos chiffres de la semaine » : les trois communs, ses sessions, ses indicateurs propres. */
export function construireChiffres(lectures: LecturesMaSemaine): LigneCommune[] {
  return [
    ...lignesCommunesDuMinistere(lectures),
    ...lignesSessions(lectures),
    ...lignesIndicateursPropres(lectures),
  ]
}

/** La carte et les chiffres par département : le ministère FIJ seul, aucune ligne sinon. */
export function construireFij(lectures: LecturesMaSemaine): LigneCommune[] {
  return lignesFij(lectures)
}

// Dans l'église

/**
 * « Dans l'église » : deux totaux au plus, chacun avec sa complétude. Le total du dimanche de
 * référence, puis la dernière session passée. Aucun nom, aucune valeur ni complétude d'un autre
 * ministère, aucun classement.
 */
export function construireDansLEglise(
  lectures: Pick<LecturesMaSemaine, 'semaine' | 'communs' | 'totauxDimanche' | 'sessions'>,
): LigneEglise[] {
  const lignes: LigneEglise[] = []
  const idService = lectures.communs.find((commun) => commun.code === 'service')?.id
  const dimanche = lectures.semaine.dimanche
  const duDimanche = lectures.totauxDimanche.find(
    (total) => total.indicateur_id === idService && total.dimanche === dimanche,
  )
  const jour = formaterJourSemaineTitre(dimanche)
  // Sans ligne de total pour ce dimanche, il n'y a pas de complétude à montrer : un total sans
  // complétude ne s'affiche pas.
  if (duDimanche !== undefined) {
    lignes.push({
      cle: 'service',
      libelle: TEXTES_FICHE.communs.service,
      valeur:
        duDimanche.nb_saisis === 0 || duDimanche.total === null ? null : nombre(duDimanche.total),
      detail: `${jour}, ${libelleCompletude(duDimanche.nb_saisis, duDimanche.nb_attendus)}`,
    })
  }

  const derniere = lectures.sessions.toSorted(parDate).at(-1)
  if (derniere !== undefined) {
    lignes.push({
      cle: 'session',
      libelle: `${TEXTES_MA_SEMAINE.presentsA} ${nomSession(derniere.type, derniere.intitule)}`,
      valeur: derniere.nb_saisis === 0 || derniere.total === null ? null : nombre(derniere.total),
      detail: `${formaterJourAbrege(derniere.date)}, ${libelleCompletude(derniere.nb_saisis, derniere.nb_attendus)}`,
    })
  }
  return lignes
}
