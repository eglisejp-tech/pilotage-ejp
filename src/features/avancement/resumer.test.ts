import { describe, expect, it } from 'vitest'
import { ETAPES, MISE_A_JOUR } from '@/features/avancement/etapes'
import type { Etape } from '@/features/avancement/etapes'
import { premierePrevue, resumer, statutDe } from '@/features/avancement/resumer'
import { enPartie, notePanneau, phraseProchaine } from '@/features/avancement/textesAvancement'

function etape(livre: number, prevu: number): Etape {
  const partie = { quoi: 'x', date: '2026-10-09' }
  return {
    numero: 1,
    titre: 't',
    pourQui: 'p',
    livre: Array.from({ length: livre }, () => partie),
    prevu: Array.from({ length: prevu }, () => partie),
  }
}

describe('statutDe', () => {
  it("déduit l'état de ce qui est livré et prévu", () => {
    expect(statutDe(etape(1, 0))).toBe('en-ligne')
    expect(statutDe(etape(1, 2))).toBe('en-partie')
    expect(statutDe(etape(0, 2))).toBe('a-venir')
  })
})

describe('resumer', () => {
  it('compte 6 étapes sur 8, prochaine : Mes indicateurs et validation', () => {
    const resume = resumer(ETAPES)
    expect(resume.enLigne).toBe(6)
    expect(resume.total).toBe(8)
    expect(resume.prochaine?.numero).toBe(6)
    expect(resume.prochaine?.partie).toEqual({
      quoi: 'Mes indicateurs et validation',
      date: '2026-10-16',
    })
  })

  it("choisit la date la plus proche, pas l'ordre des étapes", () => {
    const tard = { ...etape(1, 0), numero: 2 as const, prevu: [{ quoi: 'B', date: '2026-10-20' }] }
    const tot = { ...etape(1, 0), numero: 3 as const, prevu: [{ quoi: 'A', date: '2026-10-12' }] }
    expect(resumer([tard, tot]).prochaine?.numero).toBe(3)
  })

  it("n'a pas de prochaine partie quand tout est en ligne", () => {
    expect(resumer([etape(1, 0)]).prochaine).toBeNull()
  })

  it('a 8 étapes numérotées de 1 à 8', () => {
    expect(ETAPES.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(premierePrevue(ETAPES[0] as Etape)).toBeUndefined()
  })
})

describe('textes', () => {
  it('écrit les dates à la française, sans tiret', () => {
    expect(phraseProchaine('Sessions', '2026-10-09')).toBe(
      'Prochaine : Sessions, prévue vendredi 9 oct.',
    )
    expect(notePanneau(MISE_A_JOUR)).toBe(
      'Point du 8 oct. Les dates à venir sont celles du plan : elles peuvent bouger.',
    )
    expect(enPartie(ETAPES[5] as Etape)).toBe('En partie : 4 parties sur 5 en ligne.')
    for (const e of ETAPES) {
      expect(JSON.stringify(e)).not.toMatch(new RegExp('[\u2013\u2014]'))
    }
  })
})
