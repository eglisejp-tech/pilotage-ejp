import { describe, expect, it } from 'vitest'
import type { EvenementLu } from '@/data/evenements'
import { lignesEvenements } from '@/features/accueil-ministere/lignesEvenements'
import type { EvenementARappeler } from '@/features/accueil-ministere/lignesEvenements'
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

describe('lignesEvenements : sans état final ou sans heure de début (T68)', () => {
  const aRenseigner = (
    surcharge: Partial<EvenementARappeler> & { id: string },
  ): EvenementARappeler => ({
    ...evenement({
      statut: 'valide',
      a_confirmer: false,
      date: '2026-10-03',
      jours: -3,
      ...surcharge,
    }),
    heure_debut: surcharge.heure_debut ?? null,
  })
  // Guillemets français suivis et précédés d'une espace insécable, comme le libellé.
  const nbsp = String.fromCodePoint(0xa0)
  const libelle3Oct = `Événement «${nbsp}Soirée de louange${nbsp}», samedi 3 oct.`

  it('passé sans état final : « À faire : statut à mettre à jour », bouton « Mettre à jour »', () => {
    expect(lignesEvenements([], MOI, noms, [aRenseigner({ id: 'c' })])).toEqual([
      {
        cle: 'evenement:c',
        libelle: libelle3Oct,
        etat: 'a_faire',
        detail: 'À faire : statut à mettre à jour, date passée depuis 3 jours',
        action: { libelle: 'Mettre à jour', vers: '/saisir/evenement/c' },
      },
    ])
  })

  it('Terminé sans heure de début : « À faire : heure de début à indiquer », sa propre clé', () => {
    expect(
      lignesEvenements([], MOI, noms, [aRenseigner({ id: 't', statut: 'termine', jours: 0 })]),
    ).toEqual([
      {
        cle: 'heure-debut:t',
        libelle: libelle3Oct,
        etat: 'a_faire',
        detail: 'À faire : heure de début à indiquer',
        action: { libelle: 'Mettre à jour', vers: '/saisir/evenement/t' },
      },
    ])
  })

  it('rien pour un autre ministère, un Terminé qui a son heure, un événement à venir ou trop ancien', () => {
    expect(
      lignesEvenements([], MOI, noms, [
        aRenseigner({ id: 'autre', ministere_id: AUTRE }),
        aRenseigner({ id: 'tenu', statut: 'termine', heure_debut: 1152 }),
        aRenseigner({ id: 'jour', jours: 0 }),
        aRenseigner({ id: 'vieux', jours: -31 }),
        aRenseigner({ id: 'annule', statut: 'annule' }),
      ]),
    ).toEqual([])
  })

  it('un événement à confirmer garde sa seule ligne ; tout se range par date', () => {
    const aConfirmer = evenement({ id: 'a', date: '2026-10-02', jours: -4 })
    const lignes = lignesEvenements([aConfirmer], MOI, noms, [
      aRenseigner({ id: 't', statut: 'termine', date: '2026-10-05', jours: -1 }),
      { ...aConfirmer, heure_debut: null },
      aRenseigner({ id: 'c', date: '2026-10-01', jours: -5 }),
    ])
    expect(lignes.map((ligne) => ligne.cle)).toEqual([
      'evenement:c',
      'evenement:a',
      'heure-debut:t',
    ])
    expect(lignes[1]?.detail).toBe('À faire : en attente de validation, date passée depuis 4 jours')
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

  it('non déclarée : « À faire, aucune date », bouton « Ajouter »', () => {
    expect(lignesReunion(null)).toEqual([
      {
        cle: 'reunion',
        libelle: 'Prochaine réunion',
        etat: 'a_faire',
        detail: 'À faire, aucune date',
        action: { libelle: 'Ajouter', vers: '/saisir/reunion' },
      },
    ])
  })
})
