import { describe, expect, it } from 'vitest'
import {
  adresseSaisieDimanche,
  adresseSaisieMois,
  choisirDimanche,
  choisirMois,
  dimanchesProposes,
  estDimancheMatin,
  moisAProposer,
  moisARattraper,
} from '@/features/saisie-chiffres/choixPeriode'
import { jourDeParis } from '@/lib/metier/dates'
import { dimancheDeReference } from '@/lib/metier/semaine'

// La base fait la bascule (v_semaine : private.aujourdhui() et private.dimanche_reference()) ; ces
// tests rejouent ce qu'elle rend à chaque instant, à l'heure de Paris, puis vérifient le choix.
const semaineA = (instant: string) => ({
  aujourdhui: jourDeParis(instant),
  dimanche: dimancheDeReference(instant),
})

describe('dimanche de la saisie', () => {
  it('bascule le dimanche à 12 h, heure de Paris : avant, le dimanche précédent', () => {
    // Dimanche 4 oct. 2026 : 11 h 59 à Paris (heure d'été, UTC+2), puis 12 h.
    const avant = semaineA('2026-10-04T09:59:00Z')
    const apres = semaineA('2026-10-04T10:00:00Z')
    expect(choisirDimanche(null, avant)).toEqual({
      etat: 'ok',
      dimanche: '2026-09-27',
      matin: false,
    })
    expect(choisirDimanche(null, apres)).toEqual({
      etat: 'ok',
      dimanche: '2026-10-04',
      matin: false,
    })
    expect(estDimancheMatin(avant)).toBe(true)
    expect(estDimancheMatin(apres)).toBe(false)
  })

  it('le dimanche du jour, avant midi : accepté par l’adresse, en mode « matin »', () => {
    const matin = semaineA('2026-10-04T07:00:00Z')
    expect(choisirDimanche('2026-10-04', matin)).toEqual({
      etat: 'ok',
      dimanche: '2026-10-04',
      matin: true,
    })
  })

  it('refuse un jour qui n’est pas un dimanche, un dimanche futur, une date illisible', () => {
    const semaine = { aujourdhui: '2026-09-29', dimanche: '2026-09-27' }
    expect(choisirDimanche('2026-09-28', semaine)).toEqual({ etat: 'refuse' })
    expect(choisirDimanche('2026-10-04', semaine)).toEqual({ etat: 'refuse' })
    expect(choisirDimanche('27/09/2026', semaine)).toEqual({ etat: 'refuse' })
    expect(choisirDimanche('2026-09-13', semaine)).toEqual({
      etat: 'ok',
      dimanche: '2026-09-13',
      matin: false,
    })
  })

  it('propose les 8 derniers dimanches, « (déjà saisi) » s’il y a lieu', () => {
    const semaine = { aujourdhui: '2026-09-29', dimanche: '2026-09-27' }
    const proposes = dimanchesProposes(semaine, new Set(['2026-09-20']), true)
    expect(proposes.map((propose) => propose.libelle)).toEqual([
      'Dimanche 27 sept.',
      'Dimanche 20 sept. (déjà saisi)',
      'Dimanche 13 sept.',
      'Dimanche 6 sept.',
      'Dimanche 30 août',
      'Dimanche 23 août',
      'Dimanche 16 août',
      'Dimanche 9 août',
    ])
  })

  it('le dimanche matin, le dimanche du jour vient en tête pour un indicateur du matin', () => {
    const matin = { aujourdhui: '2026-10-04', dimanche: '2026-09-27' }
    expect(dimanchesProposes(matin, new Set(), true)[0]).toEqual({
      dimanche: '2026-10-04',
      libelle: "Aujourd'hui, dimanche 4 oct.",
      dejaSaisi: false,
      matin: true,
    })
    expect(dimanchesProposes(matin, new Set(), false)).toHaveLength(8)
  })

  it('écrit les adresses de saisie', () => {
    expect(adresseSaisieDimanche()).toBe('/saisir/dimanche')
    expect(adresseSaisieDimanche('2026-09-27')).toBe('/saisir/dimanche?date=2026-09-27')
    expect(adresseSaisieMois('2026-09')).toBe('/saisir/mois?mois=2026-09')
  })
})

describe('mois de la saisie', () => {
  it('bascule le 31 octobre à minuit, heure de Paris (heure d’hiver, UTC+1)', () => {
    const avant = jourDeParis('2026-10-31T22:59:00Z')
    const apres = jourDeParis('2026-10-31T23:00:00Z')
    expect(moisAProposer(avant, new Set()).map((mois) => mois.mois)).toEqual([
      '2026-10',
      '2026-09',
      '2026-08',
    ])
    expect(moisAProposer(apres, new Set()).map((mois) => mois.mois)).toEqual([
      '2026-11',
      '2026-10',
      '2026-09',
    ])
  })

  it('propose le mois en cours et les deux précédents, sensibles compris (P45)', () => {
    const proposes = moisAProposer('2026-10-06', new Set(['2026-09']))
    expect(proposes.map((mois) => mois.libelle)).toEqual([
      'Octobre 2026 (en cours)',
      'Septembre 2026 (déjà saisi)',
      'Août 2026',
    ])
  })

  it('choisit d’abord le dernier mois fini non saisi, sinon le mois en cours', () => {
    expect(choisirMois(null, '2026-10-06', new Set())).toEqual({
      etat: 'ok',
      mois: '2026-09',
      enCours: false,
    })
    expect(choisirMois(null, '2026-10-06', new Set(['2026-09', '2026-08']))).toEqual({
      etat: 'ok',
      mois: '2026-10',
      enCours: true,
    })
  })

  it('accepte le mois en cours de l’adresse, refuse un mois futur ou trop ancien', () => {
    expect(choisirMois('2026-10', '2026-10-06', new Set())).toEqual({
      etat: 'ok',
      mois: '2026-10',
      enCours: true,
    })
    expect(choisirMois('2026-11', '2026-10-06', new Set())).toEqual({
      etat: 'refuse',
      message: "Ce mois n'est pas encore commencé.",
      moisPropose: '2026-09',
    })
    expect(choisirMois('2024-12', '2026-10-06', new Set())).toMatchObject({
      etat: 'refuse',
      message: 'Ce mois est trop ancien pour être saisi.',
    })
    expect(choisirMois('septembre', '2026-10-06', new Set())).toMatchObject({ etat: 'refuse' })
  })

  it('« Choisir un autre mois » remonte jusqu’au 1er janvier de l’année précédente', () => {
    const rattrapage = moisARattraper('2026-10-06', new Set())
    expect(rattrapage[0]?.mois).toBe('2026-10')
    expect(rattrapage.at(-1)?.mois).toBe('2025-01')
    expect(rattrapage).toHaveLength(22)
  })
})
