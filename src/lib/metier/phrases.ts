// Phrases générées par des gabarits fixes, sans texte libre (BRIEF.md section 9, « Points ouverts,
// « À décider » et phrases », « Accueil du ministère » et « Bloc de la session » ;
// docs/decisions.md, T10).
//
// Une phrase est une liste de segments : l'interface surligne les segments `surligne`. Le point
// final reste hors du surligneur, comme dans les maquettes 01, 04 et 07. Seuls les noms des
// ministères et des rassemblements (écrits par l'administration) entrent dans une phrase : jamais
// un titre de point, une description ou un commentaire.

import { formaterJourCourt, formaterJourLong, formaterJourSemaine, type DateIso } from './dates'
import { joursDepuis, SEUIL_ATTENTION_JOURS, type MinistereDate } from './fraicheur'
import {
  accorder,
  comparerNoms,
  listeNoms,
  nombre,
  nombreEnDebutDePhrase,
  terminerPhrase,
  trierNoms,
} from './texte'

export interface Segment {
  texte: string
  surligne: boolean
}

export type Phrase = Segment[]

/** Texte brut d'une phrase (lecteurs d'écran, tests). */
export function texteDePhrase(phrase: readonly Segment[]): string {
  return phrase.map((segment) => segment.texte).join('')
}

function normal(texte: string): Segment {
  return { texte, surligne: false }
}

function surligne(texte: string): Segment {
  return { texte, surligne: true }
}

// Partie surlignée qui termine la phrase : le point final reste hors du surligneur, sauf celui
// d'une abréviation (« ... du dimanche 4 oct. »), qui sert de point final.
function surligneFinDePhrase(texte: string): Segment[] {
  const complet = terminerPhrase(texte)
  return complet === texte ? [surligne(texte)] : [surligne(texte), normal('.')]
}

// Assemble les segments et fusionne les voisins de même nature.
function assembler(segments: ReadonlyArray<Segment | null>): Phrase {
  const phrase: Phrase = []
  for (const segment of segments) {
    if (segment === null || segment.texte === '') continue
    const precedent = phrase.at(-1)
    if (precedent !== undefined && precedent.surligne === segment.surligne) {
      phrase[phrase.length - 1] = { ...precedent, texte: precedent.texte + segment.texte }
    } else {
      phrase.push(segment)
    }
  }
  return phrase
}

// Sessions

/** Enum `public.type_session`. */
export type TypeSession = 'batir' | 'anti_dispersion' | 'autre'

export const LIBELLE_TYPE_SESSION: Record<TypeSession, string> = {
  batir: "Bâtir l'Église",
  anti_dispersion: 'Anti-Dispersion',
  autre: 'Autre rassemblement',
}

/** « Bâtir l'Église », « Anti-Dispersion », ou le nom donné à un autre rassemblement. */
export function nomSession(type: TypeSession, intitule: string | null): string {
  return type === 'autre' && intitule ? intitule : LIBELLE_TYPE_SESSION[type]
}

/** « Bâtir l'Église, samedi 26 septembre » (titre du bloc de la session). */
export function titreSession(type: TypeSession, intitule: string | null, date: DateIso): string {
  return `${nomSession(type, intitule)}, ${formaterJourLong(date)}`
}

/** « Bâtir l'Église du 26 sept. » (accueil du ministère, messages de réussite). */
export function sessionDu(type: TypeSession, intitule: string | null, date: DateIso): string {
  return `${nomSession(type, intitule)} du ${formaterJourCourt(date)}`
}

/**
 * Ligne du bloc de la session, s'il y a des STARs déjà comptés :
 * « 61 présences saisies : 3 STARs saisis par deux ministères ne sont comptés qu'une fois. »
 * `totalSaisi` et `total` : `v_session_completude.total_saisi` et `.total`. `null` sinon.
 */
export function phraseDoubleCompte(totalSaisi: number, total: number): string | null {
  const dejaComptes = totalSaisi - total
  if (dejaComptes <= 0) return null
  const presences = accorder(totalSaisi, 'présence saisie', 'présences saisies')
  const stars =
    dejaComptes === 1
      ? "STAR saisi par deux ministères n'est compté"
      : 'STARs saisis par deux ministères ne sont comptés'
  return `${nombre(totalSaisi)} ${presences} : ${nombre(dejaComptes)} ${stars} qu'une fois.`
}

