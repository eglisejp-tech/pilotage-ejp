import { describe, expect, it } from 'vitest'
import {
  aDesFiltres,
  ecrireFiltres,
  FILTRES_RETIRES,
  lireFiltres,
  SANS_FILTRE,
} from '@/features/journal/filtres'

describe('filtres du journal dans l’adresse', () => {
  it('sans paramètre : tous les comptes, toutes les actions, 30 derniers jours', () => {
    expect(lireFiltres(new URLSearchParams())).toEqual(SANS_FILTRE)
  })

  it('lit compte, action, période et ministère', () => {
    const parametres = new URLSearchParams(
      'compte=u-1&action=point_cree&periode=3m&ministere=min-communication',
    )
    expect(lireFiltres(parametres)).toEqual({
      compte: 'u-1',
      action: 'point_cree',
      periode: '3m',
      ministere: 'min-communication',
    })
  })

  it('ignore une action inconnue, une période inconnue et un identifiant douteux', () => {
    const filtres = lireFiltres(
      new URLSearchParams('compte=a,b&action=supprimer&periode=hier&ministere=x)or(y'),
    )
    expect(filtres).toEqual(SANS_FILTRE)
  })

  it('écrit les filtres sans la période par défaut, et garde les autres paramètres', () => {
    const base = new URLSearchParams('autre=1&compte=ancien')
    const suivants = ecrireFiltres(base, { ...SANS_FILTRE, action: 'point_traite' })
    expect(suivants.toString()).toBe('autre=1&action=point_traite')
    expect(ecrireFiltres(base, { ...SANS_FILTRE, periode: '7j' }).get('periode')).toBe('7j')
    expect(ecrireFiltres(base, FILTRES_RETIRES).get('periode')).toBe('tout')
  })

  it('« Retirer les filtres » ouvre toute la période et ôte les autres choix', () => {
    expect(aDesFiltres(SANS_FILTRE)).toBe(true)
    expect(aDesFiltres(FILTRES_RETIRES)).toBe(false)
    expect(aDesFiltres({ ...FILTRES_RETIRES, ministere: 'm' })).toBe(true)
    expect(aDesFiltres({ ...FILTRES_RETIRES, compte: 'c' })).toBe(true)
    expect(aDesFiltres({ ...FILTRES_RETIRES, action: 'point_cree' })).toBe(true)
  })
})
