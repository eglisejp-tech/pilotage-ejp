import { describe, expect, it } from 'vitest'
import {
  CATEGORIES_EXEMPLE,
  detailsExemple,
  INDICATEURS_DIMANCHE,
  indicateursMoisExemple,
  MESURES_A_CE_JOUR,
  MESURES_MOIS_CORRECTION,
  mesuresDimancheExemple,
  PRECISION_EXEMPLE,
} from '@/features/saisie-chiffres/apercu/exemples'
import { champsDimanche, champsMois } from '@/features/saisie-chiffres/champs'
import {
  placerErreurBase,
  preparerDimanche,
  preparerMois,
  premierChampEnErreur,
} from '@/features/saisie-chiffres/envoi'
import type { SaisieSensible } from '@/features/saisie-chiffres/envoi'
import { valeurDepart } from '@/features/saisie-chiffres/valeurs'
import type { ValeurChamp } from '@/features/saisie-chiffres/valeurs'

function dimanche(correction = false) {
  const { communs, propres } = champsDimanche({
    dimanche: '2026-09-27',
    matin: false,
    indicateurs: INDICATEURS_DIMANCHE,
    mesuresDimanche: mesuresDimancheExemple(correction),
    mesuresACeJour: MESURES_A_CE_JOUR,
  })
  const champs = [...communs, ...propres]
  const valeurs: Record<string, ValeurChamp> = Object.fromEntries(
    champs.map((champ) => [champ.id, valeurDepart(champ)]),
  )
  return { champs, valeurs }
}

describe('envoi du dimanche', () => {
  it('tout champ rempli part en un envoi ; actifs et en FIJ repartent inchangés', () => {
    const { champs, valeurs } = dimanche()
    const envoi = preparerDimanche(champs, { ...valeurs, 'commun-service': '10' })
    expect(envoi.erreurs).toEqual({})
    expect(envoi.lignes).toEqual([
      { indicateurId: 'commun-service', valeur: 10 },
      { indicateurId: 'commun-actifs', valeur: 14 },
      { indicateurId: 'commun-en-fij', valeur: 11 },
      { indicateurId: 'propre-abonnes', valeur: 1250 },
    ])
  })

  it('les STARs au service sont obligatoires, 0 compris', () => {
    const { champs, valeurs } = dimanche()
    expect(preparerDimanche(champs, valeurs).erreurs['commun-service']).toEqual({
      valeur: 'Saisissez un nombre.',
    })
    expect(preparerDimanche(champs, { ...valeurs, 'commun-service': '0' }).lignes[0]).toEqual({
      indicateurId: 'commun-service',
      valeur: 0,
    })
  })

  it('les STARs en FIJ ne dépassent pas les actifs (règle de la base, avant l’envoi)', () => {
    const { champs, valeurs } = dimanche()
    const envoi = preparerDimanche(champs, {
      ...valeurs,
      'commun-service': '10',
      'commun-en-fij': '15',
    })
    expect(envoi.erreurs['commun-en-fij']).toEqual({
      valeur: 'Les STARs en FIJ ne peuvent pas dépasser les STARs actifs.',
    })
    expect(premierChampEnErreur(champs, envoi.erreurs)).toBe('chiffre-commun-en-fij')
  })

  it('une heure part en minutes ; une valeur déjà saisie puis vidée bloque l’envoi', () => {
    const { champs, valeurs } = dimanche(true)
    const avecHeure = preparerDimanche(champs, {
      ...valeurs,
      'propre-heure-fin': { heures: '12', minutes: '30' },
    })
    expect(avecHeure.lignes).toContainEqual({ indicateurId: 'propre-heure-fin', valeur: 750 })
    const vide = preparerDimanche(champs, { ...valeurs, 'propre-repetitions': '' })
    expect(vide.erreurs['propre-repetitions']).toEqual({
      valeur: 'La valeur enregistrée (3) reste comptée. Saisissez 0 ou la bonne valeur.',
    })
  })
})

function mois(correction: boolean) {
  const champs = champsMois({
    mois: '2026-09',
    indicateurs: indicateursMoisExemple(true),
    mesuresMois: correction ? MESURES_MOIS_CORRECTION : [],
    categories: CATEGORIES_EXEMPLE,
    details: correction ? detailsExemple(false) : [],
  })
  const valeurs: Record<string, ValeurChamp> = Object.fromEntries(
    champs.map((champ) => [champ.id, valeurDepart(champ)]),
  )
  const sensibles: Record<string, SaisieSensible> = correction
    ? {
        'mois-passages': {
          precision: PRECISION_EXEMPLE,
          repartition: { malaise: '4', blessure: '3', autre: '0' },
        },
      }
    : { 'mois-passages': { precision: '', repartition: {} } }
  return { champs, valeurs, sensibles }
}

