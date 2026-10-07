// Préparation des envois des saisies des chiffres (lot E3) : ce qui part, et les erreurs à montrer
// sous chaque champ avant tout envoi. Un envoi est tout ou rien : tant qu'un champ est refusé, rien
// ne part (plan de l'étape 4, E3).

import type { ChampChiffre } from '@/features/saisie-chiffres/champs'
import type { LigneMois } from '@/features/saisie-chiffres/schemas'
import { messageValeurEffacee, TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import {
  etatGrille,
  lirePrecision,
  lireRepartition,
  lireValeur,
  memeRepartition,
} from '@/features/saisie-chiffres/valeurs'
import type { ValeurChamp } from '@/features/saisie-chiffres/valeurs'
import { formaterValeur } from '@/lib/metier/unites'

/** Champ vidé alors qu'une saisie fait foi pour la période : la phrase qui le dit, sinon null. */
function erreurChampVide(champ: ChampChiffre): string | null {
  return champ.deja === null
    ? null
    : messageValeurEffacee(formaterValeur(champ.deja.valeur, champ.unite))
}

/** Erreurs d'un champ, sous le champ, sous la précision et sous la grille. */
export interface ErreursChamp {
  valeur?: string
  precision?: string
  repartition?: string
}

export type ErreursFormulaire = Record<string, ErreursChamp>

/** Ce que la personne a écrit pour un sensible. */
export interface SaisieSensible {
  precision: string
  repartition: Record<string, string>
}

const vide = (erreurs: ErreursChamp) =>
  erreurs.valeur === undefined &&
  erreurs.precision === undefined &&
  erreurs.repartition === undefined

/** Un formulaire sans aucune erreur. */
export function sansErreur(erreurs: ErreursFormulaire): boolean {
  return Object.values(erreurs).every(vide)
}

/** Identifiant du premier champ en erreur, dans l'ordre des champs (le focus y va). */
export function premierChampEnErreur(
  champs: readonly ChampChiffre[],
  erreurs: ErreursFormulaire,
): string | null {
  for (const champ of champs) {
    const erreur = erreurs[champ.id]
    if (!erreur) continue
    if (erreur.valeur) return idChamp(champ.id)
    if (erreur.precision) return idPrecision(champ.id)
    if (erreur.repartition) return idGrille(champ.id)
  }
  return null
}

/** Identifiants des éléments d'un champ (focus, `aria-describedby`, tests). */
export const idChamp = (indicateurId: string) => `chiffre-${indicateurId}`
export const idPrecision = (indicateurId: string) => `precision-${indicateurId}`
export const idGrille = (indicateurId: string) => `repartition-${indicateurId}`

export interface EnvoiDimanche {
  lignes: { indicateurId: string; valeur: number }[]
  erreurs: ErreursFormulaire
}

/**
 * Saisie du dimanche (BRIEF, section 9) : tout champ rempli part, dans un seul envoi ; les STARs
 * actifs et en FIJ partent même inchangés (l'envoi confirme la valeur à ce jour), un champ vide
 * ne part pas. Les STARs au service sont obligatoires (0 compris) ; les STARs en FIJ ne dépassent
 * pas les actifs (règle de la base, reprise avant l'envoi).
 */
export function preparerDimanche(
  champs: readonly ChampChiffre[],
  valeurs: Readonly<Record<string, ValeurChamp>>,
): EnvoiDimanche {
  const lignes: EnvoiDimanche['lignes'] = []
  const erreurs: ErreursFormulaire = {}
  const lues = new Map<string, number>()
  for (const champ of champs) {
    const lecture = lireValeur(champ.unite, valeurs[champ.id] ?? '')
    if (lecture.etat === 'erreur') {
      erreurs[champ.id] = { valeur: lecture.message }
    } else if (lecture.etat === 'vide') {
      const effacee = erreurChampVide(champ)
      if (effacee !== null) erreurs[champ.id] = { valeur: effacee }
      else if (champ.obligatoire) erreurs[champ.id] = { valeur: 'Saisissez un nombre.' }
    } else {
      lignes.push({ indicateurId: champ.id, valeur: lecture.valeur })
      if (champ.code !== null) lues.set(champ.code, lecture.valeur)
    }
  }
  const enFij = lues.get('en_fij')
  const actifs = lues.get('actifs')
  const champFij = champs.find((champ) => champ.code === 'en_fij')
  if (enFij !== undefined && actifs !== undefined && enFij > actifs && champFij) {
    erreurs[champFij.id] = { valeur: TEXTES_CHIFFRES.fijDepasseActifs }
  }
  return { lignes, erreurs }
}

/** Refus de la base sur le texte d'une précision (B8 et `private.verifier_texte`, B1). */
const MESSAGES_PRECISION_BASE = new Set([
  'La précision doit faire entre 10 et 280 caractères.',
  "N'écrivez aucun nom ni information personnelle.",
  'Les crochets et « texte masqué » sont réservés à la modération.',
])

/** Où montrer un refus de la base : sous une précision, sous une grille, ou sous le bouton. */
export type PlaceErreurBase =
  | { indicateurId: string; partie: 'precision' | 'repartition' }
  | { indicateurId: null; partie: 'bouton' }

/**
 * Un refus de la base sur une précision s'affiche sous le champ, tel quel (plan, E3), quand une
 * seule ligne de l'envoi portait une précision ; la somme des catégories, sous la seule grille
 * envoyée. Sinon, sous le bouton : la base ne dit pas quelle ligne elle refuse.
 */
export function placerErreurBase(
  message: string | null,
  lignes: readonly LigneMois[],
): PlaceErreurBase {
  if (message !== null && MESSAGES_PRECISION_BASE.has(message)) {
    const avecPrecision = lignes.filter((ligne) => ligne.precision !== undefined)
    const seule = avecPrecision.length === 1 ? avecPrecision[0] : undefined
    if (seule) return { indicateurId: seule.indicateur_id, partie: 'precision' }
  }
  if (message?.startsWith('La somme des catégories')) {
    const avecGrille = lignes.filter((ligne) => ligne.categories !== undefined)
    const seule = avecGrille.length === 1 ? avecGrille[0] : undefined
    if (seule) return { indicateurId: seule.indicateur_id, partie: 'repartition' }
  }
  return { indicateurId: null, partie: 'bouton' }
}

export interface EnvoiMois {
  lignes: LigneMois[]
  erreurs: ErreursFormulaire
  /** Rien n'a changé depuis la dernière saisie (aucune ligne, des valeurs déjà enregistrées). */
  inchange: boolean
}

/**
 * « Chiffres du mois » (BRIEF, section 9 ; P46, P47) : seuls les chiffres qui changent partent, en
 * un appel. Un chiffre vide ne part pas ; un chiffre déjà saisi pour le mois puis vidé bloque
 * l'envoi et le dit (une saisie ne s'efface pas). Un sensible part avec son
 * total dès que son total, sa précision ou sa répartition change, parce qu'une précision et une
 * répartition s'attachent à un total : la précision et la grille reprises partent avec lui, un
 * champ « Précision » vidé n'en envoie aucune (elle disparaît de l'affichage). Renvoyer un total
 * inchangé avec sa précision inchangée ajouterait un texte de plus à relire par EJP Tech : il ne
 * part pas.
 */
export function preparerMois(
  champs: readonly ChampChiffre[],
  valeurs: Readonly<Record<string, ValeurChamp>>,
  sensibles: Readonly<Record<string, SaisieSensible>>,
): EnvoiMois {
  const lignes: LigneMois[] = []
  const erreurs: ErreursFormulaire = {}
  for (const champ of champs) {
    const total = lireValeur(champ.unite, valeurs[champ.id] ?? '')
    const erreur: ErreursChamp = {}
    if (total.etat === 'erreur') erreur.valeur = total.message
    if (total.etat === 'vide') {
      const effacee = erreurChampVide(champ)
      if (effacee !== null) erreur.valeur = effacee
    }
    const totalChange =
      total.etat === 'ok' && (champ.deja === null || total.valeur !== champ.deja.valeur)

    if (champ.sensible === null) {
      if (erreur.valeur) erreurs[champ.id] = erreur
      else if (total.etat === 'ok' && totalChange) {
        lignes.push({ indicateur_id: champ.id, valeur: total.valeur })
      }
      continue
    }

    const saisie = sensibles[champ.id] ?? { precision: '', repartition: {} }
    const precision = lirePrecision(saisie.precision)
    if (precision.etat === 'erreur') erreur.precision = precision.message
    const codes = champ.sensible.categories.map((categorie) => categorie.code)
    const grille = lireRepartition(codes, saisie.repartition)
    const ligneGrille = etatGrille(total, grille)
    if (ligneGrille.etat === 'depasse' || ligneGrille.etat === 'erreur') {
      erreur.repartition = ligneGrille.message
    }
    const precisionEnvoyee = precision.etat === 'ok' ? precision.valeur : null
    const repartitionEnvoyee = grille.etat === 'ok' ? grille.valeur : null
    const detailChange =
      precisionEnvoyee !== champ.sensible.precisionDepart ||
      !memeRepartition(repartitionEnvoyee, champ.sensible.repartitionDepart)
    if (
      erreur.valeur === undefined &&
      total.etat === 'vide' &&
      (precisionEnvoyee !== null || repartitionEnvoyee !== null)
    ) {
      erreur.valeur = TEXTES_CHIFFRES.totalManquant
    }
    if (!vide(erreur)) {
      erreurs[champ.id] = erreur
      continue
    }
    if (total.etat === 'ok' && (totalChange || detailChange)) {
      lignes.push({
        indicateur_id: champ.id,
        valeur: total.valeur,
        ...(repartitionEnvoyee === null ? {} : { categories: repartitionEnvoyee }),
        ...(precisionEnvoyee === null ? {} : { precision: precisionEnvoyee }),
      })
    }
  }
  const dejaSaisi = champs.some((champ) => champ.deja !== null)
  return { lignes, erreurs, inchange: lignes.length === 0 && sansErreur(erreurs) && dejaSaisi }
}
