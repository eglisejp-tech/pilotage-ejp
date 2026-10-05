// Construction de la vue « Cette semaine » à partir des lectures brutes : fonction pure, sans
// appel réseau ni horloge (toutes les dates viennent de v_semaine, heure de Paris).

import type { LigneTable, LigneVue } from '@/lib/base'
import {
  completude,
  libelleAceJour,
  libelleCompletude,
  libelleDepartements,
} from '@/lib/metier/completude'
import {
  formaterJourAbrege,
  formaterJourCourt,
  formaterJourSemaineTitre,
  jourDeParis,
  type DateIso,
} from '@/lib/metier/dates'
import { ecartEglise, type Comparaison } from '@/lib/metier/ecarts'
import { fraicheur, trierParFraicheur, type EtatFraicheur } from '@/lib/metier/fraicheur'
import {
  LIBELLE_TYPE_SESSION,
  nomSession,
  phraseDeLaSemaine,
  phraseDeLEglise,
  phraseDoubleCompte,
  titreSession,
  type Segment,
  type SessionDeLaPhrase,
  type TypeSession,
} from '@/lib/metier/phrases'
import {
  compterEnAttenteDeDecision,
  echeanceDepassee,
  selectionADecider,
} from '@/lib/metier/points'
import { detailFij } from '@/lib/metier/pourcentage'
import { libellePeriode } from '@/lib/metier/semaine'
import { comparerNoms, majusculeInitiale, nombre, nombreEnDebutDePhrase } from '@/lib/metier/texte'
import { TEXTE_MASQUE, TEXTES_VIDES } from './textesVides'
import type {
  ApportSession,
  CodeDepartement,
  ColonnesConseil,
  DerniereSession,
  DonneesADecider,
  DonneesBlocSession,
  DonneesCarteFij,
  DonneesCetteSemaine,
  DonneesCourbe,
  Ecart,
  Fraicheur,
  Lecteur,
  Lien,
  LigneChiffre,
  LigneMinistere,
  MorceauPhrase,
  PointADecider,
  PointCourbe,
  ProchainEvenement,
  Semaine,
  TexteLibre,
  ValeurAffichee,
} from './types'

/**
 * Lectures brutes, une par requête de useCetteSemaine (src/data/eglise.ts, ministeres.ts,
 * points.ts). Les vues ne recomptent rien : complétude et totaux viennent de la base.
 */
export interface LecturesCetteSemaine {
  /** ['eglise','semaine'] : la ligne de v_semaine (sans ligne, useCetteSemaine est en erreur). */
  semaine: LigneVue<'v_semaine'>
  /** Indicateurs communs : relie `indicateur_id` à son code (« service », « actifs »...). */
  indicateurs: Pick<LigneTable<'indicateur'>, 'id' | 'code' | 'nature'>[]
  /** ['eglise','totaux-dimanche'] : dix dimanches par indicateur commun « dimanche ». */
  totauxDimanche: LigneVue<'v_total_dimanche'>[]
  /** ['eglise','ecarts-dimanche'] : écarts du dimanche de référence. */
  ecartsDimanche: LigneVue<'v_ecart_dimanche'>[]
  /** ['eglise','a-ce-jour'] */
  totauxACeJour: LigneVue<'v_total_a_ce_jour'>[]
  /** ['eglise','pourcentage-fij'] : null quand la vue ne rend aucune ligne. */
  pourcentageFij: LigneVue<'v_pourcentage_fij'> | null
  /** ['eglise','carte-fij'] : vide tant que FIJ n'a rien envoyé. */
  carteFij: LigneVue<'v_carte_fij'>[]
  /** ['eglise','sessions'] : sessions passées (`a_eu_lieu`), de la plus récente à la plus ancienne. */
  sessions: LigneVue<'v_session_completude'>[]
  /** ['eglise','ecarts-sessions'] */
  ecartsSessions: LigneVue<'v_ecart_session'>[]
  /** ['eglise','participations',id] : la session affichée ; vide sans session. */
  participations: LigneVue<'v_participation_courante'>[]
  /** ['ministeres','tableau'] : ministères actifs. */
  tableauMinisteres: LigneVue<'v_tableau_ministeres'>[]
  /** ['ministeres','liste'] : tous, désactivés compris (créateurs et mentions « (désactivé) »). */
  ministeres: Pick<LigneTable<'ministere'>, 'id' | 'code' | 'nom' | 'desactive_le'>[]
  /** ['points','ouverts'] : berger et conseil seulement, null pour les autres profils. */
  points: { points: LigneVue<'v_point'>[]; mentions: LigneTable<'point_mention'>[] } | null
}

