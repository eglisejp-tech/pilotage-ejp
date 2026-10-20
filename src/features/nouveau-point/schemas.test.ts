import { describe, expect, it } from 'vitest'
import { MESSAGES_POINT } from '@/data/pointsEcriture'
import { schemaFormulairePoint } from '@/features/nouveau-point/schemas'

const MOI = '10000000-0000-4000-8000-000000000001'
const COORDINATION = '10000000-0000-4000-8000-000000000002'
const INTEGRATION = '10000000-0000-4000-8000-000000000005'

const schema = schemaFormulairePoint({ aujourdhui: '2026-10-06', ministereId: MOI })

const VALIDE = {
  titre: 'Salle pour la soirée de louange',
  description: '',
  priorite: 'normale',
  attendu: '',
  echeance: '',
  mentions: [],
}

/** Messages des erreurs, avec le champ qu'elles désignent. */
function erreurs(valeurs: object) {
  const resultat = schema.safeParse({ ...VALIDE, ...valeurs })
  return resultat.error?.issues.map((probleme) => [probleme.path.join('.'), probleme.message])
}

describe('schéma du formulaire « Nouveau point d’attention »', () => {
  it('seul le titre est obligatoire : le reste vide devient null ou une liste vide', () => {
    expect(schema.parse(VALIDE)).toEqual({
      titre: 'Salle pour la soirée de louange',
      description: null,
      priorite: 'normale',
      attendu: null,
      echeance: null,
      mentions: [],
    })
  })

  it('blancs de bord retirés, doublons de mentions retirés', () => {
    expect(
      schema.parse({
        titre: '  Salle  ',
        description: '  La salle n’est pas confirmée.  ',
        priorite: 'urgente',
        attendu: ' Confirmer la salle ',
        echeance: '2026-10-10',
        mentions: [COORDINATION, INTEGRATION, COORDINATION],
      }),
    ).toEqual({
      titre: 'Salle',
      description: 'La salle n’est pas confirmée.',
      priorite: 'urgente',
      attendu: 'Confirmer la salle',
      echeance: '2026-10-10',
      mentions: [COORDINATION, INTEGRATION],
    })
  })

  it('titre vide ou fait d’espaces, puis de 81 caractères : deux messages distincts (m137)', () => {
    for (const titre of ['', '   ']) {
      expect(erreurs({ titre })).toEqual([['titre', 'Donnez un titre au point.']])
    }
    expect(erreurs({ titre: 'a'.repeat(81) })).toEqual([
      ['titre', 'Raccourcissez le titre : 80 caractères au plus.'],
    ])
    expect(schema.safeParse({ ...VALIDE, titre: 'a'.repeat(80) }).success).toBe(true)
  })

  it('« Ce qui se passe » : 280 caractères au plus, comptés comme la base (un émoji vaut un)', () => {
    expect(schema.safeParse({ ...VALIDE, description: 'a'.repeat(280) }).success).toBe(true)
    expect(schema.safeParse({ ...VALIDE, description: '😀'.repeat(280) }).success).toBe(true)
    expect(erreurs({ description: 'a'.repeat(281) })).toEqual([
      ['description', 'Raccourcissez ce texte : 280 caractères au plus.'],
    ])
  })

  it('« Ce qui est attendu » : 80 caractères au plus', () => {
    expect(schema.safeParse({ ...VALIDE, attendu: 'a'.repeat(80) }).success).toBe(true)
    expect(erreurs({ attendu: 'a'.repeat(81) })).toEqual([
      ['attendu', 'Raccourcissez ce texte : 80 caractères au plus.'],
    ])
  })

  it('priorité : une des trois, sinon « Choisissez une priorité. »', () => {
    for (const priorite of ['normale', 'haute', 'urgente']) {
      expect(schema.safeParse({ ...VALIDE, priorite }).success).toBe(true)
    }
    expect(erreurs({ priorite: '' })).toEqual([['priorite', MESSAGES_POINT.controle.prioriteVide]])
    expect(erreurs({ priorite: 'critique' })).toEqual([
      ['priorite', MESSAGES_POINT.controle.prioriteVide],
    ])
  })

  it('échéance : aujourd’hui et plus tard permis, la veille refusée avant l’envoi', () => {
    expect(schema.parse({ ...VALIDE, echeance: '2026-10-06' }).echeance).toBe('2026-10-06')
    expect(schema.parse({ ...VALIDE, echeance: '2027-01-01' }).echeance).toBe('2027-01-01')
    expect(erreurs({ echeance: '2026-10-05' })).toEqual([
      ['echeance', "Cette date est passée. Choisissez aujourd'hui ou une date à venir."],
    ])
  })

  it('échéance qui n’est pas une date : « Choisissez une date, ou laissez le champ vide. »', () => {
    for (const echeance of ['12/10/2026', '2026-02-30', 'demain']) {
      expect(erreurs({ echeance }), echeance).toEqual([
        ['echeance', 'Choisissez une date, ou laissez le champ vide.'],
      ])
    }
  })

  it('le ministère du compte ne se mentionne pas, ni un identifiant qui n’en est pas un', () => {
    expect(erreurs({ mentions: [COORDINATION, MOI] })).toEqual([
      ['mentions', MESSAGES_POINT.controle.mentionRefusee],
    ])
    expect(erreurs({ mentions: ['pas-un-identifiant'] })).toEqual([
      ['mentions.0', MESSAGES_POINT.controle.mentionRefusee],
    ])
  })

  it('plusieurs champs refusés à la fois : un message par champ', () => {
    expect(erreurs({ titre: '', echeance: '2026-10-05' })).toEqual([
      ['titre', MESSAGES_POINT.controle.titreVide],
      ['echeance', MESSAGES_POINT.controle.echeancePassee],
    ])
  })
})
