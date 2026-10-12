import { describe, expect, it } from 'vitest'
import type { MinistereListe } from '@/data/ministeres'
import { memesMentions, ministeresDeLaFenetre } from './choixMentions'

const ministere = (id: string, nom: string, desactive = false): MinistereListe => ({
  id,
  code: null,
  nom,
  desactive_le: desactive ? '2026-09-01T10:00:00+00:00' : null,
})

const COMMUNICATION = ministere('com', 'Communication')
const SOCIAL = ministere('soc', 'Social')
const INTEGRATION = ministere('int', 'Intégration')
const ACCUEIL = ministere('acc', 'Accueil', true)
const TOUS = [SOCIAL, COMMUNICATION, ACCUEIL, INTEGRATION]

describe('ministeresDeLaFenetre', () => {
  it('propose les ministères actifs autres que le créateur, par ordre alphabétique', () => {
    expect(ministeresDeLaFenetre(TOUS, 'com', []).map((m) => m.nom)).toEqual([
      'Intégration',
      'Social',
    ])
  })

  it('garde un ministère désactivé tant qu’il est mentionné, avec la mention « désactivé »', () => {
    expect(ministeresDeLaFenetre(TOUS, 'com', ['acc', 'soc'])).toEqual([
      { id: 'acc', nom: 'Accueil (désactivé)' },
      { id: 'int', nom: 'Intégration' },
      { id: 'soc', nom: 'Social' },
    ])
  })

  it('ne propose jamais le créateur, même désactivé ou cité par erreur dans les mentions', () => {
    expect(ministeresDeLaFenetre(TOUS, 'soc', ['soc']).map((m) => m.id)).not.toContain('soc')
    expect(
      ministeresDeLaFenetre([ministere('com', 'Communication', true)], 'com', ['com']),
    ).toEqual([])
  })

  it('ignore un identifiant mentionné qui n’est pas dans la liste', () => {
    expect(ministeresDeLaFenetre([SOCIAL], 'com', ['inconnu']).map((m) => m.id)).toEqual(['soc'])
  })
})

describe('memesMentions', () => {
  it('compare les listes sans tenir compte de l’ordre ni des doublons', () => {
    expect(memesMentions(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(memesMentions(['a', 'a'], ['a'])).toBe(true)
    expect(memesMentions([], [])).toBe(true)
  })

  it('voit un ajout, un retrait et un remplacement', () => {
    expect(memesMentions(['a'], ['a', 'b'])).toBe(false)
    expect(memesMentions(['a', 'b'], ['a'])).toBe(false)
    expect(memesMentions(['a'], ['b'])).toBe(false)
    expect(memesMentions([], ['a'])).toBe(false)
  })
})
