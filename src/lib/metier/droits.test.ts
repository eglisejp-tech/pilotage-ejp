import { describe, expect, it } from 'vitest'
import type { TypeCompte } from '@/lib/base'
import { DECIDEURS, enLectureSeule, estDecideur, LECTEURS, litTout } from './droits'

const PROFILS: TypeCompte[] = ['ministere', 'berger', 'conseil', 'admin_eglise', 'admin_plateforme']

describe('droits par profil (miroir de private.lit_tout et private.est_decideur, T29)', () => {
  it('le berger et le conseil lisent tout et décident', () => {
    for (const type of ['berger', 'conseil'] as const) {
      expect(litTout(type), type).toBe(true)
      expect(estDecideur(type), type).toBe(true)
      expect(enLectureSeule(type), type).toBe(false)
    }
  })

  it('EJP Tech lit tout, ne décide de rien et reste en lecture seule', () => {
    expect(litTout('admin_plateforme')).toBe(true)
    expect(estDecideur('admin_plateforme')).toBe(false)
    expect(enLectureSeule('admin_plateforme')).toBe(true)
  })

  it('ni le ministère ni l’administration de l’église ne lisent tout ni ne décident', () => {
    for (const type of ['ministere', 'admin_eglise'] as const) {
      expect(litTout(type), type).toBe(false)
      expect(estDecideur(type), type).toBe(false)
      expect(enLectureSeule(type), type).toBe(false)
    }
  })

  it('les mêmes listes que la base : est_decideur (berger, conseil), lit_tout (plus EJP Tech)', () => {
    expect(DECIDEURS).toEqual(['berger', 'conseil'])
    expect(LECTEURS).toEqual(['berger', 'conseil', 'admin_plateforme'])
    // Décider suppose de lire tout : aucun profil ne décide sans lire.
    for (const type of PROFILS) if (estDecideur(type)) expect(litTout(type), type).toBe(true)
    expect(PROFILS.filter(enLectureSeule)).toEqual(['admin_plateforme'])
  })
})
