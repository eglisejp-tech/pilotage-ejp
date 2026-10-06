import { describe, expect, it } from 'vitest'
import {
  ministeresAMentionner,
  nomDuMinistere,
  nomsDesMentions,
} from '@/features/evenements/mentions'

const MINISTERES = [
  { id: '10000000-0000-4000-8000-000000000008', code: null, nom: 'Social', desactive_le: null },
  {
    id: '10000000-0000-4000-8000-000000000001',
    code: null,
    nom: 'Communication',
    desactive_le: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    code: null,
    nom: 'Accueil',
    desactive_le: '2026-09-01T10:00:00Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    code: null,
    nom: 'Intégration',
    desactive_le: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    code: 'coordination',
    nom: 'Coordination',
    desactive_le: null,
  },
]

describe('mentions d’un événement (T32)', () => {
  it('à mentionner : les ministères actifs autres que soi, par ordre alphabétique', () => {
    expect(ministeresAMentionner(MINISTERES, '10000000-0000-4000-8000-000000000001')).toEqual([
      { id: '10000000-0000-4000-8000-000000000002', nom: 'Coordination' },
      { id: '10000000-0000-4000-8000-000000000005', nom: 'Intégration' },
      { id: '10000000-0000-4000-8000-000000000008', nom: 'Social' },
    ])
    expect(ministeresAMentionner([MINISTERES[1]!], '10000000-0000-4000-8000-000000000001')).toEqual(
      [],
    )
  })

  it('noms des mentions dans l’ordre alphabétique, un ministère désactivé compris', () => {
    expect(
      nomsDesMentions(
        [
          '10000000-0000-4000-8000-000000000008',
          '10000000-0000-4000-8000-000000000009',
          '10000000-0000-4000-8000-00000000000a',
        ],
        MINISTERES,
      ),
    ).toEqual(['Accueil', 'Social'])
  })

  it('nom du ministère porteur, ou null', () => {
    expect(nomDuMinistere('10000000-0000-4000-8000-000000000001', MINISTERES)).toBe('Communication')
    expect(nomDuMinistere('10000000-0000-4000-8000-00000000000a', MINISTERES)).toBeNull()
  })
})