type LigneSession = LigneVue<'v_session_completude'>
type LigneTableau = LigneVue<'v_tableau_ministeres'>

const NOTE_CHIFFRES =
  "Chaque chiffre additionne les saisies des ministères. Un STAR saisi par deux ministères n'est compté qu'une fois. Courbes : dix derniers dimanches ou quatre dernières sessions."

const DEPARTEMENTS: { code: CodeDepartement; nom: string }[] = [
  { code: '75', nom: 'Paris' },
  { code: '77', nom: 'Seine-et-Marne' },
  { code: '78', nom: 'Yvelines' },
  { code: '91', nom: 'Essonne' },
  { code: '92', nom: 'Hauts-de-Seine' },
  { code: '93', nom: 'Seine-Saint-Denis' },
  { code: '94', nom: 'Val-de-Marne' },
  { code: '95', nom: "Val-d'Oise" },
]

const TYPES_SESSION: TypeSession[] = ['batir', 'anti_dispersion', 'autre']

const LIBELLE_LIEN_SESSION: Record<TypeSession, string> = {
  batir: `Voir ${LIBELLE_TYPE_SESSION.batir}`,
  anti_dispersion: `Voir ${LIBELLE_TYPE_SESSION.anti_dispersion}`,
  autre: 'Voir les autres rassemblements',
}

/** Nombre de sessions du même type dans la courbe. */
const NB_SESSIONS_COURBE = 4

const MINISTERE_INCONNU = 'Ministère inconnu'

// Textes libres

function texteLibre(texte: string): TexteLibre {
  return { texte, masque: texte === TEXTE_MASQUE }
}

function texteLibreOuNull(texte: string | null): TexteLibre | null {
  return texte === null || texte === '' ? null : texteLibre(texte)
}

// Courbes

function enLettres(n: number, feminin: boolean): string {
  if (n === 1) return feminin ? 'une' : 'un'
  return nombreEnDebutDePhrase(n).toLowerCase()
}

// « Les quatre derniers sont incomplets. », « La dernière est incomplète. »
function phraseIncompletes(points: readonly PointCourbe[], feminin: boolean): string {
  const total = points.length
  const incomplets = points.filter((point) => point.incomplet === true).length
  if (incomplets === 0) return ''
  let enQueue = 0
  for (let i = total - 1; i >= 0 && points[i]?.incomplet === true; i -= 1) enQueue += 1
  const e = feminin ? 'e' : ''
  const adjectif = (pluriel: boolean) =>
    `${feminin ? 'incomplète' : 'incomplet'}${pluriel ? 's' : ''}`
  if (enQueue === incomplets) {
    if (total === 1) return ` ${feminin ? 'Elle' : 'Il'} est ${adjectif(false)}.`
    if (incomplets === total) return ` ${feminin ? 'Toutes' : 'Tous'} sont ${adjectif(true)}.`
    if (incomplets === 1)
      return ` ${feminin ? 'La dernière' : 'Le dernier'} est ${adjectif(false)}.`
    return ` Les ${enLettres(incomplets, feminin)} dernier${e}s sont ${adjectif(true)}.`
  }
  const nombreIncomplets = majusculeInitiale(enLettres(incomplets, feminin))
  return ` ${nombreIncomplets} ${incomplets === 1 ? 'est' : 'sont'} ${adjectif(incomplets > 1)}.`
}

/** « Dix derniers dimanches : 49, sans saisie, 52. Le dernier est incomplet. » */
function descriptionCourbe(points: readonly PointCourbe[], feminin: boolean): string {
  const nb = points.length
  const debut =
    nb === 1
      ? feminin
        ? 'Dernière session'
        : 'Dernier dimanche'
      : `${nombreEnDebutDePhrase(nb)} ${feminin ? 'dernières sessions' : 'derniers dimanches'}`
  const valeurs = points
    .map((point) =>
      point.valeur === null ? TEXTES_VIDES.chiffres.pointDeCourbeSansSaisie : nombre(point.valeur),
    )
    .join(', ')
  return `${debut} : ${valeurs}.${phraseIncompletes(points, feminin)}`
}

