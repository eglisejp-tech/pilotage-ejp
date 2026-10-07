// Données d'exemple des aperçus du lot E4 (/apercu/saisies-e4?ecran=...), sans base ni envoi. Elles
// suivent le jeu d'exemple (supabase/seed.sql, seed/41-fij-statistiques.sql) : dimanche de
// référence le 27 sept. 2026, Bâtir l'Église le samedi 26 sept., carte des FIJ du 21 sept.
// (29 FIJ), semaine du 20 sept. complète et semaine du 27 sept. sans le 77 ni le 95.

import type { LigneStatistiqueFij } from '@/data/fij'
import { DEPARTEMENTS_FIJ, RUBRIQUES_FIJ } from '@/features/saisie-fij/departements'
import type { SessionSaisie } from '@/features/saisie-session/FormulaireSession'
import type { SessionAChoisir } from '@/features/saisie-session/session'
import type { Departement, LigneVue, RubriqueFij } from '@/lib/base'
import { ajouterJours } from '@/lib/metier/dates'

/** Écrans du lot E4 que montre /apercu/saisies-e4 (`?ecran=`). */
export const ECRANS_APERCU_E4 = [
  'session',
  'choix-session',
  'carte-fij',
  'chiffres-departement',
  'bloc-departements',
] as const

export type EcranApercuE4 = (typeof ECRANS_APERCU_E4)[number]

/** Écran du lot E4 demandé par `?ecran=`, ou null (aucun écran demandé). */
export function lireEcranApercuE4(valeur: string | null): EcranApercuE4 | null {
  return ECRANS_APERCU_E4.find((ecran) => ecran === valeur) ?? null
}

export const DIMANCHE_EXEMPLE = '2026-09-27'

export const SESSION_EXEMPLE: SessionSaisie = {
  sessionId: 'session-batir-26-sept',
  type: 'batir',
  intitule: null,
  date: '2026-09-26',
  nbSaisis: 6,
  nbAttendus: 8,
  manquants: ['Coordination', 'Intégration'],
}

export const SAISIE_SESSION_EXEMPLE = {
  valeur: 13,
  deja_comptes: 2,
  saisi_le: '2026-09-27T16:30:00+00:00',
}

export const SESSIONS_A_CHOISIR: SessionAChoisir[] = [
  {
    sessionId: 'session-batir-26-sept',
    type: 'batir',
    intitule: null,
    date: '2026-09-26',
    presentsSaisis: null,
  },
  {
    sessionId: 'session-anti-19-sept',
    type: 'anti_dispersion',
    intitule: null,
    date: '2026-09-19',
    presentsSaisis: 9,
  },
  {
    sessionId: 'session-autre-12-sept',
    type: 'autre',
    intitule: 'Soirée de rentrée',
    date: '2026-09-12',
    presentsSaisis: null,
  },
  {
    sessionId: 'session-batir-29-aout',
    type: 'batir',
    intitule: null,
    date: '2026-08-29',
    presentsSaisis: 10,
  },
]

export const CARTE_EXEMPLE: LigneVue<'v_carte_fij'>[] = (
  [
    ['75', 4],
    ['77', 3],
    ['78', 2],
    ['91', 3],
    ['92', 5],
    ['93', 6],
    ['94', 4],
    ['95', 2],
  ] as const
).map(([departement, valeur]) => ({
  departement,
  valeur,
  saisi_le: '2026-09-21T18:30:00+00:00',
}))

/** Valeurs de base de chaque rubrique (semaine du 20 sept. du jeu d'exemple). */
const BASE: Record<RubriqueFij, Record<Departement, number>> = {
  culte_ejp: { '75': 12, '77': 6, '78': 5, '91': 7, '92': 9, '93': 13, '94': 8, '95': 4 },
  reunion_fij: { '75': 10, '77': 5, '78': 4, '91': 6, '92': 8, '93': 9, '94': 7, '95': 3 },
  evangelisation: { '75': 6, '77': 2, '78': 3, '91': 4, '92': 5, '93': 7, '94': 4, '95': 2 },
  membres_mardi: { '75': 8, '77': 4, '78': 3, '91': 5, '92': 7, '93': 6, '94': 5, '95': 4 },
}

/**
 * Lignes de `v_fij_statistique` sur 10 dimanches jusqu'au 27 sept. `forme` : `donnees` (sept
 * semaines saisies, un trou le 30 août, la dernière sans le 77 ni le 95), `premier-usage`
 * (aucune saisie) ou `semaine-vide` (rien pour la semaine de référence).
 */
export function statistiquesExemple(
  forme: 'donnees' | 'premier-usage' | 'semaine-vide' = 'donnees',
): LigneStatistiqueFij[] {
  const dimanches = Array.from({ length: 10 }, (_, rang) =>
    ajouterJours(DIMANCHE_EXEMPLE, -7 * (9 - rang)),
  )
  return dimanches.flatMap((dimanche, rang) =>
    RUBRIQUES_FIJ.map(({ code, libelle }, ordre): LigneStatistiqueFij => {
      const vide =
        forme === 'premier-usage' ||
        rang < 3 ||
        dimanche === '2026-08-30' ||
        (forme === 'semaine-vide' && dimanche === DIMANCHE_EXEMPLE)
      const absents: Departement[] = dimanche === DIMANCHE_EXEMPLE ? ['77', '95'] : []
      const departements: Partial<Record<Departement, number>> = {}
      if (!vide) {
        for (const { code: departement } of DEPARTEMENTS_FIJ) {
          if (absents.includes(departement)) continue
          departements[departement] = BASE[code][departement] + ((rang + ordre) % 3) - 1
        }
      }
      const valeurs = Object.values(departements)
      return {
        rubrique: code,
        rubrique_libelle: libelle,
        rubrique_ordre: ordre + 1,
        dimanche,
        total: valeurs.length === 0 ? null : valeurs.reduce((a, b) => a + b, 0),
        nb_departements: valeurs.length,
        departements,
        derniere_saisie_le: valeurs.length === 0 ? null : `${dimanche}T18:00:00+00:00`,
      }
    }),
  )
}

/** Envoi d'aperçu : réussit après un court délai, ou échoue (`?etat=erreur`) comme une coupure. */
export function envoiApercu(echec: boolean): () => Promise<void> {
  return () =>
    new Promise((resoudre, rejeter) => {
      window.setTimeout(() => {
        if (echec) rejeter(new TypeError('Failed to fetch'))
        else resoudre()
      }, 300)
    })
}
