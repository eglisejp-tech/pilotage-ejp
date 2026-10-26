import type { LigneEtatCompte } from '@/data/comptes'
import type { MinistereListe } from '@/data/ministeres'
import { SUPPRESSION_LIBRE, suppressionsParMinistere } from '@/features/comptes/raisons'
import type { SuppressionMinistere } from '@/features/comptes/raisons'
import type { DonneesComptes, LigneCompte } from '@/features/comptes/types'
import type { LigneRaisonSuppression, TypeCompte } from '@/lib/base'
import { jourDeParis } from '@/lib/metier/dates'
import { comparerNoms } from '@/lib/metier/texte'

/** Numéro d'un libellé « Conseil, compte 3 » ; null s'il n'en a pas. */
export function numeroDuLibelle(libelle: string): number | null {
  const trouve = /, compte ([0-9]{1,9})$/.exec(libelle)
  return trouve?.[1] === undefined ? null : Number(trouve[1])
}

/**
 * Libellé du prochain compte d'un type (« Conseil, compte 5 ») : le plus grand numéro déjà
 * donné à ce type, désactivés compris, plus un. Même règle que la base (`serveur_creer_compte`),
 * qui impose le libellé : l'écran ne fait que l'annoncer.
 */
export function prochainLibelle(
  comptes: readonly LigneEtatCompte[],
  type: 'conseil' | 'admin_plateforme',
): string {
  const numeros = comptes
    .filter((compte) => compte.type === type)
    .map((compte) => numeroDuLibelle(compte.libelle) ?? 0)
  const suivant = Math.max(0, ...numeros) + 1
  return `${type === 'conseil' ? 'Conseil' : 'EJP Tech'}, compte ${suivant}`
}

/** Lectures réservées à EJP Tech (T74, T75) : absentes en lecture seule. */
export interface LecturesGestion {
  /** Raisons d'un refus de suppression, de tous les ministères (T75). */
  raisons?: readonly LigneRaisonSuppression[]
  /** Comptes jamais activés, désactivés compris. */
  jamaisActives?: readonly string[]
}

interface Contexte {
  nombres: ReadonlyMap<string, number>
  /** null en lecture seule : aucun ministère n'a « Supprimer ». */
  suppressions: ReadonlyMap<string, SuppressionMinistere> | null
  jamaisActives: ReadonlySet<string>
}

/** La suppression d'un ministère : ses raisons lues, ou aucune (il se supprime). */
function suppressionDuMinistere(
  ministereId: string | null,
  contexte: Contexte,
): SuppressionMinistere | null {
  if (ministereId === null || contexte.suppressions === null) return null
  return contexte.suppressions.get(ministereId) ?? SUPPRESSION_LIBRE
}

function ligneDuCompte(
  compte: LigneEtatCompte,
  nom: string,
  indicateurs: number | null,
  fij: boolean,
  contexte: Contexte,
): LigneCompte {
  const ministere = compte.type === 'ministere' ? compte.ministere_id : null
  return {
    cle: compte.user_id,
    userId: compte.user_id,
    type: compte.type,
    nom,
    email: compte.email,
    etat: compte.etat,
    desactiveLe: compte.desactive_le === null ? null : jourDeParis(compte.desactive_le),
    ministereId: compte.ministere_id,
    indicateurs,
    fij,
    // Un compte actif le dit par son état ; un compte désactivé, par la lecture de T74.
    jamaisActive:
      compte.etat === 'invitation_envoyee' ||
      compte.etat === 'a_activer' ||
      (compte.etat === 'desactive' && contexte.jamaisActives.has(compte.user_id)),
    suppression: suppressionDuMinistere(ministere, contexte),
  }
}

/** Le plus récent d'abord : la dernière désactivation d'un ministère qui en a eu plusieurs. */
function plusRecent(a: LigneEtatCompte, b: LigneEtatCompte): number {
  return (b.desactive_le ?? '').localeCompare(a.desactive_le ?? '')
}

interface Lignes {
  actifs: LigneCompte[]
  desactives: LigneCompte[]
}

