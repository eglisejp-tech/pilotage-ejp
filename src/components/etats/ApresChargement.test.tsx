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

function Bloc({ enChargement }: { enChargement: boolean }) {
  return (
    <section className="flex flex-col gap-4">
      <h2>Vos points</h2>
      <ApresChargement
        enChargement={enChargement}
        indicateur={<ChargementEnLigne texte="Chargement de vos points" />}
      >
        {enChargement ? null : <p>Aucun point ouvert pour votre ministère.</p>}
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

  it('données déjà là : le contenu tel quel, sans enveloppe ni attente', () => {
    render(<Bloc enChargement={false} />)
    const contenu = screen.getByText('Aucun point ouvert pour votre ministère.')
    expect(contenu.parentElement?.tagName).toBe('SECTION')
  })
})
