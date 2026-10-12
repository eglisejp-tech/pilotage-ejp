// L'écran 06 en mots : chaque ligne de `v_journal` devient une date, un compte, une action et un
// détail (BRIEF, section 6, « Journal », colonne « Détail affiché »). Le détail ne contient que des
// codes, des nombres, des dates et des identifiants (jamais un texte libre ni une valeur d'un
// indicateur propre ou sensible) ; le seul texte libre est celui de l'objet visé (`cible_texte`,
// titre actuel d'un point ou d'un événement, libellé d'un indicateur), lu sous la RLS du lecteur.
// Masqué par EJP Tech, il s'affiche en `--encre-3`. Illisible pour le lecteur (`null`), la ligne
// dit « un point de Communication ».

import type { IndicateurCommun } from '@/data/eglise'
import type { LigneJournal, SessionJournal } from '@/data/journal'
import { libelleStatut } from '@/features/evenements/textes'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'
import { libelleAction } from '@/features/journal/libellesActions'
import type { LigneJournalAffichee, SegmentDetail } from '@/features/journal/modeleJournal'
import { LIBELLES_ECRAN } from '@/features/signalement/textes'
import {
  estDateIso,
  formaterHorodatage,
  formaterJourCourt,
  formaterJourSemaine,
  formaterRendezVous,
} from '@/lib/metier/dates'
import type { StatutEvenement } from '@/lib/base'
import { LIBELLE_STATUT } from '@/lib/metier/points'
import { LIBELLE_TYPE_SESSION, nomSession } from '@/lib/metier/phrases'
import type { TypeSession } from '@/lib/metier/phrases'
import { accorder, listeNoms, nombre } from '@/lib/metier/texte'

/** Ce que `construireLigne` sait d'ailleurs : les noms que le journal ne porte pas. */
export interface ContexteJournal {
  /** Code (« service », « actifs », « en_fij ») de chaque indicateur commun, par identifiant. */
  codesCommuns: ReadonlyMap<string, string>
  /** Nom de chaque ministère, désactivés compris, par identifiant. */
  ministeres: ReadonlyMap<string, string>
  /** Sessions citées par les lignes, par identifiant. */
  sessions: ReadonlyMap<string, SessionJournal>
}

/** Le contexte d'une lecture : les listes de la base, rangées par identifiant. */
export function contexteJournal(
  communs: readonly IndicateurCommun[],
  ministeres: readonly { id: string; nom: string }[],
  sessions: readonly SessionJournal[],
): ContexteJournal {
  return {
    codesCommuns: new Map(
      communs.flatMap((commun) =>
        commun.code === null ? [] : [[commun.id, commun.code] as const],
      ),
    ),
    ministeres: new Map(ministeres.map((ministere) => [ministere.id, ministere.nom] as const)),
    sessions: new Map(sessions.map((session) => [session.id, session] as const)),
  }
}

type Detail = LigneJournal['detail']

const simple = (texte: string): SegmentDetail => ({ texte, masque: false })

/** Marqueur d'un indicateur retiré pour confidentialité (`private.retirer_indicateur`). */
const TEXTE_RETIRE = '[retiré pour confidentialité]'

const MARQUEURS_MASQUES = [TEXTE_MASQUE, TEXTE_RETIRE]

/**
 * Un texte de la base : le marqueur de la modération ou du retrait, seul (« [texte masqué par EJP
 * Tech] ») ou dans une phrase de la vue (« Précision : [retiré pour confidentialité], octobre
 * 2026 »), se coupe en son propre segment, grisé ; le reste garde la couleur normale.
 */
function libre(texte: string): SegmentDetail[] {
  const marqueur = MARQUEURS_MASQUES.find((candidat) => texte.includes(candidat))
  if (marqueur === undefined) return [simple(texte)]
  const debut = texte.indexOf(marqueur)
  const avant = texte.slice(0, debut)
  const apres = texte.slice(debut + marqueur.length)
  return [
    ...(avant === '' ? [] : [simple(avant)]),
    { texte: marqueur, masque: true },
    ...(apres === '' ? [] : libre(apres)),
  ]
}

