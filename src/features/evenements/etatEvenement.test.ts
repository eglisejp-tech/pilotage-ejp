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
    ).toEqual({ ...TERMINE, dateFin: null, heureFin: null })
  })

  it('une heure saisie remplace celle du dernier état', () => {
    expect(
      etatApresEnvoi(TERMINE, {
        date: '2026-10-03',
        statut: 'termine',
        heure_prevue: 1170,
        heure_debut: 1175,
      }),
    ).toEqual({ ...TERMINE, heurePrevue: 1170, heureDebut: 1175, dateFin: null, heureFin: null })
  })

  it('hors Terminé, l’heure de début disparaît ; l’heure prévue reste', () => {
    expect(
      etatApresEnvoi(TERMINE, {
        date: '2026-10-03',
        statut: 'annule',
        heure_prevue: null,
        heure_debut: null,
      }),
    ).toEqual({ ...TERMINE, statut: 'annule', heureDebut: null, dateFin: null, heureFin: null })
  })

  it('memeEtat compare la date, le statut et les deux heures', () => {
    expect(memeEtat(TERMINE, { ...TERMINE })).toBe(true)
    expect(memeEtat(TERMINE, { ...TERMINE, date: '2026-10-04' })).toBe(false)
    expect(memeEtat(TERMINE, { ...TERMINE, statut: 'annule' })).toBe(false)
    expect(memeEtat(TERMINE, { ...TERMINE, heurePrevue: 1170 })).toBe(false)
    expect(memeEtat(TERMINE, { ...TERMINE, heureDebut: null })).toBe(false)
  })
})

describe('état après un envoi : plages (T78, lot 2)', () => {
  const CAMP: EtatEnregistre = {
    date: '2026-10-31',
    statut: 'valide',
    heurePrevue: 600,
    heureDebut: null,
    dateFin: '2026-11-02',
    heureFin: 1020,
  }
  const envoi = { statut: 'valide' as const, heure_prevue: null, heure_debut: null }

  it('S7 : un report sans dernier jour garde la durée et les heures', () => {
    expect(etatApresEnvoi(CAMP, { ...envoi, date: '2026-11-07' })).toEqual({
      ...CAMP,
      date: '2026-11-07',
      dateFin: '2026-11-09',
    })
  })

  it('un dernier jour égal au premier ramène à un seul jour ; une heure de fin la remplace', () => {
    expect(
      etatApresEnvoi(CAMP, {
        ...envoi,
        date: '2026-10-31',
        date_fin: '2026-10-31',
        heure_fin: 1080,
      }),
    ).toEqual({ ...CAMP, dateFin: null, heureFin: 1080 })
  })

  it('memeEtat compare aussi le dernier jour et l’heure de fin', () => {
    expect(memeEtat(CAMP, { ...CAMP })).toBe(true)
    expect(memeEtat(CAMP, { ...CAMP, dateFin: '2026-11-03' })).toBe(false)
    expect(memeEtat(CAMP, { ...CAMP, heureFin: null })).toBe(false)
    expect(memeEtat(TERMINE, { ...TERMINE, dateFin: null, heureFin: null })).toBe(true)
  })
})
