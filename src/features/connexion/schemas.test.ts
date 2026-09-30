import { describe, expect, it } from 'vitest'
import {
  chiffresDuCode,
  schemaCode,
  schemaConnexion,
  schemaMotDePasseOublie,
  schemaNouveauMotDePasse,
} from '@/features/connexion/schemas'

function messages(resultat: { success: boolean; error?: { issues: { message: string }[] } }) {
  return resultat.success ? [] : (resultat.error?.issues.map((issue) => issue.message) ?? [])
}

describe('schémas de connexion', () => {
  it("accepte un email et un mot de passe, et retire les espaces autour de l'email", () => {
    const resultat = schemaConnexion.safeParse({
      email: '  communication@ejp.exemple ',
      motDePasse: 'x',
    })
    expect(resultat.success).toBe(true)
    expect(resultat.data?.email).toBe('communication@ejp.exemple')
  })

  it('refuse un email vide, incomplet, et un mot de passe vide', () => {
    expect(messages(schemaConnexion.safeParse({ email: '', motDePasse: '' }))).toEqual([
      'Saisissez votre adresse email.',
      'Saisissez votre mot de passe.',
    ])
    expect(messages(schemaMotDePasseOublie.safeParse({ email: 'communication@' }))).toEqual([
      'Saisissez une adresse email complète, par exemple nom@exemple.fr.',
    ])
  })

  it('demande 12 caractères au moins et 72 au plus pour un nouveau mot de passe', () => {
    expect(messages(schemaNouveauMotDePasse.safeParse({ motDePasse: 'onze caract' }))).toEqual([
      'Choisissez un mot de passe de 12 caractères au moins.',
    ])
    expect(schemaNouveauMotDePasse.safeParse({ motDePasse: 'douze caract' }).success).toBe(true)
    expect(messages(schemaNouveauMotDePasse.safeParse({ motDePasse: 'a'.repeat(73) }))).toEqual([
      'Choisissez un mot de passe de 72 caractères au plus.',
    ])
  })

  it('demande exactement 6 chiffres pour le code', () => {
    expect(schemaCode.safeParse({ code: '482913' }).success).toBe(true)
    for (const code of ['', '4829', '48291a', '4829134']) {
      expect(messages(schemaCode.safeParse({ code }))).toEqual([
        'Saisissez les 6 chiffres du code.',
      ])
    }
  })

  it("garde les chiffres d'un code collé, 6 au plus", () => {
    expect(chiffresDuCode('482 913')).toBe('482913')
    expect(chiffresDuCode('Code : 482-913')).toBe('482913')
    expect(chiffresDuCode('1234567')).toBe('123456')
  })
})
