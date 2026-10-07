import type { LigneEtatCompte } from '@/data/comptes'
import type { MinistereListe } from '@/data/ministeres'
import type { DonneesComptes, LigneCompte } from '@/features/comptes/types'
import type { TypeCompte } from '@/lib/base'
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

function ligneDuCompte(
  compte: LigneEtatCompte,
  nom: string,
  indicateurs: number | null,
  fij: boolean,
): LigneCompte {
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
  }
}

/** Le plus récent d'abord : la dernière désactivation d'un ministère qui en a eu plusieurs. */
function plusRecent(a: LigneEtatCompte, b: LigneEtatCompte): number {
  return (b.desactive_le ?? '').localeCompare(a.desactive_le ?? '')
}

function lignesMinisteres(
  comptes: readonly LigneEtatCompte[],
  ministeres: readonly MinistereListe[],
  nombres: ReadonlyMap<string, number>,
): LigneCompte[] {
  const actifs: LigneCompte[] = []
  const desactives: LigneCompte[] = []
  for (const ministere of [...ministeres].sort((a, b) => comparerNoms(a.nom, b.nom))) {
    const siens = comptes.filter(
      (compte) => compte.type === 'ministere' && compte.ministere_id === ministere.id,
    )
    const indicateurs = nombres.get(ministere.id) ?? 0
    const fij = ministere.code === 'fij'
    const actif = siens.find((compte) => compte.desactive_le === null)
    if (actif) {
      actifs.push(ligneDuCompte(actif, ministere.nom, indicateurs, fij))
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
      })
    } else {
      const dernier = [...siens].sort(plusRecent)[0]
      if (dernier) desactives.push(ligneDuCompte(dernier, ministere.nom, indicateurs, fij))
    }
  }
  return [...actifs, ...desactives]
}

function rangPersonne(compte: LigneEtatCompte): [number, number, number] {
  const type = compte.type === 'berger' ? 0 : 1
  const actif = compte.type === 'berger' && compte.desactive_le !== null ? 1 : 0
  return [type, actif, numeroDuLibelle(compte.libelle) ?? 0]
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
): LigneCompte[] {
  return comptes
    .filter((compte) => types.includes(compte.type))
    .sort(comparerPersonnes)
    .map((compte) => ligneDuCompte(compte, compte.libelle, null, false))
}

/**
 * Données de l'écran 13 : les ministères (comptes de ministère, et ministères actifs sans compte),
 * le berger et le conseil, puis EJP Tech. Le compte de l'administration n'y figure pas : aucune
 * action ne s'y applique (les fonctions refusent le compte de l'appelant). Les dates de
 * désactivation sont des jours de Paris, jamais la date du navigateur.
 */
export function construireComptes(
  comptes: readonly LigneEtatCompte[],
  ministeres: readonly MinistereListe[],
  indicateurs: readonly { ministere_id: string | null }[],
): DonneesComptes {
  const nombres = new Map<string, number>()
  for (const { ministere_id: id } of indicateurs) {
    if (id !== null) nombres.set(id, (nombres.get(id) ?? 0) + 1)
  }
  return {
    ministeres: lignesMinisteres(comptes, ministeres, nombres),
    nbMinisteresActifs: ministeres.filter((ministere) => ministere.desactive_le === null).length,
    bergerConseil: lignesPersonnes(comptes, ['berger', 'conseil']),
    ejpTech: lignesPersonnes(comptes, ['admin_plateforme']),
    bergerActif: comptes.some((compte) => compte.type === 'berger' && compte.desactive_le === null),
    prochainConseil: prochainLibelle(comptes, 'conseil'),
    prochainEjpTech: prochainLibelle(comptes, 'admin_plateforme'),
  }
}