function lignesMinisteres(
  comptes: readonly LigneEtatCompte[],
  ministeres: readonly MinistereListe[],
  contexte: Contexte,
): Lignes {
  const actifs: LigneCompte[] = []
  const desactives: LigneCompte[] = []
  for (const ministere of [...ministeres].sort((a, b) => comparerNoms(a.nom, b.nom))) {
    const siens = comptes.filter(
      (compte) => compte.type === 'ministere' && compte.ministere_id === ministere.id,
    )
    const indicateurs = contexte.nombres.get(ministere.id) ?? 0
    const fij = ministere.code === 'fij'
    const actif = siens.find((compte) => compte.desactive_le === null)
    if (actif) {
      actifs.push(ligneDuCompte(actif, ministere.nom, indicateurs, fij, contexte))
    } else if (ministere.desactive_le === null) {
      // Ministère actif sans compte (FIJ et Coordination, posés par les migrations).
      actifs.push({
        cle: `ministere-${ministere.id}`,
        userId: null,
        type: 'ministere',
        nom: ministere.nom,
        email: null,
        etat: 'sans_compte',
        desactiveLe: null,
        ministereId: ministere.id,
        indicateurs,
        fij,
        jamaisActive: false,
        suppression: suppressionDuMinistere(ministere.id, contexte),
      })
    } else {
      const dernier = [...siens].sort(plusRecent)[0]
      if (dernier) {
        desactives.push(ligneDuCompte(dernier, ministere.nom, indicateurs, fij, contexte))
      }
    }
  }
  return { actifs, desactives }
}

function rangPersonne(compte: LigneEtatCompte): [number, number] {
  return [compte.type === 'berger' ? 0 : 1, numeroDuLibelle(compte.libelle) ?? 0]
}

function comparerPersonnes(a: LigneEtatCompte, b: LigneEtatCompte): number {
  const [ra, rb] = [rangPersonne(a), rangPersonne(b)]
  for (let i = 0; i < ra.length; i += 1) {
    const ecart = (ra[i] ?? 0) - (rb[i] ?? 0)
    if (ecart !== 0) return ecart
  }
  return comparerNoms(a.libelle, b.libelle)
}

function lignesPersonnes(
  comptes: readonly LigneEtatCompte[],
  types: readonly TypeCompte[],
  contexte: Contexte,
): Lignes {
  const lignes = comptes
    .filter((compte) => types.includes(compte.type))
    .sort(comparerPersonnes)
    .map((compte) => ligneDuCompte(compte, compte.libelle, null, false, contexte))
  return {
    actifs: lignes.filter((ligne) => ligne.etat !== 'desactive'),
    desactives: lignes.filter((ligne) => ligne.etat === 'desactive'),
  }
}

/**
 * Données de l'écran 13 : les ministères (comptes de ministère, et ministères actifs sans compte),
 * le berger et le conseil, puis EJP Tech, chaque section avec ses désactivés à part (section
 * repliée « Désactivés », T74). Le compte de l'administration n'y figure pas : aucune action ne
 * s'y applique (les fonctions refusent ce compte). Les dates de désactivation sont des jours de
 * Paris, jamais la date du navigateur.
 */
export function construireComptes(
  comptes: readonly LigneEtatCompte[],
  ministeres: readonly MinistereListe[],
  indicateurs: readonly { ministere_id: string | null }[],
  gestion: LecturesGestion = {},
): DonneesComptes {
  const nombres = new Map<string, number>()
  for (const { ministere_id: id } of indicateurs) {
    if (id !== null) nombres.set(id, (nombres.get(id) ?? 0) + 1)
  }
  const contexte: Contexte = {
    nombres,
    suppressions: gestion.raisons === undefined ? null : suppressionsParMinistere(gestion.raisons),
    jamaisActives: new Set(gestion.jamaisActives ?? []),
  }
  const lignesDesMinisteres = lignesMinisteres(comptes, ministeres, contexte)
  const bergerConseil = lignesPersonnes(comptes, ['berger', 'conseil'], contexte)
  const ejpTech = lignesPersonnes(comptes, ['admin_plateforme'], contexte)
  return {
    ministeres: lignesDesMinisteres.actifs,
    ministeresDesactives: lignesDesMinisteres.desactives,
    nbMinisteresActifs: ministeres.filter((ministere) => ministere.desactive_le === null).length,
    bergerConseil: bergerConseil.actifs,
    bergerConseilDesactives: bergerConseil.desactives,
    ejpTech: ejpTech.actifs,
    ejpTechDesactives: ejpTech.desactives,
    bergerActif: comptes.some((compte) => compte.type === 'berger' && compte.desactive_le === null),
    prochainConseil: prochainLibelle(comptes, 'conseil'),
    prochainEjpTech: prochainLibelle(comptes, 'admin_plateforme'),
  }
}
