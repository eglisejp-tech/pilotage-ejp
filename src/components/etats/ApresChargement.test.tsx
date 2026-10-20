import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApresChargement } from '@/components/etats/ApresChargement'
import { ChargementEnLigne } from '@/components/etats/ChargementEnLigne'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function Bloc({ enChargement, erreur = false }: { enChargement: boolean; erreur?: boolean }) {
  return (
    <section className="flex flex-col gap-4">
      <h2>Vos points</h2>
      <ApresChargement
        enChargement={enChargement}
        indicateur={<ChargementEnLigne texte="Chargement de vos points" />}
      >
        {enChargement ? null : erreur ? (
          <p role="alert">La connexion a échoué. Réessayez.</p>
        ) : (
          <p>Aucun point ouvert pour votre ministère.</p>
        )}
      </ApresChargement>
    </section>
  )
}

describe('ApresChargement (T65)', () => {
  it('garde l’indicateur 600 ms une fois montré, puis le contenu arrive en fondu, sans boîte', () => {
    const { rerender, container } = render(<Bloc enChargement />)
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de vos points')
    act(() => vi.advanceTimersByTime(100))
    rerender(<Bloc enChargement={false} />)
    expect(screen.queryByText('Aucun point ouvert pour votre ministère.')).toBeNull()
    act(() => vi.advanceTimersByTime(499))
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de vos points')
    act(() => vi.advanceTimersByTime(1))
    const contenu = screen.getByText('Aucun point ouvert pour votre ministère.')
    // L'enveloppe du fondu ne fait pas de boîte : le paragraphe reste dans le flex du bloc.
    const enveloppe = contenu.parentElement
    expect(enveloppe).toHaveClass('arrivee')
    expect(enveloppe?.parentElement).toBe(container.querySelector('section'))
  })

  it('une erreur juste après l’indicateur attend elle aussi ses 600 ms', () => {
    const { rerender } = render(<Bloc enChargement />)
    act(() => vi.advanceTimersByTime(300))
    act(() => vi.advanceTimersByTime(100))
    // La lecture échoue à 400 ms : l'indicateur, montré à 300 ms, tient jusqu'à 900 ms.
    rerender(<Bloc enChargement={false} erreur />)
    expect(screen.queryByRole('alert')).toBeNull()
    act(() => vi.advanceTimersByTime(499))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Chargement de vos points')
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.queryByText('Chargement de vos points')).toBeNull()
  })

  it('une erreur avant 300 ms s’affiche aussitôt, sans indicateur', () => {
    const { rerender } = render(<Bloc enChargement />)
    act(() => vi.advanceTimersByTime(200))
    rerender(<Bloc enChargement={false} erreur />)
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
  })

  it('données déjà là : le contenu tel quel, sans enveloppe ni attente', () => {
    render(<Bloc enChargement={false} />)
    const contenu = screen.getByText('Aucun point ouvert pour votre ministère.')
    expect(contenu.parentElement?.tagName).toBe('SECTION')
  })
})
