import { describe, expect, it } from 'vitest'
import {
  schemaCibleCompte,
  schemaCreerCompte,
} from '../../../supabase/functions/_shared/schemas.ts'
import {
  demandeDeCreation,
  schemaAdresse,
  schemaNouveauMinistere,
} from '@/features/comptes/schemas'

const FIJ = '10000000-0000-4000-8000-000000000006'

function messages(resultat: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultat.success ? [] : (resultat.error?.issues.map((issue) => issue.message) ?? [])
}

describe('panneau « Ajouter un ministère » (schéma de creer-compte)', () => {
  it('accepte un nom, sans description, et met l’adresse en minuscules', () => {
    expect(
      schemaNouveauMinistere.parse({
        nom: ' Tech ',
        description: '',
        email: ' Tech@Exemple.test ',
      }),
    ).toEqual({ nom: 'Tech', description: '', email: 'tech@exemple.test' })
  })

  it('refuse un nom vide ou de plus de 50 caractères, une description de plus de 280', () => {
    expect(
      messages(
        schemaNouveauMinistere.safeParse({ nom: '  ', description: '', email: 'a@exemple.test' }),
      ),
    ).toEqual(['Donnez un nom au ministère.'])
    expect(
      messages(
        schemaNouveauMinistere.safeParse({
          nom: 'x'.repeat(51),
          description: '',
          email: 'a@exemple.test',
        }),
      ),
    ).toEqual(['Le nom du ministère tient en 50 caractères au plus.'])
    expect(
      messages(
        schemaNouveauMinistere.safeParse({
          nom: 'Tech',
          description: 'x'.repeat(281),
          email: 'a@exemple.test',
        }),
      ),
    ).toEqual(['La description tient en 280 caractères au plus.'])
  })

  it('refuse une adresse vide ou fausse', () => {
    expect(messages(schemaAdresse.safeParse({ email: '' }))).toEqual([
      'Saisissez une adresse email valide.',
    ])
    expect(messages(schemaAdresse.safeParse({ email: 'pas une adresse' }))).toEqual([
      'Saisissez une adresse email valide.',
    ])
  })

  it('T48 : l’alias « +ministere » de l’adresse d’EJP Tech est une adresse distincte acceptée', () => {
    expect(schemaAdresse.parse({ email: 'EJPTech1+ministere@exemple.test' })).toEqual({
      email: 'ejptech1+ministere@exemple.test',
    })
  })
})

describe('demande envoyée à creer-compte', () => {
  it('nouveau ministère : description vide retirée, description gardée sinon', () => {
    expect(
      demandeDeCreation({
        type: 'ministere',
        nom: 'Tech',
        description: ' ',
        email: 't@exemple.test',
      }),
    ).toEqual({ type: 'ministere', email: 't@exemple.test', ministere: { nom: 'Tech' } })
    expect(
      demandeDeCreation({
        type: 'ministere',
        nom: 'Tech',
        description: 'Le ministère technique.',
        email: 't@exemple.test',
      }),
    ).toEqual({
      type: 'ministere',
      email: 't@exemple.test',
      ministere: { nom: 'Tech', description: 'Le ministère technique.' },
    })
  })

  it('ministère existant : par son identifiant, jamais par son nom', () => {
    const demande = demandeDeCreation({
      type: 'ministere_existant',
      ministereId: FIJ,
      nom: 'FIJ',
      email: 'fij@exemple.test',
    })
    expect(demande).toEqual({
      type: 'ministere',
      email: 'fij@exemple.test',
      ministere: { id: FIJ },
    })
    expect(schemaCreerCompte.safeParse(demande).success).toBe(true)
  })

  it.each(['berger', 'conseil', 'admin_plateforme'] as const)(
    '%s : le type et l’adresse',
    (type) => {
      const demande = demandeDeCreation({ type, email: 'x@exemple.test' })
      expect(demande).toEqual({ type, email: 'x@exemple.test' })
      expect(schemaCreerCompte.safeParse(demande).success).toBe(true)
    },
  )

  it('le schéma partagé refuse admin_eglise, un champ en trop et une cible qui n’est pas un uuid', () => {
    expect(
      schemaCreerCompte.safeParse({ type: 'admin_eglise', email: 'a@exemple.test' }).success,
    ).toBe(false)
    expect(
      schemaCreerCompte.safeParse({ type: 'conseil', email: 'a@exemple.test', libelle: 'X' })
        .success,
    ).toBe(false)
    expect(schemaCibleCompte.safeParse({ user_id: 'abc' }).success).toBe(false)
  })
})
