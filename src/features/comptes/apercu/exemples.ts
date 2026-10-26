import { ErreurCompte, MESSAGES_ERREURS_COMPTES } from '@/data/comptes'
import type { CodeErreurCompte, LigneEtatCompte } from '@/data/comptes'
import type { MinistereListe } from '@/data/ministeres'
import type { CreationCompte } from '@/features/comptes/types'
import type { EtatCompte, LigneRaisonSuppression, TypeCompte } from '@/lib/base'

// Données d'exemple de l'aperçu de l'écran 13 (/apercu/comptes) : jamais la base, jamais le nom
// d'une personne, des adresses en @exemple.test comme le jeu d'exemple. Les dates sont fixes
// (mercredi 7 oct. 2026), jamais la date du navigateur. Les actions simulent les Edge Functions,
// leurs refus compris (adresse déjà utilisée, nom déjà pris, berger déjà actif, invitation déjà
// acceptée) ; `refus=<code>` impose un refus, `envoi=echec` une connexion perdue.

/** Les vues de l'aperçu, choisies par `?vue=`. */
export const VUES_APERCU_COMPTES = ['donnees', 'premier-usage', 'chargement', 'probleme'] as const
export type VueApercuComptes = (typeof VUES_APERCU_COMPTES)[number]

export function lireVueApercuComptes(valeur: string | null): VueApercuComptes {
  return VUES_APERCU_COMPTES.find((vue) => vue === valeur) ?? 'donnees'
}

/** Code de refus imposé par `?refus=` ; null s'il est absent ou inconnu. */
export function lireRefusApercu(valeur: string | null): CodeErreurCompte | null {
  return valeur !== null && valeur in MESSAGES_ERREURS_COMPTES ? (valeur as CodeErreurCompte) : null
}

/** Jour fixe de l'aperçu pour une désactivation (jamais la date du navigateur). */
export const DESACTIVATION_APERCU = '2026-10-07T10:00:00+02:00'

/** Un compte de l'aperçu : sa ligne, et ce que la vue ne montre pas (adresse confirmée, facteur). */
export interface CompteApercu {
  ligne: LigneEtatCompte
  confirme: boolean
  facteur: boolean
  /** Activé un jour, puis « Refaire l'activation » : la suppression reste refusée (T74, T75). */
  activeUnJour?: boolean
}

export interface DonneesApercu {
  comptes: CompteApercu[]
  ministeres: MinistereListe[]
  indicateurs: { ministere_id: string | null }[]
  /**
   * Ce que la base compte pour chaque ministère (T75), dans son ordre : ses saisies et ses
   * traces (elles bloquent la suppression), et les sessions qui l'attendent (information).
   * Coordination et FIJ, et un compte activé, se lisent ailleurs (codes, facteurs).
   */
  raisons: LigneRaisonSuppression[]
}

const m = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const u = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function etatDe(compte: Omit<CompteApercu, 'ligne'> & { desactive: boolean }): EtatCompte {
  if (compte.desactive) return 'desactive'
  if (!compte.confirme) return 'invitation_envoyee'
  return compte.facteur ? 'activee' : 'a_activer'
}

function compte(
  n: number,
  type: TypeCompte,
  libelle: string,
  email: string,
  options: { ministere?: string; confirme?: boolean; facteur?: boolean; desactive?: boolean } = {},
): CompteApercu {
  const confirme = options.confirme ?? true
  const facteur = options.facteur ?? true
  const desactive = options.desactive ?? false
  return {
    confirme,
    facteur,
    ligne: {
      user_id: u(n),
      type,
      libelle,
      ministere_id: options.ministere ?? null,
      email,
      desactive_le: desactive ? '2026-10-02T09:30:00+02:00' : null,
      etat: etatDe({ confirme, facteur, desactive }),
    },
  }
}

const MINISTERES: MinistereListe[] = [
  { id: m(1), code: null, nom: 'Communication', desactive_le: null },
  { id: m(2), code: null, nom: 'Intégration', desactive_le: null },
  { id: m(3), code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: m(4), code: null, nom: 'Jeunesse', desactive_le: null },
  { id: m(5), code: null, nom: 'Social', desactive_le: null },
  { id: m(6), code: 'fij', nom: 'FIJ', desactive_le: null },
  { id: m(7), code: null, nom: 'Prodiges Junior', desactive_le: null },
  { id: m(8), code: null, nom: 'EJP Formation', desactive_le: null },
  { id: m(9), code: null, nom: 'Merch', desactive_le: '2026-10-02T09:30:00+02:00' },
  // T74 : créé avec une adresse mal tapée, désactivé sans avoir rien saisi (le cas d'EJP TECH).
  { id: m(10), code: null, nom: 'EJP TECH', desactive_le: '2026-10-02T09:30:00+02:00' },
]

