import { describe, expect, it } from 'vitest'
import {
  filtresRetenus,
  optionMinistere,
  optionsActions,
  optionsComptes,
} from '@/features/journal/choix'
import type { ChoixPossibles } from '@/features/journal/choix'
import { SANS_FILTRE } from '@/features/journal/filtres'

const COMPTES = optionsComptes([
  { user_id: 'u-2', libelle: 'Ministère Social', desactive_le: '2026-09-29T20:00:00+02:00' },
  { user_id: 'u-1', libelle: 'Berger', desactive_le: null },
])
const MINISTERES = [
  optionMinistere({ id: 'm-1', code: null, nom: 'Communication', desactive_le: null }),
  optionMinistere({ id: 'm-2', code: null, nom: 'Social', desactive_le: '2026-09-29' }),
]

function choix(profil: ChoixPossibles['profil'], avecComptes = true): ChoixPossibles {
  return {
    profil,
    comptes: avecComptes ? COMPTES : null,
    actions: optionsActions(profil),
    ministeres: MINISTERES,
  }
}

describe('options des filtres', () => {
  it('les comptes sont triés par libellé, un compte désactivé le dit', () => {
    expect(COMPTES.map((compte) => compte.libelle)).toEqual([
      'Berger',
      'Ministère Social (désactivé)',
    ])
  })

  it('un ministère désactivé garde son nom dans l’adresse', () => {
    expect(MINISTERES.map((ministere) => ministere.nom)).toEqual([
      'Communication',
      'Social (désactivé)',
    ])
  })
})

describe('filtres retenus', () => {
  const demande = {
    compte: 'u-1',
    action: 'point_cree' as const,
    periode: '7j' as const,
    ministere: 'm-1',
  }

  it('garde ce que la liste connaît', () => {
    expect(filtresRetenus(demande, choix('berger'))).toEqual(demande)
  })

  it('un ministère n’a ni filtre Compte ni ministère d’adresse', () => {
    expect(filtresRetenus(demande, choix('ministere', false))).toEqual({
      compte: null,
      action: 'point_cree',
      periode: '7j',
      ministere: null,
    })
  })

  it('ignore un compte, un ministère ou une action que la liste ne propose pas', () => {
    expect(
      filtresRetenus({ ...demande, compte: 'inconnu', ministere: 'inconnu' }, choix('berger')),
    ).toEqual({ ...demande, compte: null, ministere: null })
    // Un signalement ne se filtre pas pour le berger : la base ne lui en rend aucun.
    expect(
      filtresRetenus({ ...SANS_FILTRE, action: 'difficulte_signalee' }, choix('berger')).action,
    ).toBeNull()
    expect(
      filtresRetenus({ ...SANS_FILTRE, action: 'difficulte_signalee' }, choix('admin_plateforme'))
        .action,
    ).toBe('difficulte_signalee')
    expect(
      filtresRetenus({ ...SANS_FILTRE, action: 'point_cree' }, choix('admin_eglise')).action,
    ).toBeNull()
  })
})