/** Null : aucun point saisi sur toute la période. */
function courbeDe(points: PointCourbe[], feminin: boolean): DonneesCourbe | null {
  if (points.every((point) => point.valeur === null)) return null
  return { points, description: descriptionCourbe(points, feminin) }
}

// Chiffres

function valeurSaisie(valeur: number, unite: '%' | null = null): ValeurAffichee {
  return { etat: 'saisie', texte: nombre(valeur), unite }
}

const VIDE: ValeurAffichee = { etat: 'vide' }

function completudeAffichee(saisis: number, attendus: number) {
  return {
    texte: libelleCompletude(saisis, attendus),
    complet: completude(saisis, attendus).complet,
  }
}

function sensEcart(ecart: number): Ecart['sens'] {
  if (ecart > 0) return 'hausse'
  return ecart < 0 ? 'baisse' : 'stable'
}

function ecartAffiche(
  brut: { ecart: number; nb_comparables: number } | undefined,
  comparaison: Comparaison,
  precedente: DateIso | null,
): Ecart | null {
  if (brut === undefined) return null
  const affiche = ecartEglise(brut.ecart, brut.nb_comparables, comparaison)
  if (affiche === null) return null
  // T23 : une session se compare à la précédente du même type, nommée par sa date.
  const description =
    precedente === null
      ? affiche.etiquette
      : affiche.etiquette.replace(
          'la session précédente',
          `la session du ${formaterJourCourt(precedente)}`,
        )
  return { texte: affiche.texte, sens: sensEcart(affiche.ecart), description }
}

interface Contexte {
  lectures: LecturesCetteSemaine
  /** Ministères actifs : le « sur N » des lignes sans aucune saisie. */
  nbActifs: number
  nomsMinisteres: Map<string, string>
}

function totalServiceDuDimanche(lectures: LecturesCetteSemaine) {
  const id = lectures.indicateurs.find((indicateur) => indicateur.code === 'service')?.id
  const dimanches = lectures.totauxDimanche
    .filter((ligne) => ligne.indicateur_id === id)
    .sort((a, b) => (a.dimanche < b.dimanche ? -1 : a.dimanche > b.dimanche ? 1 : 0))
  return {
    id,
    dimanches,
    courant: dimanches.find((ligne) => ligne.dimanche === lectures.semaine.dimanche),
  }
}

function ligneService(contexte: Contexte): LigneChiffre {
  const { semaine, ecartsDimanche } = contexte.lectures
  const { id, dimanches, courant } = totalServiceDuDimanche(contexte.lectures)
  const attendus = courant?.nb_attendus ?? contexte.nbActifs
  const base = {
    id: 'service',
    libelle: 'STARs au service',
    date: formaterJourSemaineTitre(semaine.dimanche),
    dateCourte: formaterJourAbrege(semaine.dimanche),
    dateSignalee: false,
  } as const
  const courbe = courbeDe(
    dimanches.map((ligne): PointCourbe => {
      if (ligne.total === null || ligne.nb_saisis === 0) return { valeur: null }
      return ligne.nb_saisis < ligne.nb_attendus
        ? { valeur: ligne.total, incomplet: true }
        : { valeur: ligne.total }
    }),
    false,
  )
  if (courant === undefined || courant.total === null || courant.nb_saisis === 0) {
    return {
      ...base,
      valeur: VIDE,
      ecart: null,
      courbe,
      completude: completudeAffichee(0, attendus),
    }
  }
  const brut = ecartsDimanche.find(
    (ligne) => ligne.indicateur_id === id && ligne.dimanche === semaine.dimanche,
  )
  return {
    ...base,
    valeur: valeurSaisie(courant.total),
    ecart: ecartAffiche(brut, 'dimanche', null),
    courbe,
    completude: completudeAffichee(courant.nb_saisis, attendus),
  }
}

function ligneActifs(contexte: Contexte): LigneChiffre {
  const ligne = contexte.lectures.totauxACeJour.find((total) => total.code === 'actifs')
  const base = {
    id: 'actifs',
    libelle: 'STARs actifs',
    ecart: null,
    courbe: null,
    dateCourte: null,
  } as const
  if (ligne === undefined) {
    return {
      ...base,
      valeur: VIDE,
      date: TEXTES_VIDES.chiffres.dateAceJour,
      dateSignalee: false,
      completude: completudeAffichee(0, contexte.nbActifs),
    }
  }
  const date = libelleAceJour(ligne.nb_plus_de_30_jours)
  return {
    ...base,
    valeur: valeurSaisie(ligne.total),
    date: date.libelle,
    dateSignalee: date.attention,
    completude: completudeAffichee(ligne.nb_saisis, ligne.nb_actifs),
  }
}

