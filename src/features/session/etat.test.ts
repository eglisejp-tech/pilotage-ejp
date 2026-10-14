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
    declaration: { id: 1, prenom: 'Marie', duJour: true },
    ...partiel,
  }
}

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
    // Compte non partagé : par compte (T53), sans prénom.
    const berger: Compte = { ...compte, type: 'berger', ministereId: null, libelle: 'Berger' }
    expect(
      deduireEtat(
        elements({ ...aal2, compte: berger, conditionsAcceptees: false, declaration: null }),
      ),
    ).toStrictEqual({ statut: 'conditions', compte: berger, email: 'communication@exemple.test' })
    // Compte de ministère : par la personne déclarée sur cet appareil (T61), nommée à l'écran.
    expect(deduireEtat(elements({ ...aal2, conditionsAcceptees: false }))).toStrictEqual({
      statut: 'conditions',
      compte,
      email: 'communication@exemple.test',
      prenom: 'Marie',
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

// Déclaration de la personne (T56) : comptes de ministère seulement, avant les conditions de la
// personne (T61).
describe('deduireEtat : « Qui utilise l’outil ? »', () => {
  it('ministère sans déclaration sur cette session : déclaration', () => {
    expect(deduireEtat(elements({ ...aal2, declaration: null }))).toStrictEqual({
      statut: 'declaration',
      compte,
      email: 'communication@exemple.test',
      declaration: null,
    })
  })

  it('déclaration d’un jour précédent : déclaration (rappel du jour, T63), avec la précédente', () => {
    const hier = { id: 3, prenom: 'Marie', duJour: false }
    expect(deduireEtat(elements({ ...aal2, declaration: hier }))).toMatchObject({
      statut: 'declaration',
      declaration: hier,
    })
    const aujourdhui = { id: 3, prenom: 'Marie', duJour: true }
    expect(deduireEtat(elements({ ...aal2, declaration: aujourdhui })).statut).toBe('connecte')
  })

  it('prénom effacé par EJP Tech : déclaration', () => {
    const effacee = { id: 3, prenom: '[prénom effacé]', duJour: true }
    expect(deduireEtat(elements({ ...aal2, declaration: effacee })).statut).toBe('declaration')
  })

  it('la déclaration passe avant les conditions de la personne (T61) : un seul passage', () => {
    // Rien n'est fait : le prénom d'abord, puis les conditions de cette personne.
    expect(
      deduireEtat(elements({ ...aal2, conditionsAcceptees: false, declaration: null })).statut,
    ).toBe('declaration')
    // Rappel du jour et nouvelle version (T63) : le prénom d'abord, puis les conditions.
    const hier = { id: 3, prenom: 'Marie', duJour: false }
    expect(
      deduireEtat(elements({ ...aal2, conditionsAcceptees: false, declaration: hier })).statut,
    ).toBe('declaration')
    // Prénom donné, conditions pas encore acceptées par cette personne : les conditions.
    const recente = { id: 4, prenom: 'Paul', duJour: true }
    expect(
      deduireEtat(elements({ ...aal2, conditionsAcceptees: false, declaration: recente })),
    ).toStrictEqual({
      statut: 'conditions',
      compte,
      email: 'communication@exemple.test',
      prenom: 'Paul',
    })
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