/** Une ligne de raison, comme la base la rend. */
function raison(n: number, code: string, nombre: number): LigneRaisonSuppression {
  return { ministere_id: m(n), code, nombre, bloque: code !== 'sessions_attendues' }
}

/**
 * Les raisons de l'aperçu (T75), les six cas de la conception : Communication a des chiffres,
 * des présences, des points et des événements ; Merch, désactivé, son historique ; Social (« À
 * activer ») n'a rien saisi et deux sessions l'attendent ; EJP TECH n'a rien saisi et une session
 * saisie par d'autres l'attend ; EJP Formation n'a rien du tout.
 */
const RAISONS: LigneRaisonSuppression[] = [
  raison(1, 'chiffres', 12),
  raison(1, 'presences', 3),
  raison(1, 'points', 3),
  raison(1, 'mentions_points', 2),
  raison(1, 'evenements', 2),
  raison(1, 'reunions', 1),
  raison(2, 'chiffres', 8),
  raison(2, 'signalements', 1),
  raison(4, 'chiffres', 5),
  raison(4, 'mentions_evenements', 1),
  raison(5, 'sessions_attendues', 2),
  raison(7, 'chiffres', 3),
  raison(7, 'demandes', 1),
  raison(9, 'chiffres', 30),
  raison(9, 'reunions', 4),
  raison(10, 'sessions_attendues', 1),
]

/**
 * Le jeu de l'aperçu : Coordination sans compte (comme en production), Merch désactivé, et EJP TECH,
 * désactivé, vide, son compte jamais activé (adresse mal tapée) : il se réactive en corrigeant
 * l'adresse, ou se supprime (T74). EJP Formation, invité, n'a rien saisi : il se supprime (T75).
 */
export function donneesExemple(): DonneesApercu {
  return {
    ministeres: MINISTERES.map((ministere) => ({ ...ministere })),
    raisons: RAISONS.map((ligne) => ({ ...ligne })),
    comptes: [
      compte(1, 'ministere', 'Ministère Communication', 'communication@exemple.test', {
        ministere: m(1),
      }),
      compte(2, 'ministere', 'Ministère Intégration', 'integration@exemple.test', {
        ministere: m(2),
      }),
      compte(4, 'ministere', 'Ministère Jeunesse', 'jeunesse@exemple.test', { ministere: m(4) }),
      compte(5, 'ministere', 'Ministère Social', 'social@exemple.test', {
        ministere: m(5),
        facteur: false,
      }),
      compte(6, 'ministere', 'Ministère FIJ', 'fij@exemple.test', { ministere: m(6) }),
      compte(7, 'ministere', 'Ministère Prodiges Junior', 'junior@exemple.test', {
        ministere: m(7),
      }),
      compte(8, 'ministere', 'Ministère EJP Formation', 'formation@exemple.test', {
        ministere: m(8),
        confirme: false,
        facteur: false,
      }),
      compte(9, 'ministere', 'Ministère Merch', 'merch@exemple.test', {
        ministere: m(9),
        desactive: true,
      }),
      compte(10, 'ministere', 'Ministère EJP TECH', 'ejptech1+ministre@exemple.test', {
        ministere: m(10),
        confirme: false,
        facteur: false,
        desactive: true,
      }),
      compte(11, 'berger', 'Berger', 'berger@exemple.test'),
      compte(12, 'conseil', 'Conseil, compte 1', 'conseil1@exemple.test'),
      compte(13, 'conseil', 'Conseil, compte 2', 'conseil2@exemple.test'),
      compte(14, 'conseil', 'Conseil, compte 3', 'conseil3@exemple.test', { confirme: false }),
      compte(15, 'conseil', 'Conseil, compte 4', 'conseil4@exemple.test'),
      compte(21, 'admin_eglise', "Administration de l'église", 'administration@exemple.test'),
      compte(31, 'admin_plateforme', 'EJP Tech, compte 1', 'ejptech1@exemple.test'),
    ],
    indicateurs: [
      { ministere_id: m(1) },
      { ministere_id: m(1) },
      { ministere_id: m(7) },
      { ministere_id: m(9) },
      // Les 8 indicateurs prévus d'EJP TECH, sans aucune saisie.
      ...Array.from({ length: 8 }, () => ({ ministere_id: m(10) })),
    ],
  }
}

/**
 * Premier usage : aucun ministère, seulement les comptes créés à l'installation, celui de
 * l'administration et le premier compte d'EJP Tech, qui crée tous les autres (T60).
 */
export function donneesPremierUsage(): DonneesApercu {
  return {
    ministeres: [],
    comptes: [
      compte(21, 'admin_eglise', "Administration de l'église", 'administration@exemple.test'),
      compte(31, 'admin_plateforme', 'EJP Tech, compte 1', 'ejptech1@exemple.test'),
    ],
    indicateurs: [],
    raisons: [],
  }
}

