import { describe, expect, it } from 'vitest'
import {
  champsCarte,
  champsDepartementsVides,
  champsStatistiques,
  champsStatistiquesVides,
  ligneTotalCarte,
  ligneTotalRubrique,
  MESSAGE_REUSSITE_CARTE,
  messageReussiteStatistiques,
  semainesProposees,
  valeursCarte,
  valeursEffacees,
  valeursStatistiques,
} from '@/features/saisie-fij/calculs'
import {
  erreurValeurFij,
  MESSAGES_FIJ,
  schemaCarteFij,
  schemaStatistiquesFij,
} from '@/features/saisie-fij/schemas'
import { CARTE_EXEMPLE, statistiquesExemple } from '@/features/saisie-fij/apercu/exemplesE4'

describe('carte des FIJ', () => {
  it('« Total : 29 FIJ » en direct, carte préremplie de la dernière valeur de chaque département', () => {
    const champs = champsCarte(CARTE_EXEMPLE)
    expect(champs['75']).toBe('4')
    expect(ligneTotalCarte(champs)).toBe('Total : 29 FIJ')
  })

  it('un département vide ne compte pas pour 0 : le total garde sa complétude', () => {
    const champs = { ...champsCarte(CARTE_EXEMPLE), '77': '', '95': '' }
    expect(ligneTotalCarte(champs)).toBe('Total : 24 FIJ, 6 dép. sur 8')
    expect(ligneTotalCarte(champsDepartementsVides())).toBe('Total : aucun département saisi.')
  })

  it('les 8 départements partent en un envoi, et le schéma refuse une carte incomplète', () => {
    const valeurs = valeursCarte(champsCarte(CARTE_EXEMPLE))
    expect(valeurs).toHaveLength(8)
    expect(schemaCarteFij.safeParse(valeurs).success).toBe(true)
    expect(schemaCarteFij.safeParse(valeurs.slice(1)).success).toBe(false)
    const doublon = [...valeurs.slice(1), { departement: '77' as const, valeur: 1 }]
    expect(schemaCarteFij.safeParse(doublon).success).toBe(false)
  })

  it('« Carte des FIJ enregistrée. »', () => {
    expect(MESSAGE_REUSSITE_CARTE).toBe('Carte des FIJ enregistrée.')
  })
})

describe('valeur d’un champ FIJ', () => {
  it('obligatoire sur la carte, facultative pour les chiffres par département', () => {
    expect(erreurValeurFij('', true)).toBe(MESSAGES_FIJ.valeurManquante)
    expect(erreurValeurFij('', false)).toBeNull()
  })

  it('un entier de 0 à 9 999', () => {
    expect(erreurValeurFij('0', true)).toBeNull()
    expect(erreurValeurFij('9999', true)).toBeNull()
    expect(erreurValeurFij('10000', true)).toBe('Entre 0 et 9 999.')
    expect(erreurValeurFij('-1', false)).toBe('Entre 0 et 9 999.')
    expect(erreurValeurFij('1.5', false)).toBe('Entre 0 et 9 999.')
  })
})

