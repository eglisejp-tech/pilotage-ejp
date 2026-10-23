import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SqueletteFiche } from '@/features/fiche/SqueletteFiche'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SqueletteFiche (chargement)', () => {
  it('le titre de l’écran et les trois titres de section sont là tout de suite', () => {
    const { container } = render(<SqueletteFiche titre="Fiche du ministère" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Fiche du ministère' }),
    ).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    for (const titre of ['Les chiffres du ministère', "Points d'attention", 'Dernières saisies']) {
      const section = screen.getByRole('region', { name: titre })
      expect(within(section).getByRole('heading', { level: 2, name: titre })).toBeVisible()
      // Une place réservée, grise après 300 ms seulement (T65).
      expect(section.querySelector('[data-place-reservee="attente"]')).not.toBeNull()
    }
  })

  it('Ma fiche du ministère : le bloc des points s’appelle déjà « Mes points » (T66)', () => {
    render(<SqueletteFiche titre="Ma fiche" profil="ministere" />)
    expect(screen.getByRole('region', { name: 'Mes points' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: "Points d'attention" })).toBeNull()
  })

  it('la flamme et « Chargement de la fiche » n’arrivent qu’après 300 ms, une seule fois (T65)', () => {
    const { container } = render(<SqueletteFiche titre="Fiche du ministère" />)
    expect(screen.queryByText('Chargement de la fiche')).toBeNull()
    expect(container.querySelector('[data-flamme]')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('status')).toHaveTextContent(/^Chargement de la fiche$/)
    expect(container.querySelectorAll('[data-flamme="vivante"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-place-reservee="visible"]')).toHaveLength(3)
  })
})
