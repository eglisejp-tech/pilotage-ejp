import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMMUNICATION, LECTURES_EXEMPLE_POINTS } from '@/features/points/apercu/exemplesPoints'
import { construirePoints } from '@/features/points/construirePoints'
import type { ProfilPoints } from '@/features/points/textesPoints'
import { usePoints } from '@/features/points/usePoints'
import type { ResultatPoints } from '@/features/points/usePoints'
import { useCompteConnecte } from '@/features/session/contexte'
import type { TypeCompte } from '@/lib/base'
import { PagePoints } from './PagePoints'

vi.mock('@/features/points/usePoints', () => ({ usePoints: vi.fn() }))
vi.mock(import('@/features/session/contexte'), async (importOriginal) => ({
  ...(await importOriginal()),
  useCompteConnecte: vi.fn(),
}))
vi.mock('@/features/points-actions/ActionsPoint', () => ({ ActionsPoint: () => null }))
const hook = vi.mocked(usePoints)
const compteConnecte = vi.mocked(useCompteConnecte)
const reessayer = vi.fn()

function connecter(type: TypeCompte) {
  compteConnecte.mockReturnValue({
    id: 'u1',
    type,
    ministereId: type === 'ministere' ? COMMUNICATION : null,
    libelle: 'Compte',
    actif: true,
  })
}

const pret = (profil: ProfilPoints): ResultatPoints => ({
  etat: 'pret',
  donnees: construirePoints(LECTURES_EXEMPLE_POINTS, profil, null),
})

function afficher(titre: string, adresse = '/points') {
  return render(
    <MemoryRouter initialEntries={[adresse]}>
      <PagePoints titre={titre} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  hook.mockReturnValue({ etat: 'chargement' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  document.title = ''
})

describe('PagePoints', () => {
  it('l’administration de l’église reçoit la page non disponible, sans aucune lecture', () => {
    connecter('admin_eglise')
    afficher("Points d'attention")
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeVisible()
    expect(hook).not.toHaveBeenCalled()
  })

  it('titre de l’onglet : « Points d’attention, Pilotage EJP » ; « Mes points » pour le ministère', () => {
    connecter('berger')
    const { unmount } = afficher("Points d'attention")
    expect(document.title).toBe("Points d'attention, Pilotage EJP")
    unmount()
    connecter('ministere')
    afficher('Mes points')
    expect(document.title).toBe('Mes points, Pilotage EJP')
  })

  it('le profil et le ministère demandé dans l’adresse vont à la lecture', () => {
    connecter('conseil')
    afficher("Points d'attention", '/points?ministere=min-social&vue=traites')
    expect(hook).toHaveBeenCalledWith('conseil', 'min-social')
  })

  it('chargement : le titre tout de suite, « Chargement » après 300 ms, avec aria-busy', () => {
    vi.useFakeTimers()
    connecter('berger')
    const { container } = afficher("Points d'attention")
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
    expect(screen.queryByText('Chargement')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(299))
    expect(screen.queryByText('Chargement')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText('Chargement')).toHaveClass('text-encre-3')
  })

  it('erreur : le bandeau « La connexion a échoué. Réessayez. » et « Réessayer »', async () => {
    connecter('berger')
    hook.mockReturnValue({ etat: 'erreur', reessayer })
    afficher("Points d'attention")
    // Le titre reste visible au-dessus du bandeau : la page garde son h1.
    const titre = screen.getByRole('heading', { level: 1, name: "Points d'attention" })
    expect(titre).not.toHaveClass('sr-only')
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledOnce()
  })

  it('prêt : le berger voit l’écran 05', () => {
    connecter('berger')
    hook.mockReturnValue(pret('berger'))
    afficher("Points d'attention")
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
  })

  it('prêt : EJP Tech lit sans aucun bouton d’action', () => {
    connecter('admin_plateforme')
    hook.mockReturnValue(pret('admin_plateforme'))
    afficher("Points d'attention")
    expect(screen.queryByRole('button', { name: /Marquer traité|Changer le statut/ })).toBeNull()
  })
})
