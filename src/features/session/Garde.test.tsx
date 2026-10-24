import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { oublierOuverture } from '@/components/etats/ouverture'
import type { EtatSession } from '@/features/session/etat'
import { Garde } from '@/features/session/Garde'

// La garde et ses attentes. La première vérification depuis le chargement de l'application joue
// l'ouverture de l'outil (T67) : tout de suite et en entier (2,5 s), même si la session est lue
// avant. Les fois suivantes, et avec « Réduire les animations », la règle de temps de T65 : rien
// pendant 300 ms, puis la flamme au moins 600 ms. L'écran de la zone, ou l'écran d'erreur,
// seulement ensuite.

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
const dessin = () => document.querySelector('svg[data-ouverture="dessin"]')
const flammeVivante = () => document.querySelector('svg[data-ouverture="vivante"]')

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

describe('Garde, première vérification : l’ouverture de l’outil (T67)', () => {
  it('session lue en 50 ms : l’ouverture tout de suite, 2,5 s en entier, puis l’écran en fondu', () => {
    const { rerender } = render(<Application />)
    // Pas de 300 ms de vide : le monogramme commence à se dessiner dès l'arrivée.
    expect(dessin()).not.toBeNull()
    avancer(50)
    repondre(rerender, 'session')
    // La session est connue, l'ouverture continue jusqu'au bout.
    avancer(2400)
    expect(dessin()).not.toBeNull()
    expect(attente()).not.toBeNull()
    expect(ecranDeLaZone()).toBeNull()
    act(() => vi.advanceTimersByTime(49))
    expect(ecranDeLaZone()).toBeNull()
    // À 2,5 s, la garde et l'ouverture finissent au même instant : la minuterie de la garde part
    // la première. Une minuterie à la fois, comme un navigateur : l'écran remplace le logo
    // complet, sans flamme vivante entre les deux.
    act(() => vi.advanceTimersToNextTimer())
    expect(flammeVivante()).toBeNull()
    expect(dessin()).toBeNull()
    expect(ecranDeLaZone()).not.toBeNull()
    expect(document.querySelector('[data-arrivee="contenu"]')).not.toBeNull()
  })

  it('session lue en 3 s : l’ouverture 2,5 s, puis la flamme vivante, puis l’écran à la réponse', () => {
    const { rerender } = render(<Application />)
    avancer(2450)
    expect(dessin()).not.toBeNull()
    avancer(50)
    expect(dessin()).toBeNull()
    expect(flammeVivante()).not.toBeNull()
    expect(attente()).not.toBeNull()
    avancer(500)
    repondre(rerender, 'session')
    // L'ouverture est finie depuis longtemps : l'écran arrive dès la réponse, en fondu.
    expect(ecranDeLaZone()).not.toBeNull()
    expect(document.querySelector('[data-arrivee="contenu"]')).not.toBeNull()
  })

  it('session en échec à 50 ms : l’écran d’erreur seulement après l’ouverture, à 2,5 s', () => {
    const { rerender } = render(<Application />)
    avancer(50)
    repondre(rerender, 'erreur')
    avancer(2400)
    expect(ecranDErreur()).toBeNull()
    expect(dessin()).not.toBeNull()
    avancer(50)
    expect(ecranDErreur()).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(ecranDeLaZone()).toBeNull()
  })

  it('une seconde garde (autre zone, nouvelle connexion) ne rejoue pas l’ouverture', () => {
    const premiere = render(<Application />)
    avancer(50)
    repondre(premiere.rerender, 'session')
    avancer(2500)
    expect(ecranDeLaZone()).not.toBeNull()
    premiere.unmount()
    session.courant = { data: undefined, isError: false, error: null }
    render(<Application />)
    expect(document.querySelector('svg[data-ouverture]')).toBeNull()
    avancer(300)
    expect(flammeVivante()).not.toBeNull()
    expect(dessin()).toBeNull()
  })
})

describe('Garde, vérifications suivantes et moins d’animations : la règle de T65', () => {
  it('réponse en moins de 300 ms : l’écran tout de suite, rien entre les deux', () => {
    ouvertureDejaJouee()
    const { rerender } = render(<Application />)
    avancer(200)
    expect(attente()).toBeNull()
    expect(document.querySelector('svg[data-ouverture]')).toBeNull()
    repondre(rerender, 'session')
    expect(ecranDeLaZone()).not.toBeNull()
  })

  it('les fois suivantes : rien pendant 300 ms, la flamme vivante, l’écran 600 ms après elle', () => {
    ouvertureDejaJouee()
    const { rerender } = render(<Application />)
    avancer(250)
    expect(document.querySelector('svg[data-ouverture]')).toBeNull()
    avancer(50)
    expect(flammeVivante()).not.toBeNull()
    avancer(100)
    repondre(rerender, 'session')
    avancer(450)
    expect(ecranDeLaZone()).toBeNull()
    avancer(50)
    expect(ecranDeLaZone()).not.toBeNull()
  })

  it('« Réduire les animations », première vérification : rien n’est forcé, 300 ms puis 600 ms', () => {
    moinsDAnimations()
    const { rerender } = render(<Application />)
    expect(document.querySelector('svg[data-ouverture]')).toBeNull()
    avancer(300)
    expect(flammeVivante()).not.toBeNull()
    expect(dessin()).toBeNull()
    avancer(100)
    repondre(rerender, 'session')
    avancer(450)
    expect(ecranDeLaZone()).toBeNull()
    avancer(50)
    expect(ecranDeLaZone()).not.toBeNull()
  })

  it('« Réduire les animations », réponse en moins de 300 ms : l’écran tout de suite', () => {
    moinsDAnimations()
    const { rerender } = render(<Application />)
    avancer(50)
    repondre(rerender, 'session')
    expect(ecranDeLaZone()).not.toBeNull()
    expect(document.querySelector('svg[data-ouverture]')).toBeNull()
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
