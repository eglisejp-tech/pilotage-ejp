import { describe, expect, it } from 'vitest'
import type { Compte } from '@/data/compte'
import { deduireEtat } from '@/features/session/etat'
import type { ElementsSession } from '@/features/session/etat'

const compte: Compte = {
  id: 'u1',
  type: 'ministere',
  ministereId: 'm1',
  libelle: 'Ministère Communication',
  actif: true,
}

function elements(partiel: Partial<ElementsSession> = {}): ElementsSession {
  return {
    utilisateur: { id: 'u1', email: 'communication@exemple.test' },
    niveau: { actuel: 'aal1', suivant: 'aal1' },
    compte,
    facteurVerifie: null,
    conditionsAcceptees: true,
    declaration: { id: 1, prenom: 'Marie', ageSecondes: 60 },
    ...partiel,
  }
}

const JOUR = 24 * 60 * 60
const aal2 = { niveau: { actuel: 'aal2', suivant: 'aal2' } }

// Tableau « Routage selon le niveau » (BRIEF section 8, règle 7), ligne par ligne.
describe('deduireEtat', () => {
  it('pas de session : anonyme', () => {
    expect(deduireEtat(elements({ utilisateur: null }))).toEqual({ statut: 'anonyme' })
  })

  it('ligne compte absente ou désactivée : désactivé, avant tout niveau', () => {
    expect(deduireEtat(elements({ compte: null }))).toEqual({ statut: 'desactive' })
    expect(
      deduireEtat(
        elements({
          compte: { ...compte, actif: false },
          niveau: { actuel: 'aal2', suivant: 'aal2' },
        }),
      ),
    ).toEqual({ statut: 'desactive' })
  })

  it('aal1 et aal1 : activation', () => {
    expect(deduireEtat(elements()).statut).toBe('activation')
  })

  it('aal1 puis aal2 : code, sur le premier facteur vérifié', () => {
    expect(
      deduireEtat(elements({ niveau: { actuel: 'aal1', suivant: 'aal2' }, facteurVerifie: 'f1' })),
    ).toEqual({ statut: 'code', compte, email: 'communication@exemple.test', facteurId: 'f1' })
  })

  it("aal2 sans acceptation de la version courante (jamais acceptée, ou ancienne version) : conditions, avant l'application", () => {
    const aal2 = { niveau: { actuel: 'aal2', suivant: 'aal2' } }
    expect(deduireEtat(elements({ ...aal2, conditionsAcceptees: false }))).toEqual({
      statut: 'conditions',
      compte,
      email: 'communication@exemple.test',
    })
  })

  it("l'acceptation ne compte qu'en aal2 : en aal1, le code ou l'activation passent avant", () => {
    expect(
      deduireEtat(
        elements({
          niveau: { actuel: 'aal1', suivant: 'aal2' },
          facteurVerifie: 'f1',
          conditionsAcceptees: false,
        }),
      ).statut,
    ).toBe('code')
    expect(deduireEtat(elements({ conditionsAcceptees: false })).statut).toBe('activation')
  })

  it('aal2 et version courante acceptée : connecté', () => {
    expect(deduireEtat(elements({ niveau: { actuel: 'aal2', suivant: 'aal2' } })).statut).toBe(
      'connecte',
    )
  })

  it('aal2 : connecté, avec le prénom déclaré sur cet appareil pour un ministère', () => {
    expect(deduireEtat(elements({ niveau: { actuel: 'aal2', suivant: 'aal2' } }))).toStrictEqual({
      statut: 'connecte',
      compte,
      email: 'communication@exemple.test',
      prenom: 'Marie',
    })
  })
})

// Déclaration de la personne (T56) : comptes de ministère seulement, après les conditions.
describe('deduireEtat : « Qui utilise l’outil ? »', () => {
  it('ministère sans déclaration sur cette session : déclaration', () => {
    expect(deduireEtat(elements({ ...aal2, declaration: null }))).toStrictEqual({
      statut: 'declaration',
      compte,
      email: 'communication@exemple.test',
      declaration: null,
    })
  })

  it('déclaration de 7 jours ou plus : déclaration (rappel), avec la précédente', () => {
    const ancienne = { id: 3, prenom: 'Marie', ageSecondes: 7 * JOUR }
    expect(deduireEtat(elements({ ...aal2, declaration: ancienne }))).toMatchObject({
      statut: 'declaration',
      declaration: ancienne,
    })
    const recente = { id: 3, prenom: 'Marie', ageSecondes: 7 * JOUR - 1 }
    expect(deduireEtat(elements({ ...aal2, declaration: recente })).statut).toBe('connecte')
  })

  it('prénom effacé par EJP Tech : déclaration', () => {
    const effacee = { id: 3, prenom: '[prénom effacé]', ageSecondes: 60 }
    expect(deduireEtat(elements({ ...aal2, declaration: effacee })).statut).toBe('declaration')
  })

  it('les conditions passent avant la déclaration', () => {
    expect(
      deduireEtat(elements({ ...aal2, conditionsAcceptees: false, declaration: null })).statut,
    ).toBe('conditions')
  })

  it('en aal1, le code ou l’activation passent avant', () => {
    expect(
      deduireEtat(
        elements({
          niveau: { actuel: 'aal1', suivant: 'aal2' },
          facteurVerifie: 'f1',
          declaration: null,
        }),
      ).statut,
    ).toBe('code')
  })

  it.each(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const)(
    '%s : jamais bloqué, et sans prénom',
    (type) => {
      expect(
        deduireEtat(
          elements({ ...aal2, compte: { ...compte, type, ministereId: null }, declaration: null }),
        ),
      ).toStrictEqual({
        statut: 'connecte',
        compte: { ...compte, type, ministereId: null },
        email: 'communication@exemple.test',
      })
    },
  )
})
