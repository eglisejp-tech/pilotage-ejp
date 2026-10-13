import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PageChoixMotDePasse } from '@/features/connexion/PageChoixMotDePasse'
import { ContexteSession } from '@/features/session/contexte'
import type { EtatSession } from '@/features/session/etat'

vi.mock('@/features/session/actions', () => ({ choisirMotDePasse: vi.fn() }))

const COMPTE = {
  id: 'compte-communication',
  type: 'ministere',
  ministereId: 'ministere-communication',
  libelle: 'Ministère Communication',
  actif: true,
} as const

function afficher(etat: EtatSession) {
  const { container } = render(
    <MemoryRouter>
      <ContexteSession.Provider value={etat}>
        <PageChoixMotDePasse />
      </ContexteSession.Provider>
    </MemoryRouter>,
  )
  return container
}

describe('PageChoixMotDePasse', () => {
  it('compte de ministère avant « Qui utilise l’outil ? » : le libellé et l’email restent (T56)', () => {
    const page = afficher({
      statut: 'declaration',
      compte: COMPTE,
      email: 'communication@exemple.test',
      declaration: null,
    })
    expect(screen.getByText('Ministère Communication')).toBeInTheDocument()
    expect(page.querySelector('input[autocomplete="username"]')).toHaveValue(
      'communication@exemple.test',
    )
  })

  it('sans compte vérifié : le nom de l’église, sans identifiant caché', () => {
    const page = afficher({ statut: 'anonyme' })
    expect(screen.getByText('Église des Jeunes Prodiges')).toBeInTheDocument()
    expect(page.querySelector('input[autocomplete="username"]')).toBeNull()
  })
})