/**
 * Raisons d'un ministère, comme la base les rend (T75) : Coordination et FIJ, seule raison ; sinon
 * un compte activé un jour, ses saisies et ses traces, puis les sessions qui l'attendent.
 */
function raisonsDe(donnees: DonneesApercu, ministere: MinistereListe): LigneRaisonSuppression[] {
  if (ministere.code !== null) {
    return [{ ministere_id: ministere.id, code: 'ministere_de_reference', nombre: 1, bloque: true }]
  }
  const actives = donnees.comptes.filter(
    (c) => c.ligne.ministere_id === ministere.id && (c.facteur || c.activeUnJour === true),
  ).length
  return [
    ...(actives > 0
      ? [{ ministere_id: ministere.id, code: 'compte_deja_active', nombre: actives, bloque: true }]
      : []),
    ...donnees.raisons.filter((ligne) => ligne.ministere_id === ministere.id),
  ]
}

/**
 * Ce que lit EJP Tech pour la gestion (T74, T75), comme la base le calcule : les raisons d'un
 * refus de suppression de chaque ministère et les comptes jamais activés.
 */
export function lecturesGestionApercu(donnees: DonneesApercu): {
  raisons: LigneRaisonSuppression[]
  jamaisActives: string[]
} {
  const jamaisActives = donnees.comptes
    .filter((c) => !c.facteur && c.ligne.type !== 'admin_eglise')
    .map((c) => c.ligne.user_id)
  const raisons = donnees.ministeres.flatMap((ministere) => raisonsDe(donnees, ministere))
  return { raisons, jamaisActives }
}

/** Les raisons d'un ministère, relues après un refus de la suppression (T75). */
export function raisonsApercu(
  donnees: DonneesApercu,
  ministereId: string,
): LigneRaisonSuppression[] {
  const ministere = donnees.ministeres.find((x) => x.id === ministereId)
  return ministere ? raisonsDe(donnees, ministere) : []
}

/** Attente d'une réponse simulée : le bouton dit « Envoi en cours ». */
export function attendre(ms = 400): Promise<void> {
  return new Promise((fin) => setTimeout(fin, ms))
}

function recalculer(compte: CompteApercu): CompteApercu {
  const desactive = compte.ligne.desactive_le !== null
  return { ...compte, ligne: { ...compte.ligne, etat: etatDe({ ...compte, desactive }) } }
}

/** Numéro suivant d'un type (« Conseil, compte 5 »), comme la base. */
function numeroSuivant(comptes: readonly CompteApercu[], type: TypeCompte): number {
  const numeros = comptes
    .filter((c) => c.ligne.type === type)
    .map((c) => Number(/, compte ([0-9]+)$/.exec(c.ligne.libelle)?.[1] ?? 0))
  return Math.max(0, ...numeros) + 1
}

/**
 * Création simulée, avec les refus de `creer-compte` : adresse déjà utilisée, nom déjà pris,
 * berger déjà actif, ministère qui a déjà un compte actif. Rend les nouvelles données.
 */
export function simulerCreation(donnees: DonneesApercu, creation: CreationCompte): DonneesApercu {
  const email = creation.email
  if (donnees.comptes.some((c) => c.ligne.email === email)) {
    throw new ErreurCompte('adresse_deja_utilisee')
  }
  const actif = (c: CompteApercu) => c.ligne.desactive_le === null
  const nouveauId = u(100 + donnees.comptes.length)
  let ministeres = donnees.ministeres
  let ministereId: string | null = null
  let libelle: string
  if (creation.type === 'ministere') {
    const nom = creation.nom.trim()
    if (ministeres.some((x) => x.nom.toLowerCase() === nom.toLowerCase())) {
      throw new ErreurCompte('nom_ministere_deja_pris')
    }
    ministereId = m(100 + ministeres.length)
    ministeres = [...ministeres, { id: ministereId, code: null, nom, desactive_le: null }]
    libelle = `Ministère ${nom}`
  } else if (creation.type === 'ministere_existant') {
    if (donnees.comptes.some((c) => actif(c) && c.ligne.ministere_id === creation.ministereId)) {
      throw new ErreurCompte('ministere_a_deja_un_compte')
    }
    ministereId = creation.ministereId
    libelle = `Ministère ${creation.nom}`
  } else if (creation.type === 'berger') {
    if (donnees.comptes.some((c) => actif(c) && c.ligne.type === 'berger')) {
      throw new ErreurCompte('berger_deja_actif')
    }
    libelle = 'Berger'
  } else {
    const prefixe = creation.type === 'conseil' ? 'Conseil' : 'EJP Tech'
    libelle = `${prefixe}, compte ${numeroSuivant(donnees.comptes, creation.type)}`
  }
  const type: TypeCompte = creation.type === 'ministere_existant' ? 'ministere' : creation.type
  const nouveau: CompteApercu = {
    confirme: false,
    facteur: false,
    ligne: {
      user_id: nouveauId,
      type,
      libelle,
      ministere_id: ministereId,
      email,
      desactive_le: null,
      etat: 'invitation_envoyee',
    },
  }
  return { ...donnees, ministeres, comptes: [...donnees.comptes, nouveau] }
}

