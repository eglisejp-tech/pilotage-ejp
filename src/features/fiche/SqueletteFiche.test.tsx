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
    render(<SqueletteFiche titre="Ma fiche" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ma fiche' })).toBeInTheDocument()
    for (const titre of ['Les chiffres du ministère', "Points d'attention", 'Dernières saisies']) {
      const section = screen.getByRole('region', { name: titre })
      expect(within(section).getByRole('heading', { level: 2, name: titre })).toBeVisible()
      expect(section.querySelector('[aria-busy="true"]')).not.toBeNull()
    }
  })

  it('« Chargement » n’entre dans chaque section qu’après 300 ms', () => {
    render(<SqueletteFiche titre="Fiche du ministère" />)
    expect(screen.queryByText('Chargement')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getAllByText('Chargement')).toHaveLength(3)
  })
})
