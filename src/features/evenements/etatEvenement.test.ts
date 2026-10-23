import { describe, expect, it } from 'vitest'
import { etatApresEnvoi, memeEtat } from '@/features/evenements/etatEvenement'
import type { EtatEnregistre } from '@/features/evenements/etatEvenement'

const TERMINE: EtatEnregistre = {
  date: '2026-10-03',
  statut: 'termine',
  heurePrevue: 1140,
  heureDebut: 1152,
}

describe('état après un envoi (règle de controler_evenement_etat, T68)', () => {
  it('une heure vide reprend celle du dernier état', () => {
    expect(
      etatApresEnvoi(TERMINE, {
        date: '2026-10-03',
        statut: 'termine',
        heure_prevue: null,
        heure_debut: null,
      }),
    ).toEqual(TERMINE)
  })

  it('une heure saisie remplace celle du dernier état', () => {
    expect(
      etatApresEnvoi(TERMINE, {
        date: '2026-10-03',
        statut: 'termine',
        heure_prevue: 1170,
        heure_debut: 1175,
      }),
    ).toEqual({ ...TERMINE, heurePrevue: 1170, heureDebut: 1175 })
  })

  it('hors Terminé, l’heure de début disparaît ; l’heure prévue reste', () => {
    expect(
      etatApresEnvoi(TERMINE, {
        date: '2026-10-03',
        statut: 'annule',
        heure_prevue: null,
        heure_debut: null,
      }),
    ).toEqual({ ...TERMINE, statut: 'annule', heureDebut: null })
  })

  it('memeEtat compare la date, le statut et les deux heures', () => {
    expect(memeEtat(TERMINE, { ...TERMINE })).toBe(true)
    expect(memeEtat(TERMINE, { ...TERMINE, date: '2026-10-04' })).toBe(false)
    expect(memeEtat(TERMINE, { ...TERMINE, statut: 'annule' })).toBe(false)
    expect(memeEtat(TERMINE, { ...TERMINE, heurePrevue: 1170 })).toBe(false)
    expect(memeEtat(TERMINE, { ...TERMINE, heureDebut: null })).toBe(false)
  })
})
