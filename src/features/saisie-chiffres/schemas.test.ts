import { describe, expect, it } from 'vitest'
import {
  LIGNES_MAX,
  schemaLigneMois,
  schemaSaisieDimanche,
  schemaSaisieMois,
} from '@/features/saisie-chiffres/schemas'
import {
  etatGrille,
  lirePrecision,
  lireRepartition,
  lireValeur,
  memeRepartition,
  repartitionDepart,
  valeurDepart,
} from '@/features/saisie-chiffres/valeurs'

const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

describe('valeur d’un champ, bornes de chaque unité', () => {
  it.each([
    ['nombre', '9999', '10000', 'Entre 0 et 9 999.'],
    ['grand_nombre', '9999999', '10000000', 'Entre 0 et 9 999 999.'],
    ['euros', '9999999', '10000000', 'Entre 0 et 9 999 999.'],
    ['jours', '99999', '100000', 'Entre 0 et 99 999.'],
  ] as const)('%s : %s accepté, %s refusé', (unite, permis, refuse, message) => {
    expect(lireValeur(unite, permis)).toEqual({ etat: 'ok', valeur: Number(permis) })
    expect(lireValeur(unite, '0')).toEqual({ etat: 'ok', valeur: 0 })
    expect(lireValeur(unite, refuse)).toEqual({ etat: 'erreur', message })
  })

  it('un champ vide n’est jamais un 0', () => {
    expect(lireValeur('nombre', '')).toEqual({ etat: 'vide' })
    expect(valeurDepart({ unite: 'nombre', depart: null })).toBe('')
    expect(valeurDepart({ unite: 'nombre', depart: 0 })).toBe('0')
  })

  it('une heure se saisit en heures et minutes, rendue en minutes depuis minuit', () => {
    expect(lireValeur('heure', { heures: '10', minutes: '42' })).toEqual({
      etat: 'ok',
      valeur: 642,
    })
    expect(lireValeur('heure', { heures: '0', minutes: '00' })).toEqual({ etat: 'ok', valeur: 0 })
    expect(lireValeur('heure', { heures: '23', minutes: '59' })).toEqual({
      etat: 'ok',
      valeur: 1439,
    })
    expect(lireValeur('heure', { heures: '', minutes: '' })).toEqual({ etat: 'vide' })
    expect(lireValeur('heure', { heures: '24', minutes: '00' })).toEqual({
      etat: 'erreur',
      message: 'Les heures vont de 0 à 23.',
    })
    expect(lireValeur('heure', { heures: '10', minutes: '60' })).toEqual({
      etat: 'erreur',
      message: 'Les minutes vont de 0 à 59.',
    })
    expect(lireValeur('heure', { heures: '10', minutes: '' })).toEqual({
      etat: 'erreur',
      message: 'Saisissez les minutes.',
    })
    expect(valeurDepart({ unite: 'heure', depart: 485 })).toEqual({ heures: '8', minutes: '05' })
  })
})

describe('précision (P46)', () => {
  it('9 et 281 caractères refusés, 10 et 280 acceptés, après les blancs retirés', () => {
    expect(lirePrecision('a'.repeat(9))).toEqual({
      etat: 'erreur',
      message: 'Écrivez au moins 10 caractères, ou laissez la précision vide.',
    })
    expect(lirePrecision(`  ${'a'.repeat(10)}  `)).toEqual({ etat: 'ok', valeur: 'a'.repeat(10) })
    expect(lirePrecision('a'.repeat(280))).toEqual({ etat: 'ok', valeur: 'a'.repeat(280) })
    expect(lirePrecision('a'.repeat(281))).toEqual({
      etat: 'erreur',
      message: 'La précision fait 280 caractères au plus.',
    })
    expect(lirePrecision('   ')).toEqual({ etat: 'vide' })
  })

  it('compte les caractères comme la base, pas les unités UTF-16', () => {
    expect(lirePrecision('é'.repeat(280)).etat).toBe('ok')
    // Un caractère hors du plan de base (deux unités UTF-16) compte pour un.
    expect(lirePrecision(String.fromCodePoint(0x1d538).repeat(10)).etat).toBe('ok')
  })
})

