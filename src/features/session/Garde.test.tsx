import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { oublierOuverture } from '@/components/etats/ouverture'
import type { EtatSession } from '@/features/session/etat'
import { Garde } from '@/features/session/Garde'

// La garde et la règle de temps de T65 : rien pendant 300 ms, puis l'ouverture de l'outil (1,2 s,
// jouée jusqu'au bout) la première fois, ou la flamme au moins 600 ms les fois suivantes et avec
// « Réduire les animations » ; l'écran de la zone, ou l'écran d'erreur, seulement ensuite.

type Lecture = { data: EtatSession | undefined; isError: boolean; error: unknown }

const session = vi.hoisted(() => ({
  courant: { data: undefined, isError: false, error: null } as Lecture,
}))

vi.mock('@/features/session/useEtatSession', () => ({
  useEtatSession: () => ({
    ...session.courant,
    isFetching: session.courant.data === undefined && !session.courant.isError,
    refetch: () => Promise.resolve(),
  }),
}))

function Application() {
  return (
    <MemoryRouter initialEntries={['/connexion']}>
      <Routes>
        <Route element={<Garde zone="connexion" />}>
          <Route path="/connexion" element={<h1>Écran de connexion</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

/** « Réduire les animations » demandé par l'appareil. */
function moinsDAnimations() {
  vi.stubGlobal('matchMedia', (requete: string) => ({
    matches: requete === '(prefers-reduced-motion: reduce)',
    media: requete,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** Avance l'horloge en laissant React rendre entre deux minuteries, comme un navigateur. */
function avancer(ms: number) {
  for (let reste = ms; reste > 0; reste -= 50) {
    act(() => vi.advanceTimersByTime(Math.min(50, reste)))
  }
}

/** La lecture de la session répond (`anonyme` : la zone de connexion s'affiche) ou échoue. */
function repondre(rerender: (ui: ReactNode) => void, reponse: 'session' | 'erreur') {
  session.courant =
    reponse === 'session'
      ? { data: { statut: 'anonyme' }, isError: false, error: null }
      : { data: undefined, isError: true, error: new TypeError('Failed to fetch') }
  rerender(<Application />)
}

const ecranDeLaZone = () => screen.queryByRole('heading', { name: 'Écran de connexion' })
const ecranDErreur = () => screen.queryByRole('alert')
const attente = () => screen.queryByText('Chargement de Pilotage EJP')

/** Une première vérification a déjà eu lieu depuis le chargement de l'application. */
function ouvertureDejaJouee() {
  const { unmount } = render(<Application />)
  unmount()
}

beforeEach(() => {
  vi.useFakeTimers()
  oublierOuverture()
  session.courant = { data: undefined, isError: false, error: null }
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Garde (T65 : l’attente de la session)', () => {
  it('réponse en moins de 300 ms : l’écran tout de suite, sans ouverture', () => {
    const { rerender } = render(<Application />)
    avancer(200)
    expect(attente()).toBeNull()
    repondre(rerender, 'session')
    expect(ecranDeLaZone()).not.toBeNull()
    expect(document.querySelector('svg[data-ouverture]')).toBeNull()
  })

  it('première ouverture, session lente : l’ouverture joue ses 1,2 s, l’écran vient à 1,5 s', () => {
    const { rerender } = render(<Application />)
    avancer(300)
    expect(attente()).not.toBeNull()
    expect(document.querySelector('svg[data-ouverture="dessin"]')).not.toBeNull()
    avancer(200)
    // La session répond à 500 ms : l'ouverture, commencée à 300 ms, va jusqu'à 1,5 s.
    repondre(rerender, 'session')
    avancer(950)
    expect(ecranDeLaZone()).toBeNull()
    expect(attente()).not.toBeNull()
    avancer(50)
    expect(ecranDeLaZone()).not.toBeNull()
    expect(attente()).toBeNull()
  })

  it('les fois suivantes : la flamme vivante, l’écran 600 ms après son apparition', () => {
    ouvertureDejaJouee()
    const { rerender } = render(<Application />)
    avancer(300)
    expect(document.querySelector('svg[data-ouverture="vivante"]')).not.toBeNull()
    avancer(100)
    repondre(rerender, 'session')
    avancer(450)
    expect(ecranDeLaZone()).toBeNull()
    avancer(50)
    expect(ecranDeLaZone()).not.toBeNull()
  })

  it('« Réduire les animations » : pas d’ouverture, la flamme immobile tient 600 ms (900 ms)', () => {
    moinsDAnimations()
    const { rerender } = render(<Application />)
    avancer(300)
    expect(document.querySelector('svg[data-ouverture="vivante"]')).not.toBeNull()
    expect(document.querySelector('svg[data-ouverture="dessin"]')).toBeNull()
    avancer(100)
    repondre(rerender, 'session')
    avancer(450)
    expect(ecranDeLaZone()).toBeNull()
    avancer(50)
    expect(ecranDeLaZone()).not.toBeNull()
  })

  it('première ouverture, session en échec : l’écran d’erreur seulement après l’ouverture', () => {
    const { rerender } = render(<Application />)
    avancer(400)
    repondre(rerender, 'erreur')
    avancer(1050)
    expect(ecranDErreur()).toBeNull()
    expect(attente()).not.toBeNull()
    avancer(50)
    expect(ecranDErreur()).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(ecranDeLaZone()).toBeNull()
  })

  it('les fois suivantes, session en échec : l’écran d’erreur 600 ms après la flamme', () => {
    ouvertureDejaJouee()
    const { rerender } = render(<Application />)
    avancer(400)
    repondre(rerender, 'erreur')
    avancer(450)
    expect(ecranDErreur()).toBeNull()
    avancer(50)
    expect(ecranDErreur()).toHaveTextContent('La connexion a échoué. Réessayez.')
  })
})