// Phrase de la semaine (berger et conseil) et phrase de l'église (administration)

/** STARs au service du dimanche de référence (`v_total_dimanche`, indicateur `service`). */
export interface ServiceDuDimanche {
  /** Total de l'église, `null` si aucun ministère n'a saisi. */
  total: number | null
  nbSaisis: number
  nbAttendus: number
}

/** Dernière session passée (`v_session_completude` et `v_ecart_session`). */
export interface SessionDeLaPhrase {
  type: TypeSession
  intitule: string | null
  /** Écart à périmètre égal, `null` sans ministère en commun ou sans session précédente. */
  ecart: number | null
  /** Noms des ministères attendus qui n'ont pas saisi. */
  manquants: readonly string[]
}

export interface DonneesPhraseEglise {
  /** Dimanche de référence (`v_semaine.dimanche`). */
  dimanche: DateIso
  /** Jour de Paris (`v_semaine.aujourdhui`). */
  aujourdhui: DateIso
  service: ServiceDuDimanche
  /** Lignes de `v_tableau_ministeres` (ministères actifs). */
  ministeres: readonly MinistereDate[]
  derniereSession: SessionDeLaPhrase | null
}

export interface DonneesPhraseSemaine extends DonneesPhraseEglise {
  /** Points ouverts « En attente de décision » (tous les points : le berger les voit tous). */
  nbPointsEnAttenteDeDecision: number
}

export interface PhraseSemaine {
  principale: Phrase
  /** Ligne secondaire, deux phrases au plus ; `null` s'il n'y a rien à signaler. */
  secondaire: string | null
}

function personneNaSaisi(service: ServiceDuDimanche): boolean {
  return service.nbSaisis === 0 || service.total === null
}

// A : « 52 STARs au service dimanche. », ou personne n'a saisi.
function phraseService(dimanche: DateIso, service: ServiceDuDimanche): string {
  const total = service.total
  if (personneNaSaisi(service) || total === null) {
    return terminerPhrase(
      `Aucun ministère n'a encore saisi les chiffres du ${formaterJourSemaine(dimanche)}`,
    )
  }
  if (total === 0) return 'Aucun STAR au service dimanche.'
  return `${nombreEnDebutDePhrase(total)} ${accorder(total, 'STAR', 'STARs')} au service dimanche.`
}

// B : « Tous les ministères ont saisi », « Deux ministères n'ont pas encore saisi ».
function phraseSaisies(service: ServiceDuDimanche): string {
  const manquants = Math.max(0, service.nbAttendus - service.nbSaisis)
  if (manquants === 0) return 'Tous les ministères ont saisi'
  const verbe = accorder(manquants, "ministère n'a", "ministères n'ont")
  return `${nombreEnDebutDePhrase(manquants)} ${verbe} pas encore saisi`
}

// C : « un point attend votre décision », « 3 points attendent votre décision ».
function phraseDecisions(nb: number, enDebutDePhrase: boolean): string {
  if (nb === 1) return `${enDebutDePhrase ? 'Un' : 'un'} point attend votre décision`
  return `${enDebutDePhrase ? nombreEnDebutDePhrase(nb) : nombre(nb)} points attendent votre décision`
}

// Assemblage « {A} {B}{C}. ». Quand personne n'a saisi, A le dit déjà : B est omis et C devient
// une phrase à part (« Un point attend votre décision. »).
function phrasePrincipale(d: DonneesPhraseEglise, nbDecisions: number): Phrase {
  const a = phraseService(d.dimanche, d.service)
  if (personneNaSaisi(d.service)) {
    if (nbDecisions === 0) return [normal(a)]
    return assembler([normal(`${a} `), ...surligneFinDePhrase(phraseDecisions(nbDecisions, true))])
  }
  const ab = `${a} ${phraseSaisies(d.service)}`
  if (nbDecisions === 0) return [normal(`${ab}.`)]
  return assembler([
    normal(`${ab}, et `),
    ...surligneFinDePhrase(phraseDecisions(nbDecisions, false)),
  ])
}

