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
  it('compte 8 étapes sur 8, sans prochaine partie', () => {
    const resume = resumer(ETAPES)
    expect(resume.enLigne).toBe(8)
    expect(resume.total).toBe(8)
    expect(resume.prochaine).toBeNull()
  })

  it('donne la prochaine partie et son étape quand il en reste une', () => {
    const fini = { ...etape(1, 0), numero: 1 as const }
    const enCours = {
      ...etape(2, 0),
      numero: 2 as const,
      prevu: [{ quoi: 'Sessions', date: '2026-10-16' }],
    }
    const resume = resumer([fini, enCours])
    expect(resume.enLigne).toBe(1)
    expect(resume.prochaine).toEqual({
      numero: 2,
      partie: { quoi: 'Sessions', date: '2026-10-16' },
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

  it('livraison du 23 octobre : textes et messages revus (étape 7), toutes les étapes en ligne', () => {
    expect(MISE_A_JOUR).toBe('2026-10-23')
    const [six, sept] = [ETAPES[5] as Etape, ETAPES[6] as Etape]
    expect(six.livre.at(-1)).toEqual({ quoi: 'Gestion par EJP Tech', date: '2026-10-14' })
    expect(statutDe(six)).toBe('en-ligne')
    expect(sept.livre.at(-1)).toEqual({ quoi: 'Textes et messages revus', date: '2026-10-23' })
    expect(sept.livre).toHaveLength(6)
    expect(sept.prevu).toEqual([])
    expect(ETAPES.every((e) => statutDe(e) === 'en-ligne')).toBe(true)
  })
})

describe('textes', () => {
  it('écrit les dates à la française, sans tiret', () => {
    expect(phraseProchaine('Sessions', '2026-10-09')).toBe(
      'Prochaine : Sessions, prévue vendredi 9 oct.',
    )
    expect(notePanneau('2026-10-14', true)).toBe(
      'Mis à jour le 14 oct. Les dates à venir peuvent changer.',
    )
    // Plus aucune date à venir : la note ne parle plus de dates qui peuvent changer.
    expect(notePanneau(MISE_A_JOUR, false)).toBe('Mis à jour le 23 oct.')
    expect(enPartie(etape(5, 1))).toBe('En partie : 5 parties sur 6 en ligne.')
    for (const e of ETAPES) {
      expect(JSON.stringify(e)).not.toMatch(new RegExp('[\u2013\u2014]'))
    }
  })
})
