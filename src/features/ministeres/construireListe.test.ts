import { describe, expect, it } from 'vitest'
import { TABLEAU_EXEMPLE } from '@/features/fiche/apercu/exemplesFiche'
import { construireListeMinisteres } from '@/features/ministeres/construireListe'

describe('construireListeMinisteres', () => {
  it('du moins récent au plus récent, « Aucune saisie » d’abord, chaque nom vers sa fiche', () => {
    const liste = construireListeMinisteres(TABLEAU_EXEMPLE, '2026-10-07')
    expect(liste.map((l) => [l.nom, l.fraicheur.libelle])).toEqual([
      ['Coordination', 'Aucune saisie'],
      ['Social', 'Il y a 48 jours'],
      ['Intégration', 'Il y a 10 jours'],
      ['Communication', 'Il y a 3 jours'],
    ])
    expect(liste[3]).toMatchObject({
      href: '/ministeres/10000000-0000-4000-8000-000000000001',
      description: 'Visuels, réseaux sociaux et captations des cultes.',
      prochainEvenement: { date: '10 oct.', nom: { texte: 'Soirée de louange', masque: false } },
      prochaineReunion: '12 oct.',
      pointOuvert: 'haute',
    })
    expect(liste[0]).toMatchObject({
      description: null,
      prochainEvenement: null,
      prochaineReunion: null,
      pointOuvert: null,
    })
  })

  it('aucun ministère actif : une liste vide', () => {
    expect(construireListeMinisteres([], '2026-10-07')).toEqual([])
  })
})
