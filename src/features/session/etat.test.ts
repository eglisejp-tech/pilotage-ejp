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
    ...partiel,
  }
}

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

  it('aal2 : connecté', () => {
    expect(deduireEtat(elements({ niveau: { actuel: 'aal2', suivant: 'aal2' } }))).toEqual({
      statut: 'connecte',
      compte,
      email: 'communication@exemple.test',
    })
  })
})
