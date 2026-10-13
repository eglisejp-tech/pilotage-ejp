import { describe, expect, it } from 'vitest'
import {
  declarationNecessaire,
  MESSAGES_PRENOM,
  motifDeclaration,
  nettoyerPrenom,
  PRENOM_EFFACE,
  prenomPropose,
  schemaPrenom,
} from '@/lib/metier/declaration'

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

// Rappel du jour (T63) : le jour de Paris vient de la base (`du_jour`), jamais du navigateur.
describe('declarationNecessaire (connexion et rappel du jour)', () => {
  it('sans déclaration sur cette session (nouvelle connexion) : oui', () => {
    expect(declarationNecessaire(null)).toBe(true)
  })

  it('déclaration faite aujourd’hui : non', () => {
    expect(declarationNecessaire({ id: 1, prenom: 'Marie', duJour: true })).toBe(false)
  })

  it('déclaration d’un jour précédent, même d’hier soir : oui', () => {
    expect(declarationNecessaire({ id: 1, prenom: 'Marie', duJour: false })).toBe(true)
  })

  it('prénom effacé par EJP Tech : oui, même aujourd’hui', () => {
    expect(declarationNecessaire({ id: 1, prenom: PRENOM_EFFACE, duJour: true })).toBe(true)
  })
})

describe('prenomPropose (T63)', () => {
  it('rappel du jour : le prénom de la dernière déclaration de cette connexion', () => {
    expect(prenomPropose(false, { id: 1, prenom: 'Marie D.', duJour: false })).toBe('Marie D.')
  })

  it('nouvelle connexion : champ vide', () => {
    expect(prenomPropose(false, null)).toBe('')
  })

  it('« Ce n’est pas moi » : champ vide', () => {
    expect(prenomPropose(true, { id: 1, prenom: 'Marie', duJour: true })).toBe('')
  })

  it('prénom effacé : champ vide, jamais le marqueur', () => {
    expect(prenomPropose(false, { id: 1, prenom: PRENOM_EFFACE, duJour: false })).toBe('')
  })
})

describe('motifDeclaration', () => {
  it('« Ce n’est pas moi » : changement ; sinon connexion ou rappel du jour', () => {
    const hier = { id: 1, prenom: 'Marie', duJour: false }
    expect(motifDeclaration(true, hier)).toBe('changement')
    expect(motifDeclaration(false, null)).toBe('connexion')
    expect(motifDeclaration(false, hier)).toBe('rappel')
  })
})
