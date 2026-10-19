import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EcranChargement } from '@/features/session/EcranChargement'
import { EcranErreurSession } from '@/features/session/EcranErreurSession'
import { DELAI_CHARGEMENT_LONG } from '@/lib/requetes'
import { ErreurConfiguration } from '@/lib/supabase'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('EcranErreurSession', () => {
  it('réseau : la connexion a échoué, avec « Réessayer »', () => {
    render(<EcranErreurSession onRetry={vi.fn()} enCours={false} erreur={new TypeError('x')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    // Le bandeau suffit : pas de phrase sous le titre qui le répète (T66, t039).
    expect(screen.queryByText(/informations de connexion/)).not.toBeInTheDocument()
  })

  it('10 s dépassées : la réponse met trop de temps (m252)', () => {
    const delai = new DOMException('Lecture de la session trop longue.', 'TimeoutError')
    render(<EcranErreurSession onRetry={vi.fn()} enCours={false} erreur={delai} />)
    expect(screen.getByRole('alert')).toHaveTextContent('La réponse met trop de temps. Réessayez.')
  })

  it('mauvais déploiement : prévenir EJP Tech, sans « Réessayer » qui ne servirait pas (m253)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const erreur = new ErreurConfiguration(
      'VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquent',
    )
    render(<EcranErreurSession onRetry={vi.fn()} enCours={false} erreur={erreur} />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Pilotage EJP n'est pas disponible pour le moment. Prévenez EJP Tech.",
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('VITE_SUPABASE_URL')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    // La panne vient du déploiement, pas du compte : rien ne parle des informations de connexion.
    expect(screen.queryByText(/informations de connexion/)).not.toBeInTheDocument()
  })
})

describe('EcranChargement', () => {
  it('rien, puis « Chargement », puis « Chargement plus long que d’habitude » après 4 s (m248)', () => {
    vi.useFakeTimers()
    render(<EcranChargement />)
    expect(screen.queryByText('Chargement')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByText('Chargement')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(DELAI_CHARGEMENT_LONG))
    expect(screen.getByRole('status')).toHaveTextContent("Chargement plus long que d'habitude")
  })
})
