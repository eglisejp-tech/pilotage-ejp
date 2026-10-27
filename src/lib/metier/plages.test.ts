import { describe, expect, it } from 'vitest'
import { datesDeSerie, unAnApres } from './plages'

describe('datesDeSerie (T78, lot 2)', () => {
  it('S1 : chaque lundi du lun. 2 nov. au lun. 14 déc. 2026 donne sept dates', () => {
    expect(datesDeSerie('2026-11-02', '2026-12-14', [1])).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
      '2026-12-07',
      '2026-12-14',
    ])
  })

  it('plusieurs jours de la semaine, dans l’ordre des dates', () => {
    expect(datesDeSerie('2026-10-26', '2026-11-01', [3, 6, 7])).toEqual([
      '2026-10-28',
      '2026-10-31',
      '2026-11-01',
    ])
  })

  it('la première date sans son jour coché n’est pas prise', () => {
    expect(datesDeSerie('2026-10-27', '2026-11-10', [1])).toEqual(['2026-11-02', '2026-11-09'])
  })

  it('aucun jour coché, ou une dernière date avant la première : aucune date', () => {
    expect(datesDeSerie('2026-11-02', '2026-12-14', [])).toEqual([])
    expect(datesDeSerie('2026-11-02', '2026-11-01', [1, 2, 3, 4, 5, 6, 7])).toEqual([])
  })

  it('année bissextile : le 29 février 2028 est un mardi', () => {
    expect(datesDeSerie('2028-02-27', '2028-03-01', [2])).toEqual(['2028-02-29'])
    expect(datesDeSerie('2027-02-27', '2027-03-01', [1, 2, 3, 4, 5, 6, 7])).toEqual([
      '2027-02-27',
      '2027-02-28',
      '2027-03-01',
    ])
  })

  it('s’arrête à 32 dates, assez pour dire « 31 au plus »', () => {
    expect(datesDeSerie('2026-11-01', '2027-10-31', [1, 2, 3, 4, 5, 6, 7])).toHaveLength(32)
    expect(datesDeSerie('2026-11-01', '9999-12-31', [1])).toHaveLength(32)
  })

  it('un an après : comme la base, le 29 février donne le 28', () => {
    expect(unAnApres('2026-11-02')).toBe('2027-11-02')
    expect(unAnApres('2028-02-29')).toBe('2029-02-28')
    expect(unAnApres('2027-02-28')).toBe('2028-02-28')
  })
})
