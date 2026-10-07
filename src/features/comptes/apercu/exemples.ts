import { ErreurCompte, MESSAGES_ERREURS_COMPTES } from '@/data/comptes'
import type { CodeErreurCompte, LigneEtatCompte } from '@/data/comptes'
import type { MinistereListe } from '@/data/ministeres'
import type { CreationCompte } from '@/features/comptes/types'
import type { EtatCompte, TypeCompte } from '@/lib/base'

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
}

export interface DonneesApercu {
  comptes: CompteApercu[]
  ministeres: MinistereListe[]
  indicateurs: { ministere_id: string | null }[]
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
]

/** Le jeu de l'aperçu : Coordination sans compte (comme en production), Merch désactivé. */
export function donneesExemple(): DonneesApercu {
  return {
    ministeres: MINISTERES.map((ministere) => ({ ...ministere })),
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
      }),
      compte(9, 'ministere', 'Ministère Merch', 'merch@exemple.test', {
        ministere: m(9),
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
    ],
  }
}

/** Premier usage : aucun ministère, seulement le compte de l'administration. */
export function donneesPremierUsage(): DonneesApercu {
  return {
    ministeres: [],
    comptes: [
      compte(21, 'admin_eglise', "Administration de l'église", 'administration@exemple.test'),
    ],
    indicateurs: [],
  }
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
      suivant = { ...cible, facteur: false }
      break
  }
  return {
    ...donnees,
    ministeres,
    comptes: donnees.comptes.map((c) => (c.ligne.user_id === userId ? recalculer(suivant) : c)),
  }
}
