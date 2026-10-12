import { describe, expect, it } from 'vitest'
import {
  connexionsAffichees,
  nombreAEffacer,
  personnesActives,
  quandConnexion,
} from '@/features/personnes/construirePersonnes'
import {
  CONNEXIONS_EXEMPLE,
  LIBELLES_EXEMPLE,
  PERSONNES_EXEMPLE,
} from '@/features/personnes/apercu/exemplesPersonnes'

describe('onglet « Personnes » (T56)', () => {
  it('range les personnes actives sur 30 jours par compte, la plus récente d’abord', () => {
    const comptes = personnesActives(PERSONNES_EXEMPLE)
    expect(comptes.map((c) => c.libelle)).toEqual([
      'Ministère Communication',
      'Ministère Intégration',
    ])
    expect(comptes[0]?.personnes.map((p) => p.prenom)).toEqual(['Paul', 'Marie D.'])
    // « Ancien » n'a rien fait depuis 30 jours : il n'est pas dans les actives.
    expect(comptes[1]?.personnes.map((p) => p.prenom)).toEqual(['Joël', '[prénom effacé]'])
  })

  it('donne les compteurs de la base et la dernière activité à l’heure de Paris', () => {
    const marie = personnesActives(PERSONNES_EXEMPLE)[0]?.personnes[1]
    expect(marie).toEqual({
      intervenantId: 41,
      prenom: 'Marie D.',
      efface: false,
      connexions: 4,
      jours: 6,
      actions: 9,
      derniereActivite: '11 oct., 11 h',
    })
  })

  it('un prénom déjà effacé n’a pas de bouton', () => {
    const efface = personnesActives(PERSONNES_EXEMPLE)[1]?.personnes[1]
    expect(efface?.efface).toBe(true)
  })

  it('compte les déclarations de plus de 12 mois à effacer', () => {
    expect(nombreAEffacer(PERSONNES_EXEMPLE)).toBe(3)
    expect(nombreAEffacer([])).toBe(0)
  })

  it('écrit chaque connexion en une phrase, à l’heure de Paris', () => {
    expect(quandConnexion('2026-10-11T09:00:00+00:00')).toBe('Dim. 11 oct., 11 h')
    const [premiere] = connexionsAffichees(CONNEXIONS_EXEMPLE.slice(0, 1), LIBELLES_EXEMPLE)
    expect(premiere?.texte).toBe('Dim. 11 oct., 11 h : Ministère Communication, Marie D.')
    expect(
      connexionsAffichees([{ ...CONNEXIONS_EXEMPLE[0]!, compte: 'inconnu' }], new Map())[0]?.texte,
    ).toBe('Dim. 11 oct., 11 h : Compte inconnu, Marie D.')
  })
})
