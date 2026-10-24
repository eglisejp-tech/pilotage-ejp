import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SansCoupureAuTrait } from '@/components/ui/SansCoupureAuTrait'

describe('SansCoupureAuTrait', () => {
  it('garde un mot composé sur une ligne, le reste du texte passe encore aux espaces', () => {
    render(
      <h2>
        <SansCoupureAuTrait texte="Supprimer Anti-Dispersion du 10 oct. ?" />
      </h2>,
    )
    expect(screen.getByRole('heading')).toHaveAccessibleName(
      'Supprimer Anti-Dispersion du 10 oct. ?',
    )
    expect(screen.getByText('Anti-Dispersion')).toHaveClass('whitespace-nowrap')
    expect(screen.getByRole('heading').querySelectorAll('span')).toHaveLength(1)
  })

  it('sans trait d’union, le texte sort tel quel', () => {
    render(
      <p>
        <SansCoupureAuTrait texte="Bâtir l'Église du 3 oct." />
      </p>,
    )
    expect(screen.getByText("Bâtir l'Église du 3 oct.").querySelector('span')).toBeNull()
  })
})
