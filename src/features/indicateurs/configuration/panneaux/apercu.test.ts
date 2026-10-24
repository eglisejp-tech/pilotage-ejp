import { describe, expect, it } from 'vitest'
import {
  apercuCalcul,
  apercuSaisie,
  basCompatibles,
  calculPossible,
  calculsQuiPartent,
  etatLimite,
  periodeApercu,
} from '@/features/indicateurs/configuration/panneaux/apercu'
import type { SourceCalcul } from '@/features/indicateurs/configuration/panneaux/apercu'
import { ESPACE_INSECABLE, nombre } from '@/lib/metier/texte'

const source = (id: string, nature: SourceCalcul['nature']): SourceCalcul => ({
  id,
  libelle: id,
  nature,
  unite: 'nombre',
  jamaisSaisi: false,
})

describe('apercuCalcul : des nombres d’exemple, jamais une valeur lue', () => {
  it('un taux : 16 sur 20, soit 80 %', () => {
    expect(apercuCalcul('taux')).toBe(`Par exemple : 16 sur 20, soit 80${ESPACE_INSECABLE}%`)
  })

  it('un taux garde le même exemple quel que soit le chiffre du haut', () => {
    expect(apercuCalcul('taux', 'euros')).toBe(apercuCalcul('taux', 'nombre'))
  })

  it('une moyenne : une décimale, avec l’unité du haut', () => {
    expect(apercuCalcul('moyenne')).toBe(`Par exemple : ${nombre(1240)} pour 53, soit 23,4`)
    expect(apercuCalcul('moyenne', 'grand_nombre')).toBe(
      `Par exemple : ${nombre(1240)} pour 53, soit 23,4`,
    )
    expect(apercuCalcul('moyenne', 'euros')).toBe(
      `Par exemple : ${nombre(1240)}${ESPACE_INSECABLE}€ pour 53, soit 23,4${ESPACE_INSECABLE}€`,
    )
  })

  it('tant que rien n’est choisi, il montre le taux', () => {
    expect(apercuCalcul(null)).toBe(apercuCalcul('taux'))
  })
})

describe('apercuSaisie : « Publications, septembre 2026 : __ »', () => {
  const base = {
    libelle: 'Publications',
    nature: 'mois' as const,
    unite: 'nombre' as const,
    aujourdhui: '2026-10-12',
    dimancheReference: '2026-10-11',
  }

  it('un indicateur du mois cite le dernier mois fini', () => {
    expect(apercuSaisie(base)).toBe('Publications, septembre 2026 : __')
  })

  it('en janvier, le dernier mois fini est décembre de l’année précédente', () => {
    expect(apercuSaisie({ ...base, aujourdhui: '2026-01-05' })).toBe(
      'Publications, décembre 2025 : __',
    )
  })

  it('un indicateur du dimanche cite le dimanche de référence', () => {
    expect(apercuSaisie({ ...base, nature: 'dimanche' })).toBe(
      'Publications, dimanche 11 oct. : __',
    )
  })

  it('un « à ce jour » le dit', () => {
    expect(apercuSaisie({ ...base, nature: 'a_ce_jour' })).toBe('Publications, à ce jour : __')
  })

  it('sans rythme choisi ou sans date lue, aucune période n’est inventée', () => {
    expect(apercuSaisie({ ...base, nature: null })).toBe('Publications : __')
    expect(apercuSaisie({ ...base, aujourdhui: null })).toBe('Publications : __')
    expect(periodeApercu('dimanche', '2026-10-12', null)).toBeNull()
  })

  it('des euros portent leur signe', () => {
    expect(apercuSaisie({ ...base, unite: 'euros' })).toBe(
      `Publications, septembre 2026 : __${ESPACE_INSECABLE}€`,
    )
  })

  it('un libellé vide montre « Votre indicateur », les espaces sont réduites', () => {
    expect(apercuSaisie({ ...base, libelle: '   ' })).toBe('Votre indicateur, septembre 2026 : __')
    expect(apercuSaisie({ ...base, libelle: '  Pages   Roses ' })).toBe(
      'Pages Roses, septembre 2026 : __',
    )
  })
})