function ligneEnFij(contexte: Contexte): LigneChiffre {
  const { pourcentageFij, totauxACeJour } = contexte.lectures
  const base = {
    id: 'en_fij',
    libelle: 'STARs présents en FIJ',
    ecart: null,
    courbe: null,
    dateCourte: null,
    dateSignalee: false,
  } as const
  if (pourcentageFij === null) {
    return {
      ...base,
      valeur: VIDE,
      date: TEXTES_VIDES.chiffres.dateAceJour,
      completude: completudeAffichee(0, contexte.nbActifs),
    }
  }
  const nbActifs =
    totauxACeJour.find((total) => total.code === 'actifs')?.nb_actifs ?? contexte.nbActifs
  return {
    ...base,
    // Pourcentage nul : la somme des actifs est nulle (BRIEF, règle 4).
    valeur:
      pourcentageFij.pourcentage === null
        ? { etat: 'non_calcule' }
        : valeurSaisie(pourcentageFij.pourcentage, '%'),
    date:
      detailFij(pourcentageFij.en_fij, pourcentageFij.actifs) ?? TEXTES_VIDES.chiffres.dateAceJour,
    completude: completudeAffichee(pourcentageFij.nb_ministeres, nbActifs),
  }
}

function ligneCarte(contexte: Contexte): LigneChiffre {
  const lignes = contexte.lectures.carteFij
  const base = {
    id: 'carte_fij',
    libelle: 'FIJ en Île-de-France',
    ecart: null,
    courbe: null,
    dateCourte: null,
    dateSignalee: false,
  } as const
  if (lignes.length === 0) {
    return {
      ...base,
      valeur: VIDE,
      date: TEXTES_VIDES.chiffres.dateAceJour,
      completude: { texte: libelleDepartements(0), complet: false },
    }
  }
  const total = lignes.reduce((somme, ligne) => somme + ligne.valeur, 0)
  const plusRecente = lignes.reduce(
    (max, ligne) => (ligne.saisi_le > max ? ligne.saisi_le : max),
    '',
  )
  return {
    ...base,
    valeur: valeurSaisie(total),
    date: `Saisi par FIJ le ${formaterJourCourt(jourDeParis(plusRecente))}`,
    completude: {
      texte: libelleDepartements(lignes.length),
      complet: lignes.length >= DEPARTEMENTS.length,
    },
  }
}

/**
 * Ligne d'un type de session : la plus récente (premier élément, `sessionsDuType` va de la plus
 * récente à la plus ancienne), son écart avec la précédente et la courbe des quatre dernières.
 */
function ligneSession(
  id: LigneChiffre['id'],
  libelle: string,
  sessionsDuType: readonly LigneSession[],
  contexte: Contexte,
  avecCourbe: boolean,
): LigneChiffre {
  const derniere = sessionsDuType[0]
  if (derniere === undefined) {
    return {
      id,
      libelle,
      valeur: VIDE,
      ecart: null,
      courbe: null,
      date: TEXTES_VIDES.chiffres.dateSansSession,
      dateCourte: null,
      dateSignalee: false,
      completude: null,
    }
  }
  const brut = contexte.lectures.ecartsSessions.find((e) => e.session_id === derniere.session_id)
  const precedente = sessionsDuType[1]?.date ?? null
  const points = sessionsDuType
    .slice(0, NB_SESSIONS_COURBE)
    .reverse()
    .map((session): PointCourbe => {
      if (session.nb_saisis === 0) return { valeur: null }
      return session.nb_saisis < session.nb_attendus
        ? { valeur: session.total, incomplet: true }
        : { valeur: session.total }
    })
  const saisie = derniere.nb_saisis > 0
  return {
    id,
    libelle,
    valeur: saisie ? valeurSaisie(derniere.total) : VIDE,
    ecart: saisie ? ecartAffiche(brut, 'session', precedente) : null,
    courbe: avecCourbe ? courbeDe(points, true) : null,
    date: formaterJourSemaineTitre(derniere.date),
    dateCourte: formaterJourAbrege(derniere.date),
    dateSignalee: false,
    completude: completudeAffichee(derniere.nb_saisis, derniere.nb_attendus),
  }
}