function nombreDe(detail: Detail, cle: string): number | null {
  const valeur = detail?.[cle]
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
}

function texteDe(detail: Detail, cle: string): string | null {
  const valeur = detail?.[cle]
  return typeof valeur === 'string' && valeur !== '' ? valeur : null
}

function jourDe(detail: Detail, cle: string): string | null {
  const valeur = texteDe(detail, cle)
  return valeur !== null && estDateIso(valeur) ? valeur : null
}

/** « de Social », « d'Intégration » : l'élision devant une voyelle. */
export function deMinistere(nom: string): string {
  return /^[AEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜŒÆaeiouyàâäéèêëîïôöùûüœæ]/.test(nom) ? `d'${nom}` : `de ${nom}`
}

/** Ce que dit la ligne quand le texte de son objet est illisible : « un point de Communication ». */
const OBJET_SANS_TEXTE: Readonly<Record<string, string>> = {
  point_attention: 'un point',
  point_suivi: 'un point',
  evenement: 'un événement',
  reunion: 'une réunion',
  indicateur: 'un indicateur',
  demande_indicateur: "une demande d'indicateur",
  validation: 'une décision sur un indicateur',
  precision_sensible: 'une précision sur un indicateur sensible',
  signalement: 'un signalement',
  signalement_suivi: 'un signalement',
  session: 'une session',
  compte: 'un compte',
  ministere: 'un ministère',
}

/** Le nom de l'objet d'un texte relu ou masqué : « Point de Social », « Réunion ». */
const TEXTE_DE_LA_MODERATION: Readonly<Record<string, string>> = {
  point_attention: 'Point',
  point_suivi: "Suivi d'un point",
  evenement: 'Événement',
  reunion: 'Réunion',
  demande_indicateur: "Demande d'indicateur",
  validation: 'Décision sur un indicateur',
  precision_sensible: "Précision d'un indicateur sensible",
  signalement: 'Signalement',
  signalement_suivi: "Clôture d'un signalement",
}

/** Motifs d'un texte masqué (`moderation.motif`, BRIEF section 6) : un code, jamais du texte. */
const MOTIFS_MASQUAGE: Readonly<Record<string, string>> = {
  nom_personne: "nom d'une personne",
  coordonnees: 'coordonnées',
  situation_personnelle: 'situation personnelle',
  autre: 'autre',
}

/** Motifs de retrait d'un indicateur (contrat de l'étape 4, section 4). */
const MOTIFS_RETRAIT: Readonly<Record<string, string>> = {
  plus_suivi: "n'est plus suivi",
  doublon: 'doublon',
  erreur: 'créé par erreur',
  se_calcule: 'se calcule',
  deja_commun: 'existe déjà en chiffre commun',
  domaine_sensible: 'domaine sensible',
  hors_regles: 'hors des règles',
  remplace: 'remplacé',
  confidentialite: 'confidentialité',
  source_retiree: 'sa source est retirée',
  refuse: 'refusé',
}

/** Libellés des chiffres communs dans un envoi (maquettes 04, 06 et 12). */
const CHIFFRES_COMMUNS: readonly {
  code: string
  ecrire: (valeur: string, jour: string) => string
}[] = [
  { code: 'service', ecrire: (valeur, jour) => `STARs au service${jour} : ${valeur}` },
  { code: 'actifs', ecrire: (valeur, jour) => `STARs actifs${jour} : ${valeur}` },
  { code: 'en_fij', ecrire: (valeur) => `dont ${valeur} en FIJ` },
]

interface LigneDeMesure {
  indicateurId: string | null
  jour: string | null
  valeur: number | null
  corrige: boolean
}

function lignesDeMesure(detail: Detail): LigneDeMesure[] {
  const lignes = detail?.['lignes']
  if (!Array.isArray(lignes)) return []
  return lignes.flatMap((ligne: unknown): LigneDeMesure[] => {
    if (typeof ligne !== 'object' || ligne === null) return []
    const { indicateur_id: id, date_ref: jour, valeur, corrige } = ligne as Record<string, unknown>
    return [
      {
        indicateurId: typeof id === 'string' ? id : null,
        jour: typeof jour === 'string' && estDateIso(jour) ? jour : null,
        valeur: typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null,
        corrige: corrige === true,
      },
    ]
  })
}

