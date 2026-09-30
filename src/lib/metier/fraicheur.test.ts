import { describe, expect, it } from 'vitest'
import {
  etatFraicheur,
  fraicheur,
  joursDepuis,
  libelleFraicheur,
  libelleMiseAJour,
  SEUIL_ATTENTION_JOURS,
  SEUIL_BIEN_JOURS,
  trierParFraicheur,
} from './fraicheur'

const AUJOURDHUI = '2026-09-30'

describe('joursDepuis', () => {
  it('rend null sans saisie', () => {
    expect(joursDepuis(null, AUJOURDHUI)).toBeNull()
  })

  it("compte les jours de calendrier à l'heure de Paris", () => {
    expect(joursDepuis('2026-09-30T08:00:00Z', AUJOURDHUI)).toBe(0)
    // 0 h 30 à Paris le 30 septembre : aujourd'hui, même si c'est encore le 29 en UTC.
    expect(joursDepuis('2026-09-29T22:30:00Z', AUJOURDHUI)).toBe(0)
    // 23 h 59 à Paris le 29 septembre : hier.
    expect(joursDepuis('2026-09-29T21:59:00Z', AUJOURDHUI)).toBe(1)
    expect(joursDepuis('2026-08-30T10:00:00Z', AUJOURDHUI)).toBe(31)
  })

  it("compte juste à l'heure d'hiver et au passage de l'année", () => {
    expect(joursDepuis('2026-12-31T23:30:00Z', '2027-01-01')).toBe(0)
    expect(joursDepuis('2026-12-31T22:30:00Z', '2027-01-01')).toBe(1)
    // Samedi 24 octobre, 23 h 30 à Paris, avant le changement d'heure.
    expect(joursDepuis('2026-10-24T21:30:00Z', '2026-11-01')).toBe(8)
  })

  it("compte pour aujourd'hui un instant situé après aujourd'hui", () => {
    expect(joursDepuis('2026-10-02T10:00:00Z', AUJOURDHUI)).toBe(0)
  })
})

describe('etatFraicheur', () => {
  it("reste vert jusqu'à 7 jours", () => {
    expect(SEUIL_BIEN_JOURS).toBe(7)
    expect(etatFraicheur(0)).toBe('bien')
    expect(etatFraicheur(7)).toBe('bien')
  })

  it('passe à orange de 8 à 30 jours', () => {
    expect(SEUIL_ATTENTION_JOURS).toBe(30)
    expect(etatFraicheur(8)).toBe('attention')
    expect(etatFraicheur(30)).toBe('attention')
  })

  it('passe à rouge au-delà de 30 jours et sans saisie', () => {
    expect(etatFraicheur(31)).toBe('alerte')
    expect(etatFraicheur(365)).toBe('alerte')
    expect(etatFraicheur(null)).toBe('alerte')
  })
})

describe('libellés de fraîcheur', () => {
  it('donne toujours un libellé, jamais la couleur seule', () => {
    expect(libelleFraicheur(0)).toBe("Aujourd'hui")
    expect(libelleFraicheur(1)).toBe('Hier')
    expect(libelleFraicheur(2)).toBe('Il y a 2 jours')
    expect(libelleFraicheur(12)).toBe('Il y a 12 jours')
    expect(libelleFraicheur(31)).toBe('Il y a 31 jours')
    expect(libelleFraicheur(null)).toBe('Aucune saisie')
  })

  it('écrit la mise à jour de la fiche : « Mis à jour il y a 3 jours »', () => {
    expect(libelleMiseAJour(3)).toBe('Mis à jour il y a 3 jours')
    expect(libelleMiseAJour(1)).toBe('Mis à jour hier')
    expect(libelleMiseAJour(0)).toBe("Mis à jour aujourd'hui")
    expect(libelleMiseAJour(null)).toBe('Aucune saisie')
  })
})

describe('fraicheur', () => {
  it("rassemble les jours, l'état et le libellé", () => {
    expect(fraicheur('2026-09-27T10:41:00Z', AUJOURDHUI)).toEqual({
      jours: 3,
      etat: 'bien',
      libelle: 'Il y a 3 jours',
    })
    expect(fraicheur('2026-09-20T10:00:00Z', AUJOURDHUI)).toEqual({
      jours: 10,
      etat: 'attention',
      libelle: 'Il y a 10 jours',
    })
    expect(fraicheur(null, AUJOURDHUI)).toEqual({
      jours: null,
      etat: 'alerte',
      libelle: 'Aucune saisie',
    })
  })
})

describe('trierParFraicheur', () => {
  const ministeres = [
    { nom: 'Intégration', derniere_saisie: '2026-09-29T18:00:00Z' },
    { nom: 'Social', derniere_saisie: '2026-08-30T10:00:00Z' },
    { nom: 'Jeunesse', derniere_saisie: '2026-09-27T20:00:00Z' },
    { nom: 'Nouveau', derniere_saisie: null },
    { nom: 'Communication', derniere_saisie: '2026-09-27T08:00:00Z' },
    { nom: 'Coordination', derniere_saisie: '2026-09-20T10:00:00Z' },
    { nom: 'Écoute', derniere_saisie: null },
  ]

  it("met « Aucune saisie » d'abord, puis du moins récent au plus récent, puis par nom", () => {
    expect(trierParFraicheur(ministeres, AUJOURDHUI).map((m) => m.nom)).toEqual([
      'Écoute',
      'Nouveau',
      'Social',
      'Coordination',
      'Communication',
      'Jeunesse',
      'Intégration',
    ])
  })

  it('garde les autres colonnes et ne modifie pas la liste reçue', () => {
    const lignes = [
      { nom: 'B', derniere_saisie: '2026-09-29T10:00:00Z', description: 'b' },
      { nom: 'A', derniere_saisie: '2026-09-01T10:00:00Z', description: 'a' },
    ]
    const tries = trierParFraicheur(lignes, AUJOURDHUI)
    expect(tries[0]).toBe(lignes[1])
    expect(lignes.map((m) => m.nom)).toEqual(['B', 'A'])
  })

  it('rend une liste vide pour une liste vide', () => {
    expect(trierParFraicheur([], AUJOURDHUI)).toEqual([])
  })
})