describe('envoi du mois', () => {
  it('premier envoi : chaque chiffre rempli, avec précision et répartition du sensible', () => {
    const { champs, valeurs } = mois(false)
    const envoi = preparerMois(
      champs,
      { ...valeurs, 'mois-passages': '7', 'mois-ateliers': '2' },
      {
        'mois-passages': {
          precision: '  Passages plus nombreux en fin de mois.  ',
          repartition: { malaise: '4', blessure: '2' },
        },
      },
    )
    expect(envoi.erreurs).toEqual({})
    expect(envoi.lignes).toEqual([
      {
        indicateur_id: 'mois-passages',
        valeur: 7,
        categories: { malaise: 4, blessure: 2 },
        precision: 'Passages plus nombreux en fin de mois.',
      },
      { indicateur_id: 'mois-ateliers', valeur: 2 },
    ])
  })

  it('rien de rempli : aucune ligne, ce n’est pas « inchangé »', () => {
    const { champs, valeurs, sensibles } = mois(false)
    expect(preparerMois(champs, valeurs, sensibles)).toEqual({
      lignes: [],
      erreurs: {},
      inchange: false,
    })
  })

  it('une correction sans rien toucher : rien ne part (aucun texte de plus à relire)', () => {
    const { champs, valeurs, sensibles } = mois(true)
    expect(preparerMois(champs, valeurs, sensibles)).toEqual({
      lignes: [],
      erreurs: {},
      inchange: true,
    })
  })

  it('corriger le total d’un sensible renvoie la précision et la répartition reprises', () => {
    const { champs, valeurs, sensibles } = mois(true)
    const envoi = preparerMois(champs, { ...valeurs, 'mois-passages': '8' }, sensibles)
    expect(envoi.lignes).toEqual([
      {
        indicateur_id: 'mois-passages',
        valeur: 8,
        categories: { malaise: 4, blessure: 3, autre: 0 },
        precision: PRECISION_EXEMPLE,
      },
    ])
  })

  it('vider la précision renvoie le total sans précision : elle disparaît de l’affichage', () => {
    const { champs, valeurs, sensibles } = mois(true)
    const envoi = preparerMois(champs, valeurs, {
      'mois-passages': { ...sensibles['mois-passages']!, precision: '' },
    })
    expect(envoi.lignes).toEqual([
      {
        indicateur_id: 'mois-passages',
        valeur: 7,
        categories: { malaise: 4, blessure: 3, autre: 0 },
      },
    ])
  })

  it('une somme de catégories trop grande, une précision trop courte : rien ne part', () => {
    const { champs, valeurs } = mois(false)
    const envoi = preparerMois(
      champs,
      { ...valeurs, 'mois-passages': '7', 'mois-fonds': '500' },
      { 'mois-passages': { precision: 'Trop court', repartition: { malaise: '9' } } },
    )
    expect(envoi.erreurs['mois-passages']).toEqual({
      repartition: 'La somme des catégories (9) dépasse le total du mois (7).',
    })
    expect(
      preparerMois(
        champs,
        { ...valeurs, 'mois-passages': '7' },
        {
          'mois-passages': { precision: 'Court', repartition: {} },
        },
      ).erreurs['mois-passages'],
    ).toEqual({ precision: 'Écrivez au moins 10 caractères, ou laissez la précision vide.' })
    expect(premierChampEnErreur(champs, envoi.erreurs)).toBe('repartition-mois-passages')
  })

  it('une précision ou une répartition sans total est refusée', () => {
    const { champs, valeurs } = mois(false)
    const envoi = preparerMois(champs, valeurs, {
      'mois-passages': { precision: 'Une précision sans son total.', repartition: {} },
    })
    expect(envoi.erreurs['mois-passages']).toEqual({
      valeur: 'Saisissez le total du mois pour y joindre une précision ou une répartition.',
    })
  })

  it('un total déjà saisi puis vidé bloque l’envoi et le dit', () => {
    const { champs, valeurs, sensibles } = mois(true)
    const envoi = preparerMois(champs, { ...valeurs, 'mois-fonds': '' }, sensibles)
    expect(envoi.erreurs['mois-fonds']?.valeur).toBe(
      'La valeur enregistrée (1 250 €) reste comptée. Saisissez 0 ou la bonne valeur.',
    )
  })
})

describe('refus de la base', () => {
  const lignes = [
    { indicateur_id: 'a', valeur: 7, precision: 'Un texte refusé par la base.' },
    { indicateur_id: 'b', valeur: 3, categories: { malaise: 2 } },
  ]

  it('un refus sur le texte va sous la seule précision envoyée', () => {
    expect(placerErreurBase("N'écrivez aucun nom ni information personnelle.", lignes)).toEqual({
      indicateurId: 'a',
      partie: 'precision',
    })
    expect(
      placerErreurBase('La somme des catégories (9) dépasse le total du mois (7).', lignes),
    ).toEqual({ indicateurId: 'b', partie: 'repartition' })
  })

  it('sinon, sous le bouton', () => {
    expect(placerErreurBase(null, lignes)).toEqual({ indicateurId: null, partie: 'bouton' })
    expect(
      placerErreurBase("N'écrivez aucun nom ni information personnelle.", [
        ...lignes,
        { indicateur_id: 'c', valeur: 1, precision: 'Une autre précision du mois.' },
      ]),
    ).toEqual({ indicateurId: null, partie: 'bouton' })
  })
})
