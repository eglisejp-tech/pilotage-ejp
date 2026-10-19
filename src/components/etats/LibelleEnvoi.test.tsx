import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'

function Bouton({ enCours }: { enCours: boolean }) {
  return (
    <button type="submit" aria-disabled={enCours || undefined}>
      <LibelleEnvoi enCours={enCours} libelleEnCours="Enregistrement en cours">
        Enregistrer les chiffres
      </LibelleEnvoi>
    </button>
  )
}

describe('LibelleEnvoi (T65, moment 4 : un envoi)', () => {
  it('au repos, le libellé seul ; pendant l’envoi, la petite flamme et « … en cours »', () => {
    const { rerender } = render(<Bouton enCours={false} />)
    const bouton = screen.getByRole('button', { name: 'Enregistrer les chiffres' })
    expect(bouton.querySelector('[data-flamme]')).toBeNull()

    rerender(<Bouton enCours />)
    // Le nom du bouton est le texte : la flamme est un dessin, ignoré des lecteurs d'écran.
    expect(screen.getByRole('button', { name: 'Enregistrement en cours' })).toBe(bouton)
    const flamme = bouton.querySelector('[data-flamme="petite"]')
    expect(flamme).toHaveAttribute('aria-hidden', 'true')
    expect(flamme).toHaveClass('flamme-battement-bouton')

    rerender(<Bouton enCours={false} />)
    expect(screen.getByRole('button', { name: 'Enregistrer les chiffres' })).toBe(bouton)
    expect(bouton.querySelector('[data-flamme]')).toBeNull()
  })

  it('le bouton garde sa largeur pendant l’envoi, puis la reprend librement', () => {
    const largeur = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 212 } as DOMRect)
    try {
      const { rerender } = render(<Bouton enCours={false} />)
      const bouton = screen.getByRole('button')
      expect(bouton.style.minWidth).toBe('')
      rerender(<Bouton enCours />)
      expect(bouton.style.minWidth).toBe('min(212px, 100%)')
      rerender(<Bouton enCours={false} />)
      expect(bouton.style.minWidth).toBe('')
    } finally {
      largeur.mockRestore()
    }
  })
})
