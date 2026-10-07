import { describe, expect, it } from 'vitest'
import { lignesChiffres } from '@/features/accueil-ministere/lignesChiffres'
import {
  INDICATEURS_DIMANCHE,
  indicateursMoisExemple,
} from '@/features/saisie-chiffres/apercu/exemples'

const semaine = { aujourdhui: '2026-10-06', dimanche: '2026-10-04' }
const indicateurs = [...INDICATEURS_DIMANCHE, ...indicateursMoisExemple(true)]
const service = (periode: string, valeur: number) => ({
  indicateur_id: 'commun-service',
  periode,
  valeur,
  saisi_le: `${periode}T11:00:00Z`,
})
const septembre = (indicateurId: string) => ({
  indicateur_id: indicateurId,
  periode: '2026-09-01',
  valeur: 2,
  saisi_le: '2026-10-02T18:00:00Z',
})

describe('lignesChiffres (« Vos saisies », maquette 07)', () => {
  it('rien de saisi : le dimanche de référence et le mois écoulé « À faire », sans zéro', () => {
    expect(lignesChiffres({ semaine, indicateurs, mesuresDimanche: [], mesuresMois: [] })).toEqual([
      {
        cle: 'dimanche',
        libelle: 'Chiffres du dimanche 4 oct.',
        etat: 'a_faire',
        detail: null,
        action: { libelle: 'Saisir', vers: '/saisir/dimanche' },
      },
      {
        cle: 'mois',
        libelle: 'Chiffres de septembre',
        etat: 'a_faire',
        detail: null,
        action: { libelle: 'Saisir', vers: '/saisir/mois?mois=2026-09' },
      },
    ])
  })

  it('le dimanche saisi : « Fait, 10 au service » et « Corriger » sur ce dimanche', () => {
    const [ligne] = lignesChiffres({
      semaine,
      indicateurs,
      mesuresDimanche: [service('2026-09-27', 9), service('2026-10-04', 10)],
      mesuresMois: [],
    })
    expect(ligne).toEqual({
      cle: 'dimanche',
      libelle: 'Chiffres du dimanche 4 oct.',
      etat: 'fait',
      detail: 'Fait, 10 au service',
      action: { libelle: 'Corriger', vers: '/saisir/dimanche?date=2026-10-04' },
    })
  })

  it('un 0 saisi est une vraie valeur : « Fait, 0 au service »', () => {
    const [ligne] = lignesChiffres({
      semaine,
      indicateurs,
      mesuresDimanche: [service('2026-10-04', 0)],
      mesuresMois: [],
    })
    expect(ligne?.detail).toBe('Fait, 0 au service')
  })

  it('le dimanche 4 oct. avant midi : la ligne porte encore le dimanche précédent', () => {
    const [ligne] = lignesChiffres({
      semaine: { aujourdhui: '2026-10-04', dimanche: '2026-09-27' },
      indicateurs,
      mesuresDimanche: [service('2026-09-27', 9)],
      mesuresMois: [],
    })
    expect(ligne).toMatchObject({ libelle: 'Chiffres du dimanche 27 sept.', etat: 'fait' })
  })

  it('le mois écoulé : « À faire » jusqu’à sa dernière valeur, puis Fait', () => {
    const partiel = lignesChiffres({
      semaine,
      indicateurs,
      mesuresDimanche: [],
      mesuresMois: [septembre('mois-passages'), septembre('mois-fonds')],
    })
    expect(partiel[1]).toMatchObject({ etat: 'a_faire', detail: 'À faire, 2 sur 4 saisis' })
    const complet = lignesChiffres({
      semaine,
      indicateurs,
      mesuresDimanche: [],
      mesuresMois: ['mois-passages', 'mois-fonds', 'mois-ateliers', 'mois-delai'].map(septembre),
    })
    expect(complet[1]).toEqual({
      cle: 'mois',
      libelle: 'Chiffres de septembre',
      etat: 'fait',
      detail: 'Fait, 4 chiffres',
      action: { libelle: 'Corriger', vers: '/saisir/mois?mois=2026-09' },
    })
  })

  it('sans indicateur du mois : pas de ligne du mois ; en janvier, « Chiffres de décembre »', () => {
    expect(
      lignesChiffres({
        semaine,
        indicateurs: INDICATEURS_DIMANCHE,
        mesuresDimanche: [],
        mesuresMois: [],
      }),
    ).toHaveLength(1)
    const janvier = lignesChiffres({
      semaine: { aujourdhui: '2027-01-05', dimanche: '2027-01-03' },
      indicateurs,
      mesuresDimanche: [],
      mesuresMois: [],
    })
    expect(janvier[1]).toMatchObject({
      libelle: 'Chiffres de décembre',
      action: { vers: '/saisir/mois?mois=2026-12' },
    })
  })
})