function deType(sessions: readonly LigneSession[], type: TypeSession): LigneSession[] {
  return sessions.filter((session) => session.type === type)
}

function lignesChiffres(contexte: Contexte): LigneChiffre[] {
  const { sessions } = contexte.lectures
  return [
    ligneService(contexte),
    ligneActifs(contexte),
    ligneEnFij(contexte),
    ligneCarte(contexte),
    ligneSession(
      'batir',
      `Présents à ${LIBELLE_TYPE_SESSION.batir}`,
      deType(sessions, 'batir'),
      contexte,
      true,
    ),
    ligneSession(
      'anti_dispersion',
      `Présents à ${LIBELLE_TYPE_SESSION.anti_dispersion}`,
      deType(sessions, 'anti_dispersion'),
      contexte,
      true,
    ),
  ]
}

/** Résumé du ministère sous 600 px : service, présents en FIJ, dernière session. */
function resumeMinistere(
  chiffres: LigneChiffre[],
  contexte: Contexte,
): [LigneChiffre, LigneChiffre, LigneChiffre] {
  const [service, , enFij] = chiffres
  if (service === undefined || enFij === undefined) {
    throw new Error('Lignes de chiffres manquantes.')
  }
  const derniere = contexte.lectures.sessions[0]
  const ligneDerniere =
    derniere === undefined
      ? ligneSession('derniere_session', TEXTES_VIDES.session.titre, [], contexte, false)
      : ligneSession(
          'derniere_session',
          `Présents à ${nomSession(derniere.type, derniere.intitule)}`,
          deType(contexte.lectures.sessions, derniere.type),
          contexte,
          derniere.type !== 'autre',
        )
  return [service, enFij, ligneDerniere]
}

// Bloc de la session

/** La session affichée : la plus récente du type choisi, sinon la dernière tous types confondus. */
export function choisirSession(
  sessions: readonly LigneSession[],
  typeSession: TypeSession | null,
): LigneSession | null {
  if (typeSession === null) return sessions[0] ?? null
  return sessions.find((session) => session.type === typeSession) ?? null
}

// T20 : un lien vers chaque autre type qui a une session passée.
function liensAutresTypes(sessions: readonly LigneSession[], exclu: TypeSession): Lien[] {
  return TYPES_SESSION.filter(
    (type) => type !== exclu && sessions.some((session) => session.type === type),
  ).map((type) => ({ libelle: LIBELLE_LIEN_SESSION[type], href: `/?session=${type}` }))
}

// T21 : apport décroissant, puis nom ; ceux qui n'ont pas saisi en dernier, par nom.
function comparerApports(a: ApportSession, b: ApportSession): number {
  if (a.valeur === null && b.valeur === null) return comparerNoms(a.ministere, b.ministere)
  if (a.valeur === null) return 1
  if (b.valeur === null) return -1
  return b.valeur - a.valeur || comparerNoms(a.ministere, b.ministere)
}

function derniereSession(session: LigneSession, contexte: Contexte): DerniereSession {
  const apportsSaisis = contexte.lectures.participations
    .filter((participation) => participation.session_id === session.session_id)
    .map((participation): ApportSession => ({
      ministere: contexte.nomsMinisteres.get(participation.ministere_id) ?? MINISTERE_INCONNU,
      valeur: participation.compte_dans_total,
      saisis:
        participation.valeur === participation.compte_dans_total ? null : participation.valeur,
    }))
  const manquants = session.manquants.map((ministere): ApportSession => ({
    ministere,
    valeur: null,
    saisis: null,
  }))
  const aSaisi = session.nb_saisis > 0
  return {
    titre: titreSession(session.type, session.intitule, session.date),
    // Personne n'a saisi : la vue rend 0, qui serait un zéro trompeur.
    total: aSaisi ? session.total : null,
    saisis: session.nb_saisis,
    attendus: session.nb_attendus,
    apports: [...apportsSaisis, ...manquants].sort(comparerApports),
    noteDoubleCompte: aSaisi ? phraseDoubleCompte(session.total_saisi, session.total) : null,
    autres: liensAutresTypes(contexte.lectures.sessions, session.type),
  }
}