/** Action simulée sur un compte, avec les refus des fonctions. Rend les nouvelles données. */
export function simulerAction(
  donnees: DonneesApercu,
  userId: string,
  action: 'relancer' | 'desactiver' | 'reactiver' | 'refaire',
): DonneesApercu {
  const cible = donnees.comptes.find((c) => c.ligne.user_id === userId)
  if (!cible) throw new ErreurCompte('compte_inconnu')
  const desactive = cible.ligne.desactive_le !== null
  let suivant: CompteApercu
  let ministeres = donnees.ministeres
  const marquerMinistere = (date: string | null) => {
    ministeres = ministeres.map((x) =>
      x.id === cible.ligne.ministere_id ? { ...x, desactive_le: date } : x,
    )
  }
  switch (action) {
    case 'relancer':
      if (desactive) throw new ErreurCompte('compte_desactive')
      if (cible.confirme) throw new ErreurCompte('invitation_deja_acceptee')
      suivant = cible
      break
    case 'desactiver':
      if (desactive) throw new ErreurCompte('compte_desactive')
      suivant = { ...cible, ligne: { ...cible.ligne, desactive_le: DESACTIVATION_APERCU } }
      marquerMinistere(DESACTIVATION_APERCU)
      break
    case 'reactiver':
      if (!desactive) throw new ErreurCompte('compte_actif')
      if (
        cible.ligne.type === 'berger' &&
        donnees.comptes.some((c) => c.ligne.type === 'berger' && c.ligne.desactive_le === null)
      ) {
        throw new ErreurCompte('berger_deja_actif')
      }
      suivant = { ...cible, ligne: { ...cible.ligne, desactive_le: null } }
      marquerMinistere(null)
      break
    case 'refaire':
      if (desactive) throw new ErreurCompte('compte_desactive')
      suivant = { ...cible, facteur: false, activeUnJour: true }
      break
  }
  return {
    ...donnees,
    ministeres,
    comptes: donnees.comptes.map((c) => (c.ligne.user_id === userId ? recalculer(suivant) : c)),
  }
}

/**
 * Correction simulée d'une adresse (T74), avec les refus de `corriger-adresse` : compte déjà
 * activé, adresse déjà prise. Un compte désactivé se corrige (« Réactiver » corrige d'abord).
 * L'adresse change et redevient non confirmée.
 */
export function simulerCorrection(
  donnees: DonneesApercu,
  userId: string,
  email: string,
): DonneesApercu {
  const cible = donnees.comptes.find((c) => c.ligne.user_id === userId)
  if (!cible) throw new ErreurCompte('compte_inconnu')
  if (cible.facteur) throw new ErreurCompte('compte_deja_active')
  if (donnees.comptes.some((c) => c.ligne.email === email && c.ligne.user_id !== userId)) {
    throw new ErreurCompte('adresse_deja_utilisee')
  }
  const suivant = recalculer({ ...cible, confirme: false, ligne: { ...cible.ligne, email } })
  return {
    ...donnees,
    comptes: donnees.comptes.map((c) => (c.ligne.user_id === userId ? suivant : c)),
  }
}

/**
 * Suppression simulée (T74, T75), avec les refus de `supprimer-ministere`, que la base tire de la
 * première raison qui bloque : le ministère, ses comptes, ses indicateurs et ses places dans les
 * sessions disparaissent.
 */
export function simulerSuppression(donnees: DonneesApercu, ministereId: string): DonneesApercu {
  const ministere = donnees.ministeres.find((x) => x.id === ministereId)
  if (!ministere) throw new ErreurCompte('ministere_inconnu')
  const bloque = raisonsDe(donnees, ministere).find((ligne) => ligne.bloque)
  if (bloque?.code === 'ministere_de_reference') throw new ErreurCompte('ministere_de_reference')
  if (bloque?.code === 'compte_deja_active') throw new ErreurCompte('compte_deja_active')
  if (bloque) throw new ErreurCompte('ministere_non_vide')
  return {
    ...donnees,
    ministeres: donnees.ministeres.filter((x) => x.id !== ministereId),
    comptes: donnees.comptes.filter((c) => c.ligne.ministere_id !== ministereId),
    indicateurs: donnees.indicateurs.filter((i) => i.ministere_id !== ministereId),
    raisons: donnees.raisons.filter((ligne) => ligne.ministere_id !== ministereId),
  }
}
