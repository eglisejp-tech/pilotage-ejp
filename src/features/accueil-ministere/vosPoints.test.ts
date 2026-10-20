import { describe, expect, it } from 'vitest'
import { construireVosPoints } from '@/features/accueil-ministere/vosPoints'
import type { LecturesVosPoints } from '@/features/accueil-ministere/vosPoints'
import type { LigneVue } from '@/lib/base'

type Point = LigneVue<'v_point'>

const SOCIAL = 'social'
const INTEGRATION = 'integration'
const COORDINATION = 'coordination'
const COMMUNICATION = 'communication'

function point(ligne: Partial<Point> & Pick<Point, 'id' | 'ministere_id' | 'titre'>): Point {
  return {
    description: null,
    action_attendue: null,
    priorite: 'normale',
    echeance: null,
    cree_le: '2026-09-22T21:30:00+02:00',
    cree_par: 'compte-1',
    statut: 'a_traiter',
    statut_le: '2026-09-22T21:30:00+02:00',
    traitement_id: null,
    traite_le: null,
    traite_par: null,
    traite_commentaire: null,
    ...ligne,
  }
}

function lectures(): LecturesVosPoints {
  return {
    ministereId: SOCIAL,
    aujourdhui: '2026-10-07',
    ministeres: [
      { id: SOCIAL, code: null, nom: 'Social', desactive_le: null },
      { id: INTEGRATION, code: null, nom: 'Intégration', desactive_le: null },
      { id: COORDINATION, code: null, nom: 'Coordination', desactive_le: null },
      { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
    ],
    points: {
      points: [
        point({ id: 'a', ministere_id: SOCIAL, titre: 'Créé par Social', priorite: 'haute' }),
        point({
          id: 'b',
          ministere_id: INTEGRATION,
          titre: 'Mentionne Social',
          statut: 'en_cours',
        }),
        point({
          id: 'c',
          ministere_id: SOCIAL,
          titre: 'Déjà traité',
          statut: 'traite',
          traitement_id: 'traitement-c',
          traite_le: '2026-10-03T18:00:00+02:00',
          traite_par: 'compte-coordination',
        }),
      ],
      mentions: [
        { point_id: 'a', ministere_id: COORDINATION },
        { point_id: 'a', ministere_id: COMMUNICATION },
        { point_id: 'b', ministere_id: SOCIAL },
      ],
      auteurs: [
        {
          user_id: 'compte-coordination',
          ministere_id: COORDINATION,
          libelle: 'Ministère Coordination',
        },
      ],
    },
  }
}

describe('construireVosPoints : textes de la carte (T66)', () => {
  it('« échéance 5 oct. » et « Traité le 3 oct. par Coordination. »', () => {
    const base = lectures()
    base.points.points[0] = { ...base.points.points[0]!, echeance: '2026-10-15' }
    const points = construireVosPoints(base)
    expect(points.find((p) => p.id === 'a')?.echeance?.texte).toBe('échéance 15 oct.')
    expect(points.find((p) => p.id === 'c')?.traite?.texte).toBe(
      'Traité le 3 oct. par Coordination.',
    )
  })

  it('auteur illisible : « Traité le 3 oct. », sans nom', () => {
    const base = lectures()
    base.points.auteurs = []
    const traite = construireVosPoints(base).find((p) => p.id === 'c')
    expect(traite?.traite?.texte).toBe('Traité le 3 oct.')
  })
})

describe('construireVosPoints : identifiants des boutons', () => {
  it('statut, ministère créateur et mentions viennent de v_point et de v_point_mention, point par point', () => {
    const points = construireVosPoints(lectures())
    const identifiants = points.map((p) => ({
      id: p.id,
      statut: p.statut,
      ministereId: p.ministereId,
      mentionIds: [...p.mentionIds].sort(),
    }))
    expect(identifiants).toEqual([
      {
        id: 'a',
        statut: 'a_traiter',
        ministereId: SOCIAL,
        mentionIds: [COMMUNICATION, COORDINATION],
      },
      { id: 'b', statut: 'en_cours', ministereId: INTEGRATION, mentionIds: [SOCIAL] },
      { id: 'c', statut: 'traite', ministereId: SOCIAL, mentionIds: [] },
    ])
  })

  it('un point mentionné garde le ministère créateur, pas celui du compte', () => {
    const mentionne = construireVosPoints(lectures()).find((p) => p.id === 'b')
    expect(mentionne?.ministereId).toBe(INTEGRATION)
    expect(mentionne?.mentionnePar).toBe('Intégration')
  })
})