function blocSession(contexte: Contexte, typeSession: TypeSession | null): DonneesBlocSession {
  const { sessions } = contexte.lectures
  const choisie = choisirSession(sessions, typeSession)
  if (choisie !== null) return { etat: 'session', session: derniereSession(choisie, contexte) }
  if (typeSession === null) return { etat: 'aucune_session' }
  return {
    etat: 'aucune_session_du_type',
    type: typeSession,
    titre: LIBELLE_TYPE_SESSION[typeSession],
    autres: liensAutresTypes(sessions, typeSession),
  }
}

// Carte des FIJ

function carteFij(lignes: readonly LigneVue<'v_carte_fij'>[]): DonneesCarteFij | null {
  if (lignes.length === 0) return null
  return {
    total: lignes.reduce((somme, ligne) => somme + ligne.valeur, 0),
    departements: DEPARTEMENTS.map(({ code, nom }) => ({
      code,
      nom,
      valeur: lignes.find((ligne) => ligne.departement === code)?.valeur ?? null,
    })),
  }
}

// Ministères

const FRAICHEUR: Record<EtatFraicheur, Fraicheur['etat']> = {
  bien: 'a_jour',
  attention: 'a_surveiller',
  alerte: 'en_retard',
}

function prochainEvenement(ligne: LigneTableau): ProchainEvenement {
  if (ligne.prochain_evenement_date === null || ligne.prochain_evenement_titre === null) {
    return { etat: 'aucun' }
  }
  return {
    etat: 'prevu',
    date: formaterJourCourt(ligne.prochain_evenement_date),
    nom: texteLibre(ligne.prochain_evenement_titre),
  }
}

function colonnesConseil(ligne: LigneTableau): ColonnesConseil {
  return {
    prochaineReunion:
      ligne.prochaine_reunion_date === null
        ? null
        : formaterJourCourt(ligne.prochaine_reunion_date),
    pointOuvert: ligne.point_ouvert_priorite,
  }
}

function ligneMinistere(
  ligne: LigneTableau,
  aujourdhui: DateIso,
): Omit<LigneMinistere, 'href' | 'conseil'> {
  const { libelle, etat } = fraicheur(ligne.derniere_saisie, aujourdhui)
  return {
    id: ligne.ministere_id,
    nom: ligne.nom,
    fraicheur: { libelle, etat: FRAICHEUR[etat] },
    prochainEvenement: prochainEvenement(ligne),
  }
}

// À décider

// « Social (désactivé) » : un ministère désactivé garde son nom et sa mention (T24).
function nomAvecEtat(contexte: Contexte, id: string): string {
  const nom = contexte.nomsMinisteres.get(id) ?? MINISTERE_INCONNU
  const ministere = contexte.lectures.ministeres.find((m) => m.id === id)
  return ministere?.desactive_le ? `${nom} (désactivé)` : nom
}

function pointADecider(point: LigneVue<'v_point'>, contexte: Contexte): PointADecider {
  const mentions = (contexte.lectures.points?.mentions ?? [])
    .filter((mention) => mention.point_id === point.id)
    .map((mention) => nomAvecEtat(contexte, mention.ministere_id))
    .sort(comparerNoms)
  return {
    id: point.id,
    priorite: point.priorite,
    ministere: nomAvecEtat(contexte, point.ministere_id),
    echeance:
      point.echeance === null
        ? null
        : {
            texte: `avant le ${formaterJourCourt(point.echeance)}`,
            depassee: echeanceDepassee(point.echeance, contexte.lectures.semaine.aujourdhui),
          },
    titre: texteLibre(point.titre),
    description: texteLibreOuNull(point.description),
    attendu: texteLibreOuNull(point.action_attendue),
    mentions,
  }
}

function aDecider(contexte: Contexte): DonneesADecider {
  const selection = selectionADecider(contexte.lectures.points?.points ?? [])
  return {
    points: selection.points.map((point) => pointADecider(point, contexte)),
    urgent: selection.urgent,
    lienTousLesPoints: '/points?vue=ouverts',
  }
}

// Phrase

function morceaux(phrase: readonly Segment[]): MorceauPhrase[] {
  return phrase.map((segment) =>
    segment.surligne ? { texte: segment.texte, aDecider: true } : { texte: segment.texte },
  )
}

function sessionDeLaPhrase(contexte: Contexte): SessionDeLaPhrase | null {
  const derniere = contexte.lectures.sessions[0]
  if (derniere === undefined) return null
  const brut = contexte.lectures.ecartsSessions.find((e) => e.session_id === derniere.session_id)
  return {
    type: derniere.type,
    intitule: derniere.intitule,
    ecart: brut?.ecart ?? null,
    manquants: derniere.manquants,
  }
}

