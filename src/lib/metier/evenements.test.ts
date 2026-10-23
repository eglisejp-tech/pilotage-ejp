import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  aDesLignesCachees,
  evenementsAConfirmer,
  lignesVisibles,
  LIGNES_VISIBLES_ALERTE,
} from './alerteEvenements'
import {
  commenceA,
  dansLeCalendrier,
  estEtatFinal,
  FENETRE_A_RENSEIGNER_JOURS,
  FENETRE_PASSE_JOURS,
  heureDuJournal,
  resteARenseigner,
  texteDesJours,
  texteDuDebut,
  tonDesJours,
  trierEvenements,
} from './evenements'

describe('heures et ponctualité (T68)', () => {
  it('Terminé et Annulé sont les états finals', () => {
    expect(estEtatFinal('termine')).toBe(true)
    expect(estEtatFinal('annule')).toBe(true)
    for (const statut of ['brouillon', 'attente_validation', 'valide', 'preparation'] as const) {
      expect(estEtatFinal(statut), statut).toBe(false)
    }
  })

  it('resteARenseigner : passé sans état final, ou Terminé sans heure de début, 30 jours au plus', () => {
    expect(FENETRE_A_RENSEIGNER_JOURS).toBe(30)
    const reste = (
      statut: Parameters<typeof estEtatFinal>[0],
      jours: number,
      debut: number | null = null,
    ) => resteARenseigner({ statut, jours, heure_debut: debut })
    expect(reste('valide', -1)).toBe('statut')
    expect(reste('preparation', -30)).toBe('statut')
    expect(reste('valide', -31)).toBeNull()
    // Un événement du jour qui n'est pas terminé n'est pas en retard.
    expect(reste('valide', 0)).toBeNull()
    expect(reste('valide', 3)).toBeNull()
    expect(reste('annule', -2)).toBeNull()
    expect(reste('termine', 0)).toBe('heure_debut')
    expect(reste('termine', -30)).toBe('heure_debut')
    expect(reste('termine', -31)).toBeNull()
    expect(reste('termine', -2, 1152)).toBeNull()
    // Terminé à une date à venir : la base refuserait l'heure de début.
    expect(reste('termine', 1)).toBeNull()
  })

  it('texteDuDebut : la vue décide du retard et de « à l’heure », l’écran les écrit', () => {
    expect(texteDuDebut({ heure_debut: 1152, retard: 12, a_l_heure: false })).toBe(
      'Commencé à 19 h 12, 12 min de retard',
    )
    expect(texteDuDebut({ heure_debut: 1143, retard: 3, a_l_heure: true })).toBe(
      "Commencé à 19 h 03, à l'heure",
    )
    expect(texteDuDebut({ heure_debut: 1135, retard: -5, a_l_heure: true })).toBe(
      "Commencé à 18 h 55, à l'heure",
    )
    // Passage de minuit, calculé par la base : 23 h 30 puis 0 h 05.
    expect(texteDuDebut({ heure_debut: 5, retard: 35, a_l_heure: false })).toBe(
      'Commencé à 0 h 05, 35 min de retard',
    )
    expect(texteDuDebut({ heure_debut: 1140, retard: null, a_l_heure: null })).toBe(
      'Commencé à 19 h',
    )
    expect(texteDuDebut({ heure_debut: null, retard: null, a_l_heure: null })).toBeNull()
  })

  it('heures du journal : minutes lisibles en « 19 h 12 », sinon rien', () => {
    expect(heureDuJournal(1152)).toBe('19 h 12')
    expect(heureDuJournal(1140)).toBe('19 h')
    expect(heureDuJournal(0)).toBe('0 h')
    for (const valeur of [undefined, null, 1440, -1, 19.5, '1152']) {
      expect(heureDuJournal(valeur), String(valeur)).toBeNull()
    }
    expect(commenceA(1152)).toBe('commencé à 19 h 12')
    expect(commenceA(undefined)).toBeNull()
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('texteDesJours', () => {
  it.each([
    [0, "aujourd'hui"],
    [1, 'demain'],
    [2, 'dans 2 jours'],
    [3, 'dans 3 jours'],
    [-1, 'date passée (hier)'],
    [-2, 'date passée depuis 2 jours'],
    [-10, 'date passée depuis 10 jours'],
  ])('%i jour(s) : « %s »', (jours, texte) => {
    expect(texteDesJours(jours)).toBe(texte)
  })

  it('refuse un nombre qui n’est pas entier', () => {
    expect(() => texteDesJours(1.5)).toThrow(RangeError)
  })

  it('ne lit jamais l’horloge : le même nombre donne le même texte à toute heure', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T22:30:00Z'))
    const avant = texteDesJours(-1)
    vi.setSystemTime(new Date('2026-10-07T00:30:00Z'))
    expect(texteDesJours(-1)).toBe(avant)
  })
})

describe('tonDesJours', () => {
  it('une date passée est en alerte, les autres en attention', () => {
    expect(tonDesJours(-1)).toBe('alerte')
    expect(tonDesJours(0)).toBe('attention')
    expect(tonDesJours(3)).toBe('attention')
  })
})

describe('dansLeCalendrier', () => {
  it('garde au plus 7 jours dans le passé, et tout événement à confirmer', () => {
    expect(FENETRE_PASSE_JOURS).toBe(7)
    expect(dansLeCalendrier({ jours: -7, a_confirmer: false })).toBe(true)
    expect(dansLeCalendrier({ jours: -8, a_confirmer: false })).toBe(false)
    expect(dansLeCalendrier({ jours: -30, a_confirmer: true })).toBe(true)
    expect(dansLeCalendrier({ jours: 20, a_confirmer: false })).toBe(true)
  })
})

const evenement = (titre: string, date: string, a_confirmer = true) => ({
  titre,
  date,
  jours: 0,
  a_confirmer,
})

describe('trierEvenements', () => {
  it('trie par date, puis par nom, sans toucher la liste reçue', () => {
    const liste = [
      evenement('Soirée', '2026-10-10'),
      evenement('Éveil', '2026-10-03'),
      evenement('Accueil', '2026-10-10'),
    ]
    expect(trierEvenements(liste).map((e) => e.titre)).toEqual(['Éveil', 'Accueil', 'Soirée'])
    expect(liste[0]?.titre).toBe('Soirée')
  })
})

describe('alerte des événements à confirmer', () => {
  it('ne garde que les événements à confirmer, la date la plus ancienne d’abord', () => {
    const liste = [
      evenement('B', '2026-10-09'),
      evenement('Valide', '2026-10-01', false),
      evenement('A', '2026-09-26'),
    ]
    expect(evenementsAConfirmer(liste).map((e) => e.titre)).toEqual(['A', 'B'])
  })

  it('montre 5 lignes, puis tout une fois la liste dépliée', () => {
    const lignes = Array.from({ length: 8 }, (_, i) => i)
    expect(LIGNES_VISIBLES_ALERTE).toBe(5)
    expect(lignesVisibles(lignes, false)).toEqual([0, 1, 2, 3, 4])
    expect(lignesVisibles(lignes, true)).toHaveLength(8)
    expect(aDesLignesCachees(5)).toBe(false)
    expect(aDesLignesCachees(6)).toBe(true)
  })
})
