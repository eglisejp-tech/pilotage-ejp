import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Compte } from '@/data/compte'
import { EmplacementEvenementsAConfirmer } from '@/features/cette-semaine/EmplacementEvenementsAConfirmer'
import { ContexteSession } from '@/features/session/contexte'
import type { EtatSession } from '@/features/session/etat'
import type { TypeCompte } from '@/lib/base'

const lectures = vi.hoisted(() => ({
  evenements: vi.fn(),
  ministeres: vi.fn(),
}))
vi.mock('@/data/evenements', () => ({ lireEvenementsAConfirmer: lectures.evenements }))
vi.mock('@/data/ministeres', () => ({ lireMinisteres: lectures.ministeres }))

const EVENEMENT = {
  id: 'e1',
  ministere_id: 'm-com',
  titre: 'Soirée de louange',
  date: '2026-10-10',
  statut: 'attente_validation',
  jours: 3,
  a_confirmer: true,
  reporte_du: null,
}

beforeEach(() => {
  lectures.evenements.mockReset().mockResolvedValue([EVENEMENT])
  lectures.ministeres
    .mockReset()
    .mockResolvedValue([
      { id: 'm-com', code: 'communication', nom: 'Communication', desactive_le: null },
    ])
})

function session(type: TypeCompte): EtatSession {
  const compte: Compte = {
    id: 'c1',
    type,
    ministereId: type === 'ministere' ? 'm-com' : null,
    libelle: 'Compte',
    actif: true,
  }
  return { statut: 'connecte', compte, email: null }
}

function afficher(etat: EtatSession | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ContexteSession.Provider value={etat}>
          <EmplacementEvenementsAConfirmer />
        </ContexteSession.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EmplacementEvenementsAConfirmer', () => {
  it.each(['berger', 'conseil', 'admin_plateforme'] as const)(
    '%s : le bloc, sans aucun bouton d’action',
    async (type) => {
      afficher(session(type))
      expect(
        await screen.findByRole('heading', { name: 'Événements à confirmer' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/Soirée de louange/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Mettre à jour|Marquer traité/ })).toBeNull()
    },
  )

  it.each(['admin_eglise', 'ministere'] as const)('%s : rien, et aucune requête', async (type) => {
    const { container } = afficher(session(type))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
    expect(lectures.evenements).not.toHaveBeenCalled()
    expect(lectures.ministeres).not.toHaveBeenCalled()
  })

  it('hors de l’application (aucune session) : rien, et aucune requête', async () => {
    const { container } = afficher(null)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
    expect(lectures.evenements).not.toHaveBeenCalled()
  })

  it('aucun événement à confirmer : rien du tout', async () => {
    lectures.evenements.mockResolvedValue([])
    const { container } = afficher(session('berger'))
    await waitFor(() => expect(lectures.evenements).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container).toBeEmptyDOMElement()
  })

  it('lecture en échec : le dit, avec « Réessayer », au lieu de cacher l’alerte', async () => {
    lectures.evenements.mockRejectedValue(new Error('refusé'))
    afficher(session('berger'))
    expect(await screen.findByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