function semaineAffichee(semaine: LigneVue<'v_semaine'>): Semaine {
  return { numero: semaine.numero, periode: libellePeriode(semaine.lundi, semaine.dimanche) }
}

/**
 * Données prêtes à afficher pour un lecteur et, s'il est choisi par `?session=`, un type de
 * session (null : la dernière session passée, tous types confondus ; T20).
 *
 * États vides produits (types.ts, TEXTES_VIDES ; T22) :
 * - service sans saisie du dimanche de référence (total null ou nb_saisis 0) : valeur `vide`,
 *   complétude « 0 sur 8 », pas d'écart ; courbe null si les dix dimanches sont vides ;
 * - actifs ou carte sans ligne : valeur `vide`, date « À ce jour » ; pourcentage FIJ sans ligne :
 *   `vide`, avec une ligne mais `pourcentage` null : `non_calcule` ;
 * - session passée sans saisie (nb_saisis 0, `total` vaut alors 0 dans la vue) : total null,
 *   trou dans la courbe ; type sans session passée : ligne `vide`, date « Aucune session pour
 *   l'instant », complétude null, ni écart ni courbe ;
 * - un texte libre égal à TEXTE_MASQUE porte `masque: true`.
 */
export function construireCetteSemaine(
  lectures: LecturesCetteSemaine,
  lecteur: Lecteur,
  typeSession: TypeSession | null,
): DonneesCetteSemaine {
  const { semaine } = lectures
  const contexte: Contexte = {
    lectures,
    nbActifs: lectures.tableauMinisteres.length,
    nomsMinisteres: new Map(lectures.ministeres.map((ministere) => [ministere.id, ministere.nom])),
  }
  const chiffres = lignesChiffres(contexte)
  const { courant } = totalServiceDuDimanche(lectures)
  const donneesPhrase = {
    dimanche: semaine.dimanche,
    aujourdhui: semaine.aujourdhui,
    service: {
      total: courant?.total ?? null,
      nbSaisis: courant?.nb_saisis ?? 0,
      nbAttendus: courant?.nb_attendus ?? contexte.nbActifs,
    },
    ministeres: lectures.tableauMinisteres,
    derniereSession: sessionDeLaPhrase(contexte),
  }
  const commun = {
    semaine: semaineAffichee(semaine),
    chiffres,
    noteChiffres: NOTE_CHIFFRES,
    session: blocSession(contexte, typeSession),
    carte: carteFij(lectures.carteFij),
  }
  const triees = trierParFraicheur(lectures.tableauMinisteres, semaine.aujourdhui)
  const ligneDe = (ligne: LigneTableau) => ligneMinistere(ligne, semaine.aujourdhui)

  switch (lecteur.profil) {
    case 'berger':
    case 'conseil': {
      const phrase = phraseDeLaSemaine({
        ...donneesPhrase,
        nbPointsEnAttenteDeDecision: compterEnAttenteDeDecision(lectures.points?.points ?? []),
      })
      return {
        ...commun,
        profil: lecteur.profil,
        phrase: morceaux(phrase.principale),
        ligneSecondaire: phrase.secondaire,
        aDecider: aDecider(contexte),
        ministeres: triees.map((ligne) => ({
          ...ligneDe(ligne),
          href: `/ministeres/${ligne.ministere_id}`,
          conseil: colonnesConseil(ligne),
        })),
      }
    }
    case 'admin_eglise': {
      const phrase = phraseDeLEglise(donneesPhrase)
      return {
        ...commun,
        profil: 'admin_eglise',
        phrase: morceaux(phrase.principale),
        ligneSecondaire: phrase.secondaire,
        ministeres: triees.map((ligne) => ({ ...ligneDe(ligne), href: null, conseil: null })),
      }
    }
    case 'ministere': {
      const phrase = phraseDeLEglise(donneesPhrase)
      return {
        ...commun,
        profil: 'ministere',
        phrase: morceaux(phrase.principale),
        ligneSecondaire: phrase.secondaire,
        resume: resumeMinistere(chiffres, contexte),
        ministeres: triees.map((ligne) => ({
          ...ligneDe(ligne),
          href: ligne.ministere_id === lecteur.ministereId ? '/ma-fiche' : null,
          conseil: null,
        })),
      }
    }
  }
}
