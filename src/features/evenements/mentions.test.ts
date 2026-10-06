import { describe, expect, it } from 'vitest'
import {
  ministeresAMentionner,
  nomDuMinistere,
  nomsDesMentions,
} from '@/features/evenements/mentions'

const MINISTERES = [
  { id: 'm-social', code: null, nom: 'Social', desactive_le: null },
  { id: 'm-communication', code: null, nom: 'Communication', desactive_le: null },
  { id: 'm-ancien', code: null, nom: 'Accueil', desactive_le: '2026-09-01T10:00:00Z' },
  { id: 'm-integration', code: null, nom: 'Intégration', desactive_le: null },
  { id: 'm-coordination', code: 'coordination', nom: 'Coordination', desactive_le: null },
]

describe('mentions d’un événement (T32)', () => {
  it('à mentionner : les ministères actifs autres que soi, par ordre alphabétique', () => {
    expect(ministeresAMentionner(MINISTERES, 'm-communication')).toEqual([
      { id: 'm-coordination', nom: 'Coordination' },
      { id: 'm-integration', nom: 'Intégration' },
      { id: 'm-social', nom: 'Social' },
    ])
    expect(ministeresAMentionner([MINISTERES[1]!], 'm-communication')).toEqual([])
  })

  it('noms des mentions dans l’ordre alphabétique, un ministère désactivé compris', () => {
    expect(nomsDesMentions(['m-social', 'm-ancien', 'm-inconnu'], MINISTERES)).toEqual([
      'Accueil',
      'Social',
    ])
  })

  it('nom du ministère porteur, ou null', () => {
    expect(nomDuMinistere('m-communication', MINISTERES)).toBe('Communication')
    expect(nomDuMinistere('m-inconnu', MINISTERES)).toBeNull()
  })
})
