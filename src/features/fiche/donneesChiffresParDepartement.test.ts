import { describe, expect, it } from 'vitest'
import {
  blocVisible,
  construireChiffresParDepartement,
} from '@/features/fiche/donneesChiffresParDepartement'
import { statistiquesExemple } from '@/features/saisie-fij/apercu/exemplesE4'

function donnees(forme: Parameters<typeof statistiquesExemple>[0]) {
  const construit = construireChiffresParDepartement(statistiquesExemple(forme))
  if (construit?.situation !== 'donnees') throw new Error('données attendues')
  return construit.donnees
}

describe('construireChiffresParDepartement', () => {
  it('aucune ligne (profil sans droit de lecture) : pas de bloc', () => {
    expect(construireChiffresParDepartement([])).toBeNull()
  })

  it('aucune saisie sur les 10 dimanches : premier usage', () => {
    expect(construireChiffresParDepartement(statistiquesExemple('premier-usage'))).toEqual({
      situation: 'premier_usage',
    })
  })

  it('total de chaque rubrique du dimanche de référence, avec « 6 dép. sur 8 »', () => {
    const bloc = donnees('donnees')
    expect(bloc.dimanche).toBe('2026-09-27')
    expect(bloc.semaine).toBe('Semaine 39, du 21 au 27 sept.')
    expect(bloc.rubriques.map((rubrique) => rubrique.libelle)).toEqual([
      'Présents au culte EJP',
      'Présents à la réunion FIJ',
      "Présents à l'évangélisation",
      'Membres du mardi',
    ])
    const [culte] = bloc.rubriques
    expect(culte?.total).toBe(48)
    expect(culte?.completude).toBe('6 dép. sur 8')
    expect(culte?.complet).toBe(false)
  })

  it('« 8 dép. sur 8 » pour une semaine complète', () => {
    const lignes = statistiquesExemple('donnees').filter((ligne) => ligne.dimanche !== '2026-09-27')
    const construit = construireChiffresParDepartement(lignes)
    if (construit?.situation !== 'donnees') throw new Error('données attendues')
    expect(construit.donnees.dimanche).toBe('2026-09-20')
    expect(construit.donnees.rubriques[0]?.completude).toBe('8 dép. sur 8')
    expect(construit.donnees.rubriques[0]?.complet).toBe(true)
  })

  it('courbe des 10 dimanches : trous gardés, cercle vide pour la semaine incomplète', () => {
    const { courbe } = donnees('donnees').rubriques[0] ?? { courbe: null }
    expect(courbe?.points).toHaveLength(10)
    // Trois premiers dimanches et le 30 août sans saisie : des trous, jamais 0.
    expect(courbe?.points.map((point) => point.valeur === null)).toEqual([
      true,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ])
    expect(courbe?.points.at(-1)?.incomplet).toBe(true)
    expect(courbe?.points.at(-2)?.incomplet).toBe(false)
    expect(courbe?.description).toContain('sans saisie')
    expect(courbe?.description).toContain('48 (6 dép. sur 8)')
  })

  it('par département : la dernière valeur, ou null (« Pas de saisie »), jamais 0', () => {
    const { departements } = donnees('donnees')
    expect(departements.map((departement) => departement.code)).toEqual([
      '75',
      '77',
      '78',
      '91',
      '92',
      '93',
      '94',
      '95',
    ])
    expect(departements.find((d) => d.code === '77')?.valeurs.culte_ejp).toBeNull()
    expect(departements.find((d) => d.code === '75')?.valeurs.culte_ejp).toBe(11)
  })

  it('semaine de référence vide, courbes remplies avant : « semaineVide »', () => {
    const bloc = donnees('semaine-vide')
    expect(bloc.semaineVide).toBe(true)
    expect(bloc.rubriques.every((rubrique) => rubrique.total === null)).toBe(true)
    expect(bloc.rubriques[0]?.completude).toBe('0 dép. sur 8')
  })

  it('semaine de référence vide : la courbe finit sur un cercle vide, jamais sur un point plein', () => {
    const points = donnees('semaine-vide').rubriques[0]?.courbe.points ?? []
    expect(points.at(-1)?.valeur).toBeNull()
    expect(points.findLast((point) => point.valeur !== null)?.incomplet).toBe(true)
  })
})

describe('blocVisible', () => {
  it('sur la seule fiche du ministère fij, pour le ministère, le berger, le conseil et EJP Tech', () => {
    for (const profil of ['ministere', 'berger', 'conseil', 'admin_plateforme'] as const) {
      expect(blocVisible('fij', profil), profil).toBe(true)
    }
  })

  it('absent de toute autre fiche, et pour l’administration', () => {
    expect(blocVisible(null, 'berger')).toBe(false)
    expect(blocVisible('coordination', 'berger')).toBe(false)
    expect(blocVisible('fij', 'admin_eglise')).toBe(false)
  })
})
