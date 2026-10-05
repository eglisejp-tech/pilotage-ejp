import { describe, expect, it } from 'vitest'
import { lecteurDuCompte, typeSessionDeLAdresse } from './lecteur'

describe('lecteurDuCompte', () => {
  it('berger, conseil et administration de l’église lisent la vue sous leur profil', () => {
    expect(lecteurDuCompte({ type: 'berger', ministereId: null })).toEqual({ profil: 'berger' })
    expect(lecteurDuCompte({ type: 'conseil', ministereId: null })).toEqual({ profil: 'conseil' })
    expect(lecteurDuCompte({ type: 'admin_eglise', ministereId: null })).toEqual({
      profil: 'admin_eglise',
    })
  })

  it('un ministère lit la vue avec son ministère', () => {
    expect(lecteurDuCompte({ type: 'ministere', ministereId: 'm1' })).toEqual({
      profil: 'ministere',
      ministereId: 'm1',
    })
  })

  it('EJP Tech et un ministère sans ministère : aucune vue', () => {
    expect(lecteurDuCompte({ type: 'admin_plateforme', ministereId: null })).toBeNull()
    expect(lecteurDuCompte({ type: 'ministere', ministereId: null })).toBeNull()
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