describe('répartition (P47)', () => {
  const codes = ['malaise', 'blessure', 'autre']

  it('une grille vide n’envoie aucune répartition ; une catégorie remplie suffit', () => {
    expect(lireRepartition(codes, {})).toEqual({ etat: 'vide' })
    expect(lireRepartition(codes, { malaise: '', blessure: '2' })).toEqual({
      etat: 'ok',
      valeur: { blessure: 2 },
    })
    expect(lireRepartition(codes, { malaise: '10000' })).toEqual({
      etat: 'erreur',
      message: 'Entre 0 et 9 999.',
    })
  })

  it('« Non réparti » en direct, et la somme au-dessus du total refusée avec son message', () => {
    const total = { etat: 'ok', valeur: 7 } as const
    expect(etatGrille(total, { etat: 'ok', valeur: { malaise: 4, blessure: 2 } })).toEqual({
      etat: 'reste',
      reste: 1,
    })
    expect(etatGrille(total, { etat: 'ok', valeur: { malaise: 4, blessure: 3 } })).toEqual({
      etat: 'reste',
      reste: 0,
    })
    expect(etatGrille(total, { etat: 'ok', valeur: { malaise: 9 } })).toEqual({
      etat: 'depasse',
      message: 'La somme des catégories (9) dépasse le total du mois (7).',
    })
    expect(etatGrille({ etat: 'vide' }, { etat: 'ok', valeur: { malaise: 1 } })).toEqual({
      etat: 'sans_total',
    })
  })

  it('reprend une répartition (une catégorie absente vaut 0) et compare deux répartitions', () => {
    expect(repartitionDepart(codes, { malaise: 4, blessure: 3 })).toEqual({
      malaise: '4',
      blessure: '3',
      autre: '0',
    })
    expect(repartitionDepart(codes, null)).toEqual({ malaise: '', blessure: '', autre: '' })
    expect(memeRepartition({ malaise: 4, autre: 0 }, { malaise: 4 })).toBe(true)
    expect(memeRepartition({ malaise: 4 }, null)).toBe(false)
    expect(memeRepartition(null, null)).toBe(true)
  })
})

describe('schémas partagés avec la base', () => {
  const ID = '4c8f3e7a-1b2d-4e5f-8a9b-0c1d2e3f4a5b'

  it('une ligne du mois : somme des catégories au plus égale au total', () => {
    expect(
      schemaLigneMois.safeParse({ indicateur_id: ID, valeur: 7, categories: { malaise: 7 } })
        .success,
    ).toBe(true)
    const trop = schemaLigneMois.safeParse({
      indicateur_id: ID,
      valeur: 7,
      categories: { malaise: 5, blessure: 4 },
    })
    expect(trop.success).toBe(false)
    expect(trop.error?.issues[0]?.message).toBe(
      'La somme des catégories (9) dépasse le total du mois (7).',
    )
    expect(
      schemaLigneMois.safeParse({ indicateur_id: ID, valeur: 7, categories: { Malaise: 1 } })
        .success,
    ).toBe(false)
    expect(
      schemaLigneMois.safeParse({ indicateur_id: ID, valeur: 7, precision: 'trop court' }).success,
    ).toBe(true)
    expect(
      schemaLigneMois.safeParse({ indicateur_id: ID, valeur: 7, precision: 'court' }).success,
    ).toBe(false)
  })

  it('un envoi du mois : 1 à 30 lignes, sans doublon, un mois AAAA-MM', () => {
    const ligne = { indicateur_id: ID, valeur: 3 }
    expect(schemaSaisieMois.safeParse({ mois: '2026-09', lignes: [ligne] }).success).toBe(true)
    expect(
      schemaSaisieMois.safeParse({ mois: '2026-09', lignes: [] }).error?.issues[0]?.message,
    ).toBe('Saisissez au moins un chiffre.')
    expect(schemaSaisieMois.safeParse({ mois: '2026-09', lignes: [ligne, ligne] }).success).toBe(
      false,
    )
    const trop = Array.from({ length: LIGNES_MAX + 1 }, (_, rang) => ({
      indicateur_id: `id-${rang}`,
      valeur: 1,
    }))
    expect(schemaSaisieMois.safeParse({ mois: '2026-09', lignes: trop }).success).toBe(false)
    expect(schemaSaisieMois.safeParse({ mois: '2026-9', lignes: [ligne] }).success).toBe(false)
  })

  it('un envoi du dimanche : un dimanche, sans doublon', () => {
    const lignes = [{ indicateurId: ID, valeur: 10 }]
    expect(
      schemaSaisieDimanche.safeParse({ ministereId: 'm', dimanche: '2026-09-27', lignes }).success,
    ).toBe(true)
    expect(
      schemaSaisieDimanche.safeParse({ ministereId: 'm', dimanche: '2026-09-28', lignes }).success,
    ).toBe(false)
    expect(
      schemaSaisieDimanche.safeParse({
        ministereId: 'm',
        dimanche: '2026-09-27',
        lignes: [...lignes, ...lignes],
      }).success,
    ).toBe(false)
  })

  it('aucun message n’a de tiret cadratin ni demi-cadratin', () => {
    expect(lirePrecision('court')).not.toMatchObject({ message: expect.stringMatching(TIRETS) })
  })
})