// « Social n'a rien mis à jour depuis 31 jours. » (plus de 30 jours ; une saisie au moins).
function phraseMinisteresEnRetard(
  ministeres: readonly MinistereDate[],
  aujourdhui: DateIso,
): string | null {
  const enRetard = ministeres
    .map((ministere) => ({
      nom: ministere.nom,
      jours: joursDepuis(ministere.derniere_saisie, aujourdhui) ?? 0,
    }))
    .filter((ministere) => ministere.jours > SEUIL_ATTENTION_JOURS)
    .sort((a, b) => b.jours - a.jours || comparerNoms(a.nom, b.nom))
  const premier = enRetard[0]
  if (premier === undefined) return null
  if (enRetard.length === 1) {
    return `${premier.nom} n'a rien mis à jour depuis ${nombre(premier.jours)} jours.`
  }
  const noms = listeNoms(enRetard.map((ministere) => ministere.nom))
  return `${noms} n'ont rien mis à jour depuis plus de ${SEUIL_ATTENTION_JOURS} jours.`
}

// « Bâtir l'Église progresse de 1 présent. », « recule de 3 présents, et le total est
// incomplet : Coordination et Intégration n'ont pas saisi. », « est stable. »
function phraseSession(session: SessionDeLaPhrase | null): string | null {
  if (session === null || session.ecart === null) return null
  const { ecart } = session
  const presents = accorder(ecart, 'présent', 'présents')
  const evolution =
    ecart > 0
      ? `progresse de ${nombre(ecart)} ${presents}`
      : ecart < 0
        ? `recule de ${nombre(-ecart)} ${presents}`
        : 'est stable'
  const debut = `${nomSession(session.type, session.intitule)} ${evolution}`
  if (session.manquants.length === 0) return `${debut}.`
  const manquants = trierNoms(session.manquants)
  const verbe = accorder(manquants.length, "n'a", "n'ont")
  return `${debut}, et le total est incomplet : ${listeNoms(manquants)} ${verbe} pas saisi.`
}

function ligneSecondaire(d: DonneesPhraseEglise): string | null {
  const phrases = [
    phraseMinisteresEnRetard(d.ministeres, d.aujourdhui),
    phraseSession(d.derniereSession),
  ].filter((phrase): phrase is string => phrase !== null)
  return phrases.length === 0 ? null : phrases.join(' ')
}

/** Phrase de la semaine du berger et du conseil : A, B, C surligné, puis la ligne secondaire. */
export function phraseDeLaSemaine(d: DonneesPhraseSemaine): PhraseSemaine {
  return {
    principale: phrasePrincipale(d, Math.max(0, d.nbPointsEnAttenteDeDecision)),
    secondaire: ligneSecondaire(d),
  }
}

/** Phrase de l'église (administration) : A, B et la ligne secondaire, sans C ni surligneur. */
export function phraseDeLEglise(d: DonneesPhraseEglise): PhraseSemaine {
  return { principale: phrasePrincipale(d, 0), secondaire: ligneSecondaire(d) }
}

// Phrase d'une fiche (04, 12)

export interface DonneesPhraseFiche {
  /** Dimanche de référence (`v_semaine.dimanche`). */
  dimanche: DateIso
  /** Valeur `service` du ministère pour le dimanche de référence, `null` si non saisie. */
  service: number | null
  /** Dernier dimanche saisi, pour « Dernière saisie : ... » ; `null` si jamais saisi. */
  derniereSaisieService: { valeur: number; dimanche: DateIso } | null
  /** Dernières valeurs « à ce jour », `null` si jamais saisies. */
  actifs: number | null
  enFij: number | null
  /** Points ouverts du ministère « En attente de décision ». */
  nbPointsEnAttenteDeDecision: number
}

function partieActifs(actifs: number, enFij: number | null, libelle: [string, string]): string {
  const fij = enFij === null ? '' : ` dont ${nombre(enFij)} en FIJ`
  return `${nombre(actifs)} ${accorder(actifs, ...libelle)}${fij}`
}

/**
 * « 10 STARs au service dimanche, 14 actifs dont 11 en FIJ. » ; dimanche non saisi : « Chiffres
 * du dimanche 27 sept. non saisis. Dernière saisie : 9 STARs au service le 20 sept. ». Une valeur
 * jamais saisie est omise. Surligné : « Un point attend une décision. »
 */
