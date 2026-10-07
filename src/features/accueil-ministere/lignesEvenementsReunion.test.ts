import { describe, expect, it } from 'vitest'
import type { EvenementLu } from '@/data/evenements'
import { lignesEvenements } from '@/features/accueil-ministere/lignesEvenements'
import { lignesReunion } from '@/features/accueil-ministere/lignesReunion'

const MOI = 'm-com'
const AUTRE = 'm-coo'
const noms = new Map([
  [MOI, 'Communication'],
  [AUTRE, 'Coordination'],
])

function evenement(surcharge: Partial<EvenementLu> & { id: string }): EvenementLu {
  return {
    ministere_id: MOI,
    titre: 'Soirée de louange',
    date: '2026-10-10',
    statut: 'attente_validation',
    jours: 3,
    a_confirmer: true,
    reporte_du: null,
    ...surcharge,
  }
}

describe('lignesEvenements', () => {
  it('événement à confirmer du ministère : À faire, bouton « Mettre à jour »', () => {
    expect(lignesEvenements([evenement({ id: 'e1' })], MOI, noms)).toEqual([
      {
        cle: 'evenement:e1',
        libelle: 'Événement « Soirée de louange », samedi 10 oct.',
        etat: 'a_faire',
        detail: 'À faire : en attente de validation, dans 3 jours',
        action: { libelle: 'Mettre à jour', vers: '/saisir/evenement/e1' },
      },
    ])
  })

  it('date passée : « date passée depuis 2 jours »', () => {
    const [ligne] = lignesEvenements([evenement({ id: 'e1', jours: -2 })], MOI, noms)
    expect(ligne?.detail).toBe('À faire : en attente de validation, date passée depuis 2 jours')
  })

  it('événement qui mentionne le ministère : une ligne sans bouton, qui ne compte pas comme « à faire »', () => {
    const [ligne] = lignesEvenements([evenement({ id: 'e2', ministere_id: AUTRE })], MOI, noms)
    expect(ligne).toMatchObject({
      etat: 'fait',
      detail: 'Mentionné par Coordination : en attente de validation, dans 3 jours',
      action: null,
    })
  })

  it('ne garde que les événements à confirmer, la date la plus ancienne d’abord', () => {
    const lignes = lignesEvenements(
      [
        evenement({ id: 'tard', date: '2026-10-12' }),
        evenement({ id: 'valide', statut: 'valide', a_confirmer: false }),
        evenement({ id: 'tot', date: '2026-10-05', jours: -1 }),
      ],
      MOI,
      noms,
    )
    expect(lignes.map((l) => l.cle)).toEqual(['evenement:tot', 'evenement:tard'])
  })

  it('rien à confirmer : aucune ligne', () => {
    expect(lignesEvenements([], MOI, noms)).toEqual([])
  })
})

describe('lignesReunion', () => {
  it('déclarée : Fait, avec la date et l’heure, bouton « Corriger »', () => {
    expect(lignesReunion({ date: '2026-10-12', heure: '20:00:00' })).toEqual([
      {
        cle: 'reunion',
        libelle: 'Prochaine réunion',
        etat: 'fait',
        detail: 'Fait, lundi 12 oct., 20 h',
        action: { libelle: 'Corriger', vers: '/saisir/reunion' },
      },
    ])
  })

  it('sans heure : la date seule', () => {
    expect(lignesReunion({ date: '2026-10-12', heure: null })[0]?.detail).toBe(
      'Fait, lundi 12 oct.',
    )
  })

  it('non déclarée : À faire, date non confirmée, bouton « Renseigner »', () => {
    expect(lignesReunion(null)).toEqual([
      {
        cle: 'reunion',
        libelle: 'Prochaine réunion',
        etat: 'a_faire',
        detail: 'À faire, date non confirmée',
        action: { libelle: 'Renseigner', vers: '/saisir/reunion' },
      },
    ])
  })
})
