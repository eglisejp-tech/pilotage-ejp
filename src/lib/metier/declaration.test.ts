import { describe, expect, it } from 'vitest'
import {
  declarationNecessaire,
  DUREE_DECLARATION_JOURS,
  MESSAGES_PRENOM,
  motifDeclaration,
  nettoyerPrenom,
  PRENOM_EFFACE,
  schemaPrenom,
} from '@/lib/metier/declaration'

const JOUR = 24 * 60 * 60

function erreurDe(valeur: string): string | undefined {
  const resultat = schemaPrenom.safeParse(valeur)
  return resultat.success ? undefined : resultat.error.issues[0]?.message
}

describe('schemaPrenom (T56, mêmes cas que la base)', () => {
  it.each([
    'Marie',
    'Marie D.',
    'Jean-Pierre',
    "D'Arc",
    'D’Arc',
    'M.',
    'Bérénice',
    'Zoé-Lou',
    'Œdipe',
  ])('accepte « %s »', (prenom) => {
    expect(schemaPrenom.safeParse(prenom).success).toBe(true)
  })

  it('nettoie les espaces comme la base', () => {
    expect(nettoyerPrenom('  Marie   D.  ')).toBe('Marie D.')
    expect(schemaPrenom.parse('  Marie   D.  ')).toBe('Marie D.')
  })

  it('accepte un accent décomposé (copié depuis un téléphone) et le compose, comme la base', () => {
    const decompose = 'Chloé'
    expect(decompose).toHaveLength(6)
    expect(schemaPrenom.parse(decompose)).toBe('Chloé')
  })

  it('refuse un prénom vide ou fait d’espaces', () => {
    expect(erreurDe('')).toBe(MESSAGES_PRENOM.vide)
    expect(erreurDe('    ')).toBe(MESSAGES_PRENOM.vide)
  })

  it('refuse plus de 30 caractères', () => {
    expect(erreurDe('a'.repeat(31))).toBe(MESSAGES_PRENOM.long)
    expect(schemaPrenom.safeParse('a'.repeat(30)).success).toBe(true)
  })

  it.each(['Marie2', 'marie@exemple.test', '[Marie]', '<b>Marie</b>', '06 12 34 56 78', 'Marie_D'])(
    'refuse « %s » : ni chiffre, ni email, ni crochet',
    (prenom) => {
      expect(erreurDe(prenom)).toBe(MESSAGES_PRENOM.lettres)
    },
  )
})

describe('declarationNecessaire (rappel des 7 jours)', () => {
  it('sans déclaration sur cette session : oui', () => {
    expect(declarationNecessaire(null)).toBe(true)
  })

  it('déclaration récente : non', () => {
    expect(declarationNecessaire({ id: 1, prenom: 'Marie', ageSecondes: 60 })).toBe(false)
    expect(
      declarationNecessaire({
        id: 1,
        prenom: 'Marie',
        ageSecondes: DUREE_DECLARATION_JOURS * JOUR - 1,
      }),
    ).toBe(false)
  })

  it('déclaration de 7 jours ou plus : oui', () => {
    expect(DUREE_DECLARATION_JOURS).toBe(7)
    expect(declarationNecessaire({ id: 1, prenom: 'Marie', ageSecondes: 7 * JOUR })).toBe(true)
    expect(declarationNecessaire({ id: 1, prenom: 'Marie', ageSecondes: 30 * JOUR })).toBe(true)
  })

  it('prénom effacé par EJP Tech : oui', () => {
    expect(declarationNecessaire({ id: 1, prenom: PRENOM_EFFACE, ageSecondes: 60 })).toBe(true)
  })
})

describe('motifDeclaration', () => {
  it('« Ce n’est pas moi » : changement ; sinon connexion ou rappel', () => {
    const recente = { id: 1, prenom: 'Marie', ageSecondes: 60 }
    expect(motifDeclaration(true, recente)).toBe('changement')
    expect(motifDeclaration(false, null)).toBe('connexion')
    expect(motifDeclaration(false, { ...recente, ageSecondes: 8 * JOUR })).toBe('rappel')
  })
})