/**
 * Un envoi de chiffres : « STARs au service du 27 sept. : 10, STARs actifs : 14, dont 11 en FIJ ».
 * Seules les valeurs des chiffres communs sont au journal ; un indicateur propre ou sensible se
 * compte, sans nom ni valeur. Une ligne qui remplace une valeur déjà saisie ajoute « (correction) ».
 */
function chiffresSaisis(detail: Detail, codes: ReadonlyMap<string, string>): string {
  const lignes = lignesDeMesure(detail)
  const communes = CHIFFRES_COMMUNS.flatMap((chiffre) => {
    const ligne = lignes.find(
      (candidate) =>
        candidate.indicateurId !== null &&
        codes.get(candidate.indicateurId) === chiffre.code &&
        candidate.valeur !== null,
    )
    return ligne === undefined ? [] : [{ chiffre, ligne }]
  })
  const autres = lignes.length - communes.length
  const morceaux = communes.map(({ chiffre, ligne }, rang) => {
    const jour = rang === 0 && ligne.jour !== null ? ` du ${formaterJourCourt(ligne.jour)}` : ''
    return chiffre.ecrire(nombre(ligne.valeur ?? 0), jour)
  })
  if (autres > 0) {
    morceaux.push(
      communes.length === 0
        ? `${nombre(autres)} ${accorder(autres, 'chiffre', 'chiffres')} d'indicateurs du ministère`
        : `${nombre(autres)} ${accorder(autres, 'autre chiffre', 'autres chiffres')}`,
    )
  }
  const texte = morceaux.length === 0 ? "Chiffres d'indicateurs du ministère" : morceaux.join(', ')
  return lignes.some((ligne) => ligne.corrige) ? `${texte} (correction)` : texte
}

function typeDeSession(valeur: string | null): TypeSession | null {
  return valeur !== null && Object.hasOwn(LIBELLE_TYPE_SESSION, valeur)
    ? (valeur as TypeSession)
    : null
}

/** « Bâtir l'Église du 26 sept. », ou « Une session » quand elle n'existe plus ni dans le journal. */
function nomDeLaSession(ligne: LigneJournal, contexte: ContexteJournal): string | null {
  const session = ligne.cible_id === null ? undefined : contexte.sessions.get(ligne.cible_id)
  if (session === undefined) return null
  return `${nomSession(session.type, session.intitule)} du ${formaterJourCourt(session.date)}`
}

/** L'objet visé : son texte actuel, sinon « un point de Communication » (illisible pour le lecteur). */
function objet(ligne: LigneJournal): SegmentDetail[] {
  const texte = ligne.cible_texte?.trim() ?? ''
  if (texte !== '') return libre(texte)
  const sans = OBJET_SANS_TEXTE[ligne.cible ?? ''] ?? 'un élément'
  return [
    simple(ligne.ministere_nom === null ? sans : `${sans} ${deMinistere(ligne.ministere_nom)}`),
  ]
}

/** « Point de Social », « Réunion » : de quoi parle un texte relu ou masqué, sans le texte. */
function texteModere(ligne: LigneJournal): string {
  const nom = TEXTE_DE_LA_MODERATION[ligne.cible ?? ''] ?? 'Texte'
  return ligne.ministere_nom === null ? nom : `${nom} ${deMinistere(ligne.ministere_nom)}`
}

/** « mentionne Communication et Jeunesse », vide sans ministère reconnu. */
function mentions(detail: Detail, contexte: ContexteJournal): string {
  const ids = detail?.['mentions']
  if (!Array.isArray(ids)) return ''
  const noms = ids.flatMap((id: unknown) => {
    const nom = typeof id === 'string' ? contexte.ministeres.get(id) : undefined
    return nom === undefined ? [] : [nom]
  })
  return noms.length === 0 ? '' : `mentionne ${listeNoms(noms)}`
}

