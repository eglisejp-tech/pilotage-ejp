import { describe, expect, it } from 'vitest'
import {
  formaterMinutes,
  formaterPartALHeure,
  formaterRetardMoyen,
  partALHeure,
  ponctualiteDesMois,
  ponctualiteDuMois,
  retardMoyen,
} from './ponctualite'

const MOIS = {
  realises: 6,
  avec_heures: 4,
  a_l_heure: 2,
  retard_cumule: 50,
  cultes: 4,
  cultes_avec_heures: 4,
  cultes_a_l_heure: 3,
  cultes_retard_cumule: 17,
}

const AUTRE_MOIS = {
  realises: 3,
  avec_heures: 1,
  a_l_heure: 1,
  retard_cumule: 0,
  cultes: 2,
  cultes_avec_heures: 2,
  cultes_a_l_heure: 1,
  cultes_retard_cumule: 14,
}

const RIEN = {
  realises: 0,
  avec_heures: 0,
  a_l_heure: 0,
  retard_cumule: 0,
  cultes: 0,
  cultes_avec_heures: 0,
  cultes_a_l_heure: 0,
  cultes_retard_cumule: 0,
}

describe('ponctualiteDuMois', () => {
  it('sépare événements et cultes, puis les additionne', () => {
    expect(ponctualiteDuMois(MOIS)).toEqual({
      evenements: { tenus: 6, avecHeures: 4, aLHeure: 2, retardCumule: 50 },
      cultes: { tenus: 4, avecHeures: 4, aLHeure: 3, retardCumule: 17 },
      total: { tenus: 10, avecHeures: 8, aLHeure: 5, retardCumule: 67 },
    })
  })
})

describe('ponctualiteDesMois', () => {
  it('« Depuis le ... » : sommes des mois sur sommes des mois, jamais une moyenne de parts', () => {
    const depuis = ponctualiteDesMois([MOIS, AUTRE_MOIS])
    expect(depuis.total).toEqual({ tenus: 15, avecHeures: 11, aLHeure: 7, retardCumule: 81 })
    // 7 sur 11 : 64 %, et non la moyenne de 63 % et 67 %.
    expect(partALHeure(depuis.total)).toBe(64)
    expect(depuis.evenements.tenus).toBe(9)
    expect(depuis.cultes.retardCumule).toBe(31)
  })

  it('aucun mois : tout à 0, « Non calculé »', () => {
    const depuis = ponctualiteDesMois([])
    expect(depuis.total).toEqual({ tenus: 0, avecHeures: 0, aLHeure: 0, retardCumule: 0 })
    expect(formaterPartALHeure(depuis.total)).toBe('Non calculé')
  })
})

describe('partALHeure et retardMoyen', () => {
  it('part arrondie comme le pourcentage FIJ (0,5 vers le haut), retard moyen à la minute', () => {
    const { total, evenements } = ponctualiteDuMois(MOIS)
    expect(partALHeure(total)).toBe(63)
    expect(formaterPartALHeure(total)).toBe('63 %')
    expect(retardMoyen(total)).toBe(8)
    expect(formaterRetardMoyen(total)).toBe('8 min')
    expect(partALHeure(evenements)).toBe(50)
    // 50 ÷ 4 = 12,5 : arrondi à 13.
    expect(retardMoyen(evenements)).toBe(13)
  })

  it('aucun avec ses heures : « Non calculé », jamais 0 %', () => {
    const { total } = ponctualiteDuMois({ ...RIEN, realises: 2 })
    expect(partALHeure(total)).toBeNull()
    expect(retardMoyen(total)).toBeNull()
    expect(formaterPartALHeure(total)).toBe('Non calculé')
    expect(formaterRetardMoyen(total)).toBe('Non calculé')
  })

  it('tous à l’heure, avance comptée 0 : 100 % et 0 min', () => {
    const { total } = ponctualiteDuMois({ ...RIEN, realises: 2, avec_heures: 2, a_l_heure: 2 })
    expect(formaterPartALHeure(total)).toBe('100 %')
    expect(formaterRetardMoyen(total)).toBe('0 min')
  })
})

describe('formaterMinutes', () => {
  it('« 35 min », « 1 234 min »', () => {
    expect(formaterMinutes(35)).toBe('35 min')
    expect(formaterMinutes(1234)).toBe('1 234 min')
  })
})