describe('sources d’un calcul', () => {
  const dimanche1 = source('d1', 'dimanche')
  const dimanche2 = source('d2', 'dimanche')
  const mois1 = source('m1', 'mois')
  const ceJour = source('j1', 'a_ce_jour')
  const toutes = [dimanche1, dimanche2, mois1, ceJour]

  it('le bas a le rythme du haut, ou bien il est « à ce jour »', () => {
    expect(basCompatibles(toutes, 'd1').map((s) => s.id)).toEqual(['d2', 'j1'])
    expect(basCompatibles(toutes, 'm1').map((s) => s.id)).toEqual(['j1'])
  })

  it('un « à ce jour » en haut n’accepte pas un autre rythme en bas', () => {
    expect(basCompatibles(toutes, 'j1')).toEqual([])
    expect(basCompatibles([...toutes, source('j2', 'a_ce_jour')], 'j1').map((s) => s.id)).toEqual([
      'j2',
    ])
  })

  it('le haut n’est jamais son propre bas', () => {
    expect(basCompatibles(toutes, 'd1').map((s) => s.id)).not.toContain('d1')
  })

  it('sans haut choisi, toutes les sources restent proposées', () => {
    expect(basCompatibles(toutes, '')).toEqual(toutes)
  })

  it('un calcul demande deux sources qui se calculent ensemble', () => {
    expect(calculPossible([])).toBe(false)
    expect(calculPossible([dimanche1])).toBe(false)
    expect(calculPossible([dimanche1, mois1])).toBe(false)
    expect(calculPossible([dimanche1, dimanche2])).toBe(true)
    expect(calculPossible([mois1, ceJour])).toBe(true)
  })
})

describe('etatLimite : la fiche de 30 lignes', () => {
  const limites = (lignes: number) => ({ ajouts: 0, ajouts_max: 3, lignes, lignes_max: 30 })

  it('dit la place prise et garde la main libre tant qu’il reste de la place', () => {
    const etat = etatLimite(limites(12), false)
    expect(etat.phrase).toBe('La fiche compte 12 indicateurs sur 30 au plus.')
    expect(etat.plein).toBe(false)
    expect(etat.refus).toBeNull()
  })

  it('29 lignes laissent une place, 30 la ferment', () => {
    expect(etatLimite(limites(29), false).plein).toBe(false)
    const plein = etatLimite(limites(30), false)
    expect(plein.plein).toBe(true)
    expect(plein.refus).toBe(
      'Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.',
    )
  })

  it('un remplacement ne compte pas l’indicateur remplacé : la fiche pleine peut remplacer', () => {
    expect(etatLimite(limites(30), true).plein).toBe(false)
    expect(etatLimite(limites(31), true).plein).toBe(true)
  })

  it('accorde « indicateur » au singulier', () => {
    expect(etatLimite(limites(1), false).phrase).toBe(
      'La fiche compte 1 indicateur sur 30 au plus.',
    )
    expect(etatLimite(limites(0), false).phrase).toBe(
      'La fiche compte 0 indicateur sur 30 au plus.',
    )
  })
})

describe('calculsQuiPartent : les calculs suivis qui se servent d’un indicateur', () => {
  const calculs = [
    { id: 'c1', libelle: 'Taux A' },
    { id: 'c2', libelle: 'Taux B' },
  ]

  it('nomme chaque calcul suivi une seule fois, dans l’ordre de la fiche', () => {
    const termes = [{ calcul_id: 'c2' }, { calcul_id: 'c1' }, { calcul_id: 'c2' }]
    expect(calculsQuiPartent(termes, calculs)).toEqual(['Taux A', 'Taux B'])
  })

  it('ignore un calcul qui n’est plus suivi (déjà retiré) et ne nomme rien sans terme', () => {
    expect(calculsQuiPartent([{ calcul_id: 'retire' }], calculs)).toEqual([])
    expect(calculsQuiPartent([], calculs)).toEqual([])
  })
})
