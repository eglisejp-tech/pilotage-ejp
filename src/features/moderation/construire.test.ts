import { describe, expect, it } from 'vitest'
import type { LigneTexteARelire } from '@/data/moderation'
import { compterEnAttente, construireTextesARelire, libelleMois } from './construire'
import { resumerIndicateursAValider } from './indicateurs'
import { TEXTES_INDICATEURS_A_VALIDER, TEXTES_MODERATION } from './textes'

const MINISTERES = [
  { id: 'm-social', nom: 'Social' },
  { id: 'm-jeunesse', nom: 'Jeunesse' },
]

function ligne(surcharge: Partial<LigneTexteARelire>): LigneTexteARelire {
  return {
    cible: 'point_attention',
    cible_id: 'c1',
    ministere_id: 'm-social',
    auteur_libelle: 'Ministère Social',
    ecrit_le: '2026-09-29T18:03:00+02:00',
    champs: { titre: 'Un titre' },
    etat: 'a_relire',
    decision_le: null,
    motif: null,
    indicateur_libelle: null,
    mois: null,
    ...surcharge,
  }
}

describe('construireTextesARelire', () => {
  it('l’en-tête dit le type puis le ministère ; le jour et l’heure sont ceux de Paris', () => {
    const [texte] = construireTextesARelire(
      [ligne({ ecrit_le: '2026-09-29T19:40:00Z' })],
      MINISTERES,
    )
    expect(texte?.entete).toBe("Point d'attention, Social")
    // 19 h 40 UTC, heure d'été : 21 h 40 à Paris.
    expect(texte?.quand).toBe('29 sept., 21 h 40')
  })

  it('sans ministère (berger, conseil), l’en-tête garde le libellé du compte', () => {
    const [texte] = construireTextesARelire(
      [
        ligne({
          cible: 'reunion',
          ministere_id: null,
          auteur_libelle: 'Conseil, compte 3',
          champs: { objet: 'Un objet' },
        }),
      ],
      MINISTERES,
    )
    expect(texte?.entete).toBe('Réunion, Conseil, compte 3')
  })

  it('un ministère inconnu de la liste : le libellé du compte', () => {
    const [texte] = construireTextesARelire([ligne({ ministere_id: 'm-autre' })], MINISTERES)
    expect(texte?.entete).toBe("Point d'attention, Ministère Social")
  })

  it('les champs suivent l’ordre du formulaire et passent les champs vides', () => {
    const [texte] = construireTextesARelire(
      [
        ligne({
          champs: { action_attendue: 'Attendu', titre: 'Titre', description: 'Décrit', vide: '  ' },
        }),
      ],
      MINISTERES,
    )
    expect(texte?.champs.map((champ) => [champ.code, champ.libelle])).toEqual([
      ['titre', 'Titre'],
      ['description', 'Ce qui se passe'],
      ['action_attendue', 'Ce qui est attendu'],
    ])
  })

  it('un champ masqué est repéré et n’est plus à masquer', () => {
    const [texte] = construireTextesARelire(
      [
        ligne({
          etat: 'masque',
          decision_le: '2026-09-30T09:00:00+02:00',
          motif: 'nom_personne',
          champs: { titre: '[texte masqué par EJP Tech]', description: 'Reste à lire' },
        }),
      ],
      MINISTERES,
    )
    expect(texte?.champs.map((champ) => champ.masque)).toEqual([true, false])
    expect(texte?.masquables.map((champ) => champ.code)).toEqual(['description'])
    expect(texte?.decision).toBe("Masqué le 30 sept. : nom d'une personne")
  })

  it('la décision d’un texte relu dit « rien à signaler »', () => {
    const [texte] = construireTextesARelire(
      [ligne({ etat: 'relu', decision_le: '2026-09-29T08:50:00+02:00' })],
      MINISTERES,
    )
    expect(texte?.decision).toBe('Relu le 29 sept. : rien à signaler')
  })

  it('une précision dit l’indicateur et le mois, jamais une valeur', () => {
    const [texte] = construireTextesARelire(
      [
        ligne({
          cible: 'precision_sensible',
          champs: { texte: 'Plus de demandes ce mois-ci.' },
          indicateur_libelle: 'Personnes accompagnées',
          mois: '2026-09-01',
        }),
      ],
      MINISTERES,
    )
    expect(texte?.entete).toBe("Précision d'un chiffre, Social")
    expect(texte?.indicateur).toBe('Personnes accompagnées, septembre 2026')
    expect(texte?.champs.map((champ) => champ.libelle)).toEqual(['Précision'])
  })

  it('à relire d’abord, puis les décisions, chaque groupe du plus récent au plus ancien', () => {
    const textes = construireTextesARelire(
      [
        ligne({ cible_id: 'relu', etat: 'relu', ecrit_le: '2026-10-01T10:00:00+02:00' }),
        ligne({ cible_id: 'ancien', ecrit_le: '2026-09-28T10:00:00+02:00' }),
        ligne({ cible_id: 'masque', etat: 'masque', ecrit_le: '2026-10-02T10:00:00+02:00' }),
        ligne({ cible_id: 'recent', ecrit_le: '2026-09-30T10:00:00+02:00' }),
      ],
      MINISTERES,
    )
    expect(textes.map((texte) => texte.cibleId)).toEqual(['recent', 'ancien', 'masque', 'relu'])
    expect(compterEnAttente(textes)).toBe(2)
  })

  it('une file vide ne donne aucune ligne', () => {
    expect(construireTextesARelire([], MINISTERES)).toEqual([])
    expect(compterEnAttente([])).toBe(0)
  })
})

describe('libelleMois', () => {
  it('« septembre 2026 » d’après le premier jour du mois', () => {
    expect(libelleMois('2026-09-01')).toBe('septembre 2026')
    expect(libelleMois('2027-01-01')).toBe('janvier 2027')
    expect(libelleMois('pas une date')).toBe('')
  })
})

describe('textes de l’écran', () => {
  it('« N textes en attente » s’accorde', () => {
    expect(TEXTES_MODERATION.enAttente(0)).toBe('Aucun texte en attente')
    expect(TEXTES_MODERATION.enAttente(1)).toBe('1 texte en attente')
    expect(TEXTES_MODERATION.enAttente(2)).toBe('2 textes en attente')
  })

  it('« N indicateurs attendent votre validation » dit le plus ancien', () => {
    const { phrase } = TEXTES_INDICATEURS_A_VALIDER
    expect(phrase(2, 4)).toBe(
      '2 indicateurs attendent votre validation, le plus ancien depuis 4 jours.',
    )
    expect(phrase(1, 1)).toBe('1 indicateur attend votre validation depuis 1 jour.')
    expect(phrase(3, 0)).toBe('3 indicateurs attendent votre validation.')
  })
})

describe('resumerIndicateursAValider', () => {
  it('compte chaque indicateur une fois et prend la plus longue attente', () => {
    expect(
      resumerIndicateursAValider([
        { indicateur_id: 'a', attente_jours: 2 },
        { indicateur_id: 'a', attente_jours: 5 },
        { indicateur_id: 'b', attente_jours: 1 },
      ]),
    ).toEqual({ nombre: 2, plusAncienJours: 5 })
  })

  it('aucune demande : rien à dire', () => {
    expect(resumerIndicateursAValider([])).toBeNull()
  })
})
