// Bloc « Chiffres par département » de la fiche de Coordo FIJ (X5, P40 ; plan de l'étape 4, E4) :
// construit à partir des lignes de `v_fij_statistique`, sans rien recompter. Pour chaque rubrique,
// le total du dimanche de référence avec sa complétude (« 6 dép. sur 8 ») et la petite courbe des
// 10 dimanches (trou pour une semaine sans saisie, cercle vide pour une semaine incomplète) ; par
// département, la dernière valeur de chaque rubrique pour cette semaine. Ni nom ni liste de
// personnes. Un département absent n'est jamais un 0.

import type { DonneesCourbe } from '@/features/cette-semaine/types'
import {
  DEPARTEMENTS_FIJ,
  NOMBRE_DEPARTEMENTS,
  RUBRIQUES_FIJ,
} from '@/features/saisie-fij/departements'
import { libelleDepartementsSur8 } from '@/features/saisie-fij/calculs'
import type { LigneStatistiqueFij } from '@/data/fij'
import type { Departement, RubriqueFij, TypeCompte } from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'
import { libelleSemaine, semaineIso } from '@/lib/metier/semaine'
import { nombre, terminerPhrase } from '@/lib/metier/texte'

/** Texte d'un total ou d'une valeur absente : jamais un 0 (LISEZMOI, « États vides partout »). */
export const PAS_DE_SAISIE = 'Pas de saisie'

/** Textes du bloc (« Proposé » : plan de l'étape 4, E4 ; LISEZMOI, « États »). */
export const TEXTES_BLOC_FIJ = {
  titre: 'Chiffres par département',
  /** Premier usage : aucune saisie sur les 10 dimanches. */
  premierUsage: 'Pas encore de saisie par département.',
  /** Pour les profils qui lisent seulement : qui saisira. */
  quiSaisit: 'FIJ saisit ces chiffres chaque semaine.',
  saisir: 'Saisir les chiffres par département',
  probleme: 'La connexion a échoué. Réessayez.',
  parDepartement: 'Par département',
  // « sept. » finit déjà la phrase : pas de second point.
  semaineVide: (semaine: string) =>
    terminerPhrase(
      `Aucun département saisi pour la ${semaine.charAt(0).toLowerCase()}${semaine.slice(1)}`,
    ),
  note: 'Dernière saisie de chaque département pour la semaine. Un département sans saisie ne compte pas pour 0. Courbes : dix dernières semaines.',
} as const

export interface RubriqueDuBloc {
  code: RubriqueFij
  libelle: string
  /** Total du dimanche de référence ; null : aucun département saisi. */
  total: number | null
  nbDepartements: number
  /** « 6 dép. sur 8 » */
  completude: string
  complet: boolean
  courbe: DonneesCourbe
}

export interface DepartementDuBloc {
  code: Departement
  nom: string
  /** Dernière valeur de chaque rubrique pour la semaine ; null : pas de saisie. */
  valeurs: Record<RubriqueFij, number | null>
}

export interface DonneesChiffresParDepartement {
  /** Dimanche de référence : le plus récent des 10 dimanches de la vue. */
  dimanche: DateIso
  /** « Semaine 39, du 21 au 27 sept. » */
  semaine: string
  rubriques: RubriqueDuBloc[]
  departements: DepartementDuBloc[]
  /** Aucun département saisi pour la semaine de référence (les courbes peuvent en avoir). */
  semaineVide: boolean
}

/** Situation du bloc : premier usage (aucune saisie sur 10 dimanches), ou données. */
export type EtatChiffresParDepartement =
  { situation: 'premier_usage' } | { situation: 'donnees'; donnees: DonneesChiffresParDepartement }

function description(points: readonly { valeur: number | null; nb: number }[]): string {
  const morceaux = points.map(({ valeur, nb }) => {
    if (valeur === null) return 'sans saisie'
    return nb < NOMBRE_DEPARTEMENTS
      ? `${nombre(valeur)} (${libelleDepartementsSur8(nb)})`
      : nombre(valeur)
  })
  return `Dix dernières semaines : ${morceaux.join(', ')}.`
}

/**
 * Construit le bloc. Aucune ligne (profil sans droit de lecture) : null, le bloc ne s'affiche
 * pas. Aucune valeur sur les 10 dimanches : premier usage.
 */
export function construireChiffresParDepartement(
  lignes: readonly LigneStatistiqueFij[],
): EtatChiffresParDepartement | null {
  if (lignes.length === 0) return null
  if (lignes.every((ligne) => ligne.total === null)) return { situation: 'premier_usage' }

  const dimanches = [...new Set(lignes.map((ligne) => ligne.dimanche))].sort()
  const dimanche = dimanches.at(-1) ?? ''
  const libelles = new Map(lignes.map((ligne) => [ligne.rubrique, ligne.rubrique_libelle]))
  const ligneDe = (rubrique: RubriqueFij, jour: DateIso) =>
    lignes.find((ligne) => ligne.rubrique === rubrique && ligne.dimanche === jour)

  const rubriques = RUBRIQUES_FIJ.filter(({ code }) => libelles.has(code)).map(
    ({ code, libelle }): RubriqueDuBloc => {
      const derniere = ligneDe(code, dimanche)
      const nbDepartements = derniere?.nb_departements ?? 0
      const points = dimanches.map((jour) => {
        const ligne = ligneDe(code, jour)
        return { valeur: ligne?.total ?? null, nb: ligne?.nb_departements ?? 0 }
      })
      return {
        code,
        libelle: libelles.get(code) ?? libelle,
        total: derniere?.total ?? null,
        nbDepartements,
        completude: libelleDepartementsSur8(nbDepartements),
        complet: nbDepartements >= NOMBRE_DEPARTEMENTS,
        courbe: {
          points: points.map(({ valeur, nb }) => ({
            valeur,
            incomplet: valeur !== null && nb < NOMBRE_DEPARTEMENTS,
          })),
          description: description(points),
        },
      }
    },
  )

  const departements = DEPARTEMENTS_FIJ.map(({ code, nom }): DepartementDuBloc => {
    const valeurs = Object.fromEntries(
      RUBRIQUES_FIJ.map(({ code: rubrique }) => [
        rubrique,
        ligneDe(rubrique, dimanche)?.departements[code] ?? null,
      ]),
    ) as Record<RubriqueFij, number | null>
    return { code, nom, valeurs }
  })

  return {
    situation: 'donnees',
    donnees: {
      dimanche,
      semaine: libelleSemaine(semaineIso(dimanche)),
      rubriques,
      departements,
      semaineVide: rubriques.every((rubrique) => rubrique.total === null),
    },
  }
}

/** Le bloc n'existe que sur la fiche du ministère `fij`, et jamais pour l'administration. */
export function blocVisible(ministereCode: string | null, profil: TypeCompte): boolean {
  return ministereCode === 'fij' && profil !== 'admin_eglise'
}