function avecSuite(debut: SegmentDetail[], ...suites: (string | null)[]): SegmentDetail[] {
  const textes = suites.filter((suite): suite is string => suite !== null && suite !== '')
  return textes.length === 0 ? debut : [...debut, simple(`, ${textes.join(', ')}`)]
}

/** Libellé d'un statut d'événement ; un code que l'écran ne connaît pas ne s'affiche pas. */
function libelleStatutEvenement(statut: string): string | null {
  const libelle = libelleStatut(statut as StatutEvenement)
  return libelle === statut ? null : libelle
}

function detailParAction(ligne: LigneJournal, contexte: ContexteJournal): SegmentDetail[] {
  const { detail } = ligne
  switch (ligne.action) {
    case 'mesure_saisie':
      return [simple(chiffresSaisis(detail, contexte.codesCommuns))]
    case 'fij_saisie': {
      const total = nombreDe(detail, 'total')
      return [
        simple(
          total === null ? 'Carte des FIJ' : `FIJ par département : ${nombre(total)} au total`,
        ),
      ]
    }
    case 'fij_statistiques_saisies': {
      const dimanche = jourDe(detail, 'dimanche')
      return [
        simple(
          dimanche === null
            ? 'Chiffres par département'
            : `Chiffres par département du ${formaterJourCourt(dimanche)}`,
        ),
      ]
    }
    case 'participation_saisie': {
      const valeur = nombreDe(detail, 'valeur')
      const dejaComptes = nombreDe(detail, 'deja_comptes') ?? 0
      const session = nomDeLaSession(ligne, contexte) ?? 'Une session'
      if (valeur === null) return [simple(session)]
      const presents = `${nombre(valeur)} ${accorder(valeur, 'présent', 'présents')}`
      const deja =
        dejaComptes > 0
          ? `, dont ${nombre(dejaComptes)} déjà ${accorder(dejaComptes, 'compté', 'comptés')}`
          : ''
      return [simple(`${session} : ${presents}${deja}`)]
    }
    case 'evenement_ajoute':
    case 'evenement_modifie': {
      const jour = jourDe(detail, 'date')
      const statut = texteDe(detail, 'statut')
      return avecSuite(
        objet(ligne),
        jour === null ? null : formaterJourCourt(jour),
        statut === null ? null : libelleStatutEvenement(statut),
      )
    }
    case 'reunion_saisie': {
      const jour = jourDe(detail, 'date')
      if (jour === null) return [simple('Prochaine réunion')]
      return [simple(formaterRendezVous(jour, texteDe(detail, 'heure')))]
    }
    case 'point_cree':
      return avecSuite(objet(ligne), mentions(detail, contexte))
    case 'point_statut': {
      const statuts = detail?.['statut']
      const nouveau = Array.isArray(statuts) ? statuts[1] : undefined
      const libelle =
        typeof nouveau === 'string' && Object.hasOwn(LIBELLE_STATUT, nouveau)
          ? LIBELLE_STATUT[nouveau as keyof typeof LIBELLE_STATUT]
          : null
      return avecSuite(objet(ligne), libelle)
    }
    case 'point_traite':
    case 'indicateur_corrige':
    case 'indicateur_valide':
    case 'indicateur_refuse':
      return objet(ligne)
    case 'session_declaree': {
      const type = typeDeSession(texteDe(detail, 'type'))
      const jour = jourDe(detail, 'date')
      const attendus = nombreDe(detail, 'attendus')
      const session = ligne.cible_id === null ? undefined : contexte.sessions.get(ligne.cible_id)
      const nom = type === null ? 'Une session' : nomSession(type, session?.intitule ?? null)
      return [
        simple(
          [
            nom,
            jour === null ? null : formaterJourSemaine(jour),
            attendus === null
              ? null
              : `${nombre(attendus)} ${accorder(attendus, 'ministère attendu', 'ministères attendus')}`,
          ]
            .filter((morceau) => morceau !== null)
            .join(', '),
        ),
      ]
    }
    case 'session_modifiee': {
      const attendus = detail?.['attendus']
      const [avant, apres] = Array.isArray(attendus) ? attendus : []
      const session = nomDeLaSession(ligne, contexte)
      const changement =
        typeof avant === 'number' && typeof apres === 'number'
          ? `${nombre(apres)} ${accorder(apres, 'ministère attendu', 'ministères attendus')} au lieu de ${nombre(avant)}`
          : 'Ministères attendus modifiés'
      return [simple(session === null ? changement : `${session} : ${changement}`)]
    }
    case 'session_supprimee': {
      const type = typeDeSession(texteDe(detail, 'type'))
      const jour = jourDe(detail, 'date')
      return [
        simple(
          [
            type === null ? 'Une session' : LIBELLE_TYPE_SESSION[type],
            jour === null ? null : formaterJourSemaine(jour),
          ]
            .filter((morceau) => morceau !== null)
            .join(', '),
        ),
      ]
    }
    case 'ministere_cree':
    case 'invitation_relancee':
    case 'compte_reactive':
    case 'double_auth_reinitialisee':
    case 'compte_cree':
      return objet(ligne)
    case 'compte_desactive':
      return avecSuite(
        objet(ligne),
        detail?.['ministere_desactive'] === true ? 'ministère désactivé' : null,
      )
    case 'indicateur_cree':
      return avecSuite(
        objet(ligne),
        detail?.['attente'] === true ? 'en attente de validation' : null,
      )
    case 'indicateurs_prevus_crees': {
      const total = nombreDe(detail, 'nombre')
      const pour = ligne.ministere_nom === null ? '' : ` pour ${ligne.ministere_nom}`
      return [
        simple(
          total === null
            ? `Indicateurs prévus${pour}`
            : `${nombre(total)} ${accorder(total, 'indicateur prévu', 'indicateurs prévus')}${pour}`,
        ),
      ]
    }
    case 'indicateur_retire': {
      const motif = MOTIFS_RETRAIT[texteDe(detail, 'motif') ?? '']
      return avecSuite(objet(ligne), motif === undefined ? null : `motif : ${motif}`)
    }
    case 'difficulte_signalee':
    case 'signalement_clos': {
      const code = texteDe(detail, 'ecran') ?? ligne.cible_texte ?? ''
      const ecran = Object.hasOwn(LIBELLES_ECRAN, code)
        ? LIBELLES_ECRAN[code as keyof typeof LIBELLES_ECRAN]
        : null
      return [simple(ecran === null ? 'Signalement' : `Écran : ${ecran}`)]
    }
    case 'texte_relu':
      return [simple(`${texteModere(ligne)}, rien à signaler`)]
    case 'texte_masque': {
      const motif = MOTIFS_MASQUAGE[texteDe(detail, 'motif') ?? '']
      return [
        simple(
          motif === undefined ? texteModere(ligne) : `${texteModere(ligne)}, motif : ${motif}`,
        ),
      ]
    }
    default:
      return []
  }
}

/** Une ligne du tableau. Une ligne illisible garde sa date, son compte et son action. */
export function construireLigne(
  ligne: LigneJournal,
  contexte: ContexteJournal,
): LigneJournalAffichee {
  let detail: SegmentDetail[]
  try {
    detail = detailParAction(ligne, contexte)
  } catch {
    // Une date ou une heure illisible ne casse pas l'écran : la ligne n'a simplement pas de détail.
    detail = []
  }
  return {
    id: ligne.id,
    quand: formaterHorodatage(ligne.le),
    compte: ligne.compte_libelle ?? 'Système',
    action: libelleAction(ligne.action),
    detail,
  }
}

/** Les lignes du tableau, dans l'ordre reçu (du plus récent au plus ancien). */
export function construireJournal(
  lignes: readonly LigneJournal[],
  contexte: ContexteJournal,
): LigneJournalAffichee[] {
  return lignes.map((ligne) => construireLigne(ligne, contexte))
}