export function phraseDeLaFiche(d: DonneesPhraseFiche): Phrase {
  const phrases: string[] = []
  if (d.service !== null) {
    const service =
      d.service === 0
        ? 'Aucun STAR au service dimanche'
        : `${nombre(d.service)} ${accorder(d.service, 'STAR', 'STARs')} au service dimanche`
    const actifs =
      d.actifs === null ? '' : `, ${partieActifs(d.actifs, d.enFij, ['actif', 'actifs'])}`
    phrases.push(`${service}${actifs}.`)
  } else {
    phrases.push(terminerPhrase(`Chiffres du ${formaterJourSemaine(d.dimanche)} non saisis`))
    const derniere = d.derniereSaisieService
    if (derniere !== null) {
      const stars = accorder(derniere.valeur, 'STAR', 'STARs')
      const quand = formaterJourCourt(derniere.dimanche)
      phrases.push(
        terminerPhrase(
          `Dernière saisie : ${nombre(derniere.valeur)} ${stars} au service le ${quand}`,
        ),
      )
    }
    if (d.actifs !== null) {
      phrases.push(`${partieActifs(d.actifs, d.enFij, ['STAR actif', 'STARs actifs'])}.`)
    }
  }
  const nb = d.nbPointsEnAttenteDeDecision
  if (nb <= 0) return [normal(phrases.join(' '))]
  const decisions =
    nb === 1 ? 'Un point attend une décision' : `${nombre(nb)} points attendent une décision`
  return assembler([normal(`${phrases.join(' ')} `), ...surligneFinDePhrase(decisions)])
}

// Accueil du ministère (07)

/** Une ligne de « Vos saisies », dans l'ordre de l'écran. */
export type SaisieDeLaSemaine =
  | { type: 'dimanche'; dimanche: DateIso; fait: boolean }
  | { type: 'session'; session: TypeSession; intitule: string | null; date: DateIso; fait: boolean }
  | { type: 'reunion'; fait: boolean }
  | { type: 'carte_fij'; fait: boolean }

function ceQuiReste(saisie: SaisieDeLaSemaine): string {
  switch (saisie.type) {
    case 'dimanche':
      return `les chiffres du ${formaterJourSemaine(saisie.dimanche)}`
    case 'session':
      return `la présence à ${sessionDu(saisie.session, saisie.intitule, saisie.date)}`
    case 'reunion':
      return 'la date de la prochaine réunion'
    case 'carte_fij':
      return 'la carte des FIJ'
  }
}

/**
 * « Vos chiffres sont à jour. » si les chiffres et les sessions sont faits, puis, surligné, ce qui
 * reste (« Il reste la date de la prochaine réunion. »). Tout est fait : « Tout est à jour pour la
 * semaine 39. »
 */
export function phraseDAccueil(
  saisies: readonly SaisieDeLaSemaine[],
  numeroSemaine: number,
): Phrase {
  const aFaire = saisies.filter((saisie) => !saisie.fait)
  if (aFaire.length === 0) return [normal(`Tout est à jour pour la semaine ${numeroSemaine}.`)]
  const chiffresFaits = saisies.every(
    (saisie) => (saisie.type !== 'dimanche' && saisie.type !== 'session') || saisie.fait,
  )
  return assembler([
    chiffresFaits ? normal('Vos chiffres sont à jour. ') : null,
    ...surligneFinDePhrase(`Il reste ${listeNoms(aFaire.map(ceQuiReste))}`),
  ])
}

/** Bouton principal jaune : la première chose « À faire » de « Vos saisies », sinon `null`. */
export function libelleBoutonPrincipal(saisies: readonly SaisieDeLaSemaine[]): string | null {
  const premiere = saisies.find((saisie) => !saisie.fait)
  if (premiere === undefined) return null
  switch (premiere.type) {
    case 'dimanche':
      return 'Saisir les chiffres du dimanche'
    case 'session':
      return `Saisir la présence à ${nomSession(premiere.session, premiere.intitule)}`
    case 'reunion':
      return 'Renseigner la prochaine réunion'
    case 'carte_fij':
      return 'Mettre à jour la carte des FIJ'
  }
}
