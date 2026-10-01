// Tests unitaires (npm test) : schémas partagés et traduction des refus de la base. Les appels
// réels des Edge Functions sont testés par npm run test:fonctions, contre la pile locale.
import { describe, expect, it } from 'vitest'
import { traduireErreurBase } from './base.ts'
import { schemaCibleCompte, schemaCreerCompte } from './schemas.ts'

const id = '7f1c2a54-3b6e-4d1a-9f0e-2c8b5a6d4e31'

describe('schemaCreerCompte', () => {
  it('accepte chaque type permis et nettoie l’adresse', () => {
    const conseil = schemaCreerCompte.parse({ type: 'conseil', email: '  Conseil@Exemple.ORG ' })
    expect(conseil).toEqual({ type: 'conseil', email: 'conseil@exemple.org' })
    expect(schemaCreerCompte.safeParse({ type: 'berger', email: 'b@exemple.org' }).success).toBe(
      true,
    )
    expect(
      schemaCreerCompte.safeParse({ type: 'admin_plateforme', email: 't@exemple.org' }).success,
    ).toBe(true)
    expect(
      schemaCreerCompte.safeParse({ type: 'ministere', email: 'm@exemple.org', ministere: { id } })
        .success,
    ).toBe(true)
    const nouveau = schemaCreerCompte.parse({
      type: 'ministere',
      email: 'm@exemple.org',
      ministere: { nom: '  Accueil ', description: ' Ministère de l’accueil ' },
    })
    expect(nouveau).toEqual({
      type: 'ministere',
      email: 'm@exemple.org',
      ministere: { nom: 'Accueil', description: 'Ministère de l’accueil' },
    })
  })

  it('refuse le type admin_eglise, un type inconnu et un champ en trop', () => {
    expect(
      schemaCreerCompte.safeParse({ type: 'admin_eglise', email: 'a@exemple.org' }).success,
    ).toBe(false)
    expect(schemaCreerCompte.safeParse({ type: 'pasteur', email: 'a@exemple.org' }).success).toBe(
      false,
    )
    expect(
      schemaCreerCompte.safeParse({ type: 'conseil', email: 'a@exemple.org', libelle: 'Jean' })
        .success,
    ).toBe(false)
  })

  it('refuse une adresse invalide ou trop longue', () => {
    expect(schemaCreerCompte.safeParse({ type: 'conseil', email: 'pas-une-adresse' }).success).toBe(
      false,
    )
    expect(
      schemaCreerCompte.safeParse({ type: 'conseil', email: `${'a'.repeat(250)}@exemple.org` })
        .success,
    ).toBe(false)
  })

  it('borne le nom et la description du ministère', () => {
    const avec = (ministere: unknown) =>
      schemaCreerCompte.safeParse({ type: 'ministere', email: 'm@exemple.org', ministere }).success
    expect(avec({ nom: 'n'.repeat(50) })).toBe(true)
    expect(avec({ nom: 'n'.repeat(51) })).toBe(false)
    expect(avec({ nom: '   ' })).toBe(false)
    expect(avec({ nom: 'Accueil', description: 'd'.repeat(281) })).toBe(false)
    expect(avec({ id: 'pas-un-uuid' })).toBe(false)
    expect(avec({ id, nom: 'Accueil' })).toBe(false)
    expect(avec(undefined)).toBe(false)
  })
})

describe('schemaCibleCompte', () => {
  it('demande un identifiant de compte et rien d’autre', () => {
    expect(schemaCibleCompte.safeParse({ user_id: id }).success).toBe(true)
    expect(schemaCibleCompte.safeParse({ user_id: 'x' }).success).toBe(false)
    expect(schemaCibleCompte.safeParse({ user_id: id, motif: 'départ' }).success).toBe(false)
  })
})

describe('traduireErreurBase', () => {
  it('traduit chaque refus connu', () => {
    expect(traduireErreurBase({ code: '42501', message: 'appelant_non_autorise' })).toMatchObject({
      statut: 403,
      code: 'acces_refuse',
    })
    expect(traduireErreurBase({ code: 'P0001', message: 'berger_deja_actif' })).toMatchObject({
      statut: 409,
      code: 'berger_deja_actif',
    })
    expect(traduireErreurBase({ code: 'P0001', message: 'propre_compte' })).toMatchObject({
      statut: 403,
      code: 'propre_compte',
    })
    expect(traduireErreurBase({ code: 'P0001', message: 'compte_inconnu' })).toMatchObject({
      statut: 400,
      code: 'compte_inconnu',
    })
  })

  it('ne laisse passer aucun message inconnu', () => {
    expect(
      traduireErreurBase({ code: 'XX000', message: 'relation "auth.sessions" does not exist' }),
    ).toMatchObject({ statut: 500, code: 'erreur_interne' })
    expect(traduireErreurBase({ code: '23505', message: 'duplicate key value' })).toMatchObject({
      statut: 409,
      code: 'conflit',
    })
    expect(traduireErreurBase({ message: 'constructor' })).toMatchObject({ statut: 500 })
  })
})
