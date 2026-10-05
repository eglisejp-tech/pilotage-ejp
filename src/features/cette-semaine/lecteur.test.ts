import { describe, expect, it } from 'vitest'
import { lecteurDuCompte, typeSessionDeLAdresse, voitADecider } from './lecteur'

describe('lecteurDuCompte', () => {
  it('berger, conseil, administration de l’église et EJP Tech lisent la vue sous leur profil', () => {
    expect(lecteurDuCompte({ type: 'berger', ministereId: null })).toEqual({ profil: 'berger' })
    expect(lecteurDuCompte({ type: 'conseil', ministereId: null })).toEqual({ profil: 'conseil' })
    expect(lecteurDuCompte({ type: 'admin_eglise', ministereId: null })).toEqual({
      profil: 'admin_eglise',
    })
    expect(lecteurDuCompte({ type: 'admin_plateforme', ministereId: null })).toEqual({
      profil: 'admin_plateforme',
    })
  })

  it('un ministère lit la vue avec son ministère', () => {
    expect(lecteurDuCompte({ type: 'ministere', ministereId: 'm1' })).toEqual({
      profil: 'ministere',
      ministereId: 'm1',
    })
  })

  it('un ministère sans ministère : aucune vue', () => {
    expect(lecteurDuCompte({ type: 'ministere', ministereId: null })).toBeNull()
  })
})

describe('voitADecider', () => {
  it('berger, conseil et EJP Tech (lecture seule, T29) ; ni le ministère ni l’administration', () => {
    expect(voitADecider('berger')).toBe(true)
    expect(voitADecider('conseil')).toBe(true)
    expect(voitADecider('admin_plateforme')).toBe(true)
    expect(voitADecider('ministere')).toBe(false)
    expect(voitADecider('admin_eglise')).toBe(false)
  })
})

describe('typeSessionDeLAdresse', () => {
  it('reconnaît les trois types, sinon la dernière session', () => {
    expect(typeSessionDeLAdresse('batir')).toBe('batir')
    expect(typeSessionDeLAdresse('anti_dispersion')).toBe('anti_dispersion')
    expect(typeSessionDeLAdresse('autre')).toBe('autre')
    expect(typeSessionDeLAdresse('anti-dispersion')).toBeNull()
    expect(typeSessionDeLAdresse(null)).toBeNull()
  })
})
