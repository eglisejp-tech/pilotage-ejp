import { describe, expect, it } from 'vitest'
import {
  conditionsDe,
  connexionsAffichees,
  nombreAEffacer,
  personnesActives,
  personnesSansActivite,
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
      // La suite (« Pas encore celles du... ») dépend de la version en cours.
      conditions: expect.stringMatching(
        /^Conditions du 12 octobre 2026 acceptées le 12 oct\., 9 h 30\./,
      ) as unknown,
    })
  })

  it('dit quelles conditions chaque personne a acceptées, et quand (T61)', () => {
    expect(conditionsDe('2026-10-12', '2026-10-13T07:00:00+00:00', '2026-10-12')).toBe(
      'Conditions du 12 octobre 2026 acceptées le 13 oct., 9 h.',
    )
    expect(conditionsDe('2026-10-08', '2026-10-09T16:10:00+00:00', '2026-10-12')).toBe(
      'Conditions du 8 octobre 2026 acceptées le 9 oct., 18 h 10. Pas encore celles du 12 octobre 2026.',
    )
    expect(conditionsDe(null, null, '2026-10-12')).toBe('Conditions pas encore acceptées.')
    const [communication, integration] = personnesActives(PERSONNES_EXEMPLE)
    // Paul vient de dire son prénom, sans avoir encore accepté.
    expect(communication?.personnes[0]?.conditions).toBe('Conditions pas encore acceptées.')
    // Le prénom effacé garde son acceptation.
    expect(integration?.personnes[1]?.prenom).toBe('[prénom effacé]')
    expect(integration?.personnes[1]?.conditions).toMatch(
      /^Conditions du 8 octobre 2026 acceptées le 8 oct\., 11 h\./,
    )
  })

  it('un prénom déjà effacé n’a pas de bouton', () => {
    const efface = personnesActives(PERSONNES_EXEMPLE)[1]?.personnes[1]
    expect(efface?.efface).toBe(true)
  })

  it('compte les prénoms de plus de 12 mois à effacer, pas les déclarations', () => {
    // Joël a deux déclarations anciennes, Ancien une : deux prénoms.
    expect(nombreAEffacer(PERSONNES_EXEMPLE)).toBe(2)
    expect(nombreAEffacer([])).toBe(0)
    const chaqueSemaine = { ...PERSONNES_EXEMPLE[2]!, declarations_anciennes: 52 }
    expect(nombreAEffacer([chaqueSemaine])).toBe(1)
  })

  it('une personne sans activité depuis 31 jours reste effaçable', () => {
    const comptes = personnesSansActivite(PERSONNES_EXEMPLE)
    expect(comptes.map((c) => c.libelle)).toEqual(['Ministère Intégration'])
    expect(comptes[0]?.personnes.map((p) => [p.prenom, p.intervenantId])).toEqual([['Ancien', 3]])
    const inactive = {
      ...PERSONNES_EXEMPLE[0]!,
      connexions_30_jours: 0,
      jours_30_jours: 0,
      actions_30_jours: 0,
      derniere_activite: '2026-09-10T09:00:00+00:00',
    }
    expect(personnesActives([inactive])).toEqual([])
    expect(personnesSansActivite([inactive])[0]?.personnes[0]?.prenom).toBe('Marie D.')
    // Un prénom déjà effacé n'a plus rien à effacer.
    expect(personnesSansActivite([{ ...inactive, prenom: '[prénom effacé]' }])).toEqual([])
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