describe('chiffres par département', () => {
  it('« Total : 58, 6 dép. sur 8 » d’une rubrique, en direct', () => {
    const champs = {
      ...champsDepartementsVides(),
      '75': '12',
      '78': '5',
      '91': '7',
      '92': '9',
      '93': '13',
      '94': '12',
    }
    expect(ligneTotalRubrique(champs)).toBe('Total : 58, 6 dép. sur 8')
    expect(ligneTotalRubrique(champsDepartementsVides())).toBe('Total : aucun département saisi.')
  })

  it('n’envoie que les champs remplis, 0 compris', () => {
    const champs = champsStatistiquesVides()
    champs.culte_ejp['75'] = '0'
    champs.membres_mardi['95'] = '4'
    expect(valeursStatistiques(champs)).toEqual([
      { rubrique: 'culte_ejp', departement: '75', valeur: 0 },
      { rubrique: 'membres_mardi', departement: '95', valeur: 4 },
    ])
  })

  it('32 valeurs au plus, sans doublon, pour un dimanche', () => {
    const toutes = valeursStatistiques(champsStatistiques(statistiquesExemple(), '2026-09-20'))
    expect(toutes).toHaveLength(32)
    expect(
      schemaStatistiquesFij.safeParse({ dimanche: '2026-09-20', valeurs: toutes }).success,
    ).toBe(true)
    const doublon = [...toutes.slice(1), toutes[1]]
    expect(
      schemaStatistiquesFij.safeParse({ dimanche: '2026-09-20', valeurs: doublon }).error?.issues[0]
        ?.message,
    ).toBe(MESSAGES_FIJ.doublon)
    expect(
      schemaStatistiquesFij.safeParse({ dimanche: '2026-09-20', valeurs: [...toutes, toutes[0]] })
        .success,
    ).toBe(false)
  })

  it('refuse un envoi vide et une date qui n’est pas un dimanche', () => {
    expect(
      schemaStatistiquesFij.safeParse({ dimanche: '2026-09-20', valeurs: [] }).error?.issues[0]
        ?.message,
    ).toBe(MESSAGES_FIJ.aucuneValeur)
    const une = [{ rubrique: 'culte_ejp' as const, departement: '75' as const, valeur: 1 }]
    expect(schemaStatistiquesFij.safeParse({ dimanche: '2026-09-21', valeurs: une }).success).toBe(
      false,
    )
  })

  it('préremplit la dernière saisie de la semaine choisie ; un département absent reste vide', () => {
    const champs = champsStatistiques(statistiquesExemple(), '2026-09-27')
    expect(champs.culte_ejp['77']).toBe('')
    expect(champs.culte_ejp['75']).not.toBe('')
    expect(champsStatistiques(statistiquesExemple('premier-usage'), '2026-09-27')).toEqual(
      champsStatistiquesVides(),
    )
  })

  it('propose la semaine de référence et les trois précédentes, en disant celles déjà saisies', () => {
    const semaines = semainesProposees('2026-09-27', statistiquesExemple())
    expect(semaines.map((semaine) => semaine.dimanche)).toEqual([
      '2026-09-27',
      '2026-09-20',
      '2026-09-13',
      '2026-09-06',
    ])
    // L'état est en tête : un menu natif coupe la fin du texte à 360 px.
    expect(semaines[0]?.libelle).toBe('Déjà saisie, sem. 39, 21 au 27 sept.')
    const vides = semainesProposees('2026-09-27', [])
    expect(vides[0]?.libelle).toBe('Sem. 39, 21 au 27 sept.')
    expect(vides.every((semaine) => !semaine.dejaSaisie)).toBe(true)
  })

  it('repère un champ préempli puis vidé : l’ancienne valeur resterait comptée en silence', () => {
    const statistiques = statistiquesExemple()
    const champs = champsStatistiques(statistiques, '2026-09-27')
    expect(valeursEffacees(champs, statistiques, '2026-09-27')).toEqual([])
    const vide = {
      ...champs,
      culte_ejp: { ...champs.culte_ejp, '75': '' },
    }
    const effacees = valeursEffacees(vide, statistiques, '2026-09-27')
    expect(effacees).toEqual([
      { rubrique: 'culte_ejp', departement: '75', valeur: Number(champs.culte_ejp['75']) },
    ])
    // Un département jamais saisi cette semaine peut rester vide.
    expect(valeursEffacees(champs, statistiques, '2026-09-27').length).toBe(0)
  })

  it('« Chiffres par département de la semaine 39 enregistrés. »', () => {
    expect(messageReussiteStatistiques('2026-09-27')).toBe(
      'Chiffres par département de la semaine 39 enregistrés.',
    )
  })
})
