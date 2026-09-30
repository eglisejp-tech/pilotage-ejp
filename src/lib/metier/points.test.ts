import { describe, expect, it } from 'vitest'
import {
  compterEnAttenteDeDecision,
  echeanceDepassee,
  estOuvert,
  LIBELLE_PRIORITE,
  LIBELLE_STATUT,
  libelleEcheance,
  libellePointOuvert,
  NOMBRE_A_DECIDER,
  selectionADecider,
  trierADecider,
  trierOuverts,
  trierTous,
  trierTraites,
  type PointTriable,
} from './points'

type Ligne = PointTriable & { id: string; traite_le: string | null }

function point(id: string, champs: Partial<Ligne> = {}): Ligne {
  return {
    id,
    statut: 'a_traiter',
    priorite: 'normale',
    echeance: null,
    cree_le: '2026-09-01T10:00:00Z',
    traite_le: null,
    ...champs,
  }
}

const points: Ligne[] = [
  point('a', { statut: 'attente_decision', cree_le: '2026-09-10T10:00:00Z' }),
  point('b', { priorite: 'urgente', echeance: '2026-10-05' }),
  point('c', { statut: 'en_cours', priorite: 'haute', echeance: '2026-10-03' }),
  point('d', { statut: 'attente_decision', priorite: 'haute', echeance: '2026-10-10' }),
  point('e', { statut: 'attente_decision', priorite: 'haute', echeance: '2026-10-08' }),
  point('f', { statut: 'traite', priorite: 'urgente', traite_le: '2026-09-26T09:00:00Z' }),
  point('g', { priorite: 'haute', cree_le: '2026-09-01T10:00:00Z' }),
  point('h', { priorite: 'haute', cree_le: '2026-09-02T10:00:00Z' }),
]

const ids = (liste: readonly Ligne[]): string[] => liste.map((p) => p.id)

describe('trierADecider', () => {
  it("met d'abord les points « En attente de décision », puis priorité, échéance et création", () => {
    expect(ids(trierADecider(points))).toEqual(['e', 'd', 'a', 'b', 'c', 'g', 'h'])
  })

  it('écarte les points traités', () => {
    expect(ids(trierADecider(points))).not.toContain('f')
    expect(estOuvert({ statut: 'traite' })).toBe(false)
    expect(estOuvert({ statut: 'attente_decision' })).toBe(true)
  })

  it('met les points sans échéance après ceux qui en ont une', () => {
    const liste = [point('sans'), point('avec', { echeance: '2026-12-31' })]
    expect(ids(trierADecider(liste))).toEqual(['avec', 'sans'])
  })

  it('compare les dates de création en temps réel, quel que soit leur format', () => {
    const liste = [
      point('p2', { cree_le: '2026-09-22T20:00:00Z' }),
      point('p3', { cree_le: '2026-09-22T19:30:00.500000+00:00' }),
      point('p1', { cree_le: '2026-09-22T21:30:00+02:00' }),
    ]
    expect(ids(trierADecider(liste))).toEqual(['p1', 'p3', 'p2'])
  })

  it('ne modifie pas la liste reçue', () => {
    const avant = ids(points)
    trierADecider(points)
    expect(ids(points)).toEqual(avant)
  })
})

describe('selectionADecider', () => {
  it('garde les 3 premiers et compte tous les points ouverts', () => {
    const selection = selectionADecider(points)
    expect(NOMBRE_A_DECIDER).toBe(3)
    expect(ids(selection.points)).toEqual(['e', 'd', 'a'])
    expect(selection.nbOuverts).toBe(7)
  })

  it('signale un point Urgent ouvert, même hors des 3 premiers', () => {
    expect(selectionADecider(points).urgent).toBe(true)
  })

  it('ne compte pas un point Urgent déjà traité', () => {
    const liste = [
      point('ouvert', { priorite: 'haute' }),
      point('traite', { statut: 'traite', priorite: 'urgente' }),
    ]
    expect(selectionADecider(liste)).toEqual({
      points: [liste[0]],
      nbOuverts: 1,
      urgent: false,
    })
  })

  it('rend une sélection vide sans point ouvert', () => {
    expect(selectionADecider([])).toEqual({ points: [], nbOuverts: 0, urgent: false })
  })

  it('accepte un autre nombre de points', () => {
    expect(selectionADecider(points, 5).points).toHaveLength(5)
    expect(selectionADecider(points, 0).points).toEqual([])
  })
})

describe("onglets de l'écran 05", () => {
  it('trie les ouverts par priorité, échéance, puis création', () => {
    expect(ids(trierOuverts(points))).toEqual(['b', 'c', 'e', 'd', 'g', 'h', 'a'])
  })

  it('trie les traités du plus récent au plus ancien', () => {
    const liste = [
      point('t1', { statut: 'traite', traite_le: '2026-09-26T09:00:00Z' }),
      point('ouvert'),
      point('t2', { statut: 'traite', traite_le: '2026-09-29T09:00:00Z' }),
      point('t3', { statut: 'traite', traite_le: '2026-09-24T09:00:00Z' }),
    ]
    expect(ids(trierTraites(liste))).toEqual(['t2', 't1', 't3'])
  })

  it('montre les ouverts, puis les traités', () => {
    expect(ids(trierTous(points))).toEqual(['b', 'c', 'e', 'd', 'g', 'h', 'a', 'f'])
  })
})

describe('compterEnAttenteDeDecision', () => {
  it('compte les points « En attente de décision »', () => {
    expect(compterEnAttenteDeDecision(points)).toBe(3)
    expect(compterEnAttenteDeDecision([])).toBe(0)
  })
})

describe('échéances', () => {
  it("est dépassée avant aujourd'hui, pas le jour même", () => {
    expect(echeanceDepassee('2026-09-29', '2026-09-30')).toBe(true)
    expect(echeanceDepassee('2026-09-30', '2026-09-30')).toBe(false)
    expect(echeanceDepassee('2026-10-01', '2026-09-30')).toBe(false)
    expect(echeanceDepassee('2026-12-31', '2027-01-01')).toBe(true)
  })

  it("n'est jamais dépassée sans échéance", () => {
    expect(echeanceDepassee(null, '2026-09-30')).toBe(false)
    expect(libelleEcheance(null, '2026-09-30')).toBeNull()
  })

  it('ajoute toujours le mot « dépassée » à la couleur', () => {
    expect(libelleEcheance('2026-10-05', '2026-09-30')).toEqual({
      texte: '5 oct.',
      depassee: false,
    })
    expect(libelleEcheance('2026-09-28', '2026-09-30')).toEqual({
      texte: '28 sept., dépassée',
      depassee: true,
    })
  })
})

describe('libellés', () => {
  it('écrit les statuts et les priorités en mots', () => {
    expect(LIBELLE_STATUT).toEqual({
      a_traiter: 'À traiter',
      en_cours: 'En cours',
      attente_decision: 'En attente de décision',
      traite: 'Traité',
    })
    expect(LIBELLE_PRIORITE.urgente).toBe('Urgente')
  })

  it('écrit la colonne « Point ouvert », « Aucun » sans point ouvert', () => {
    expect(libellePointOuvert('urgente')).toBe('Urgente')
    expect(libellePointOuvert('haute')).toBe('Haute')
    expect(libellePointOuvert('normale')).toBe('Normale')
    expect(libellePointOuvert(null)).toBe('Aucun')
  })
})
