import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Bouton, classesBouton } from '@/components/ui/Bouton'

describe('Bouton', () => {
  it('par défaut : secondaire, ligne de 44 px, type « button », sans aria-disabled', () => {
    render(<Bouton>Corriger</Bouton>)
    const bouton = screen.getByRole('button', { name: 'Corriger' })
    expect(bouton).toHaveAttribute('type', 'button')
    expect(bouton).not.toHaveAttribute('aria-disabled')
    expect(bouton).toHaveClass('retour-appui', 'border-encre', 'bg-papier', 'min-h-cible')
    expect(bouton).toHaveClass('text-interface', 'font-semibold')
  })

  it('a les hauteurs fermées des maquettes', () => {
    expect(classesBouton({ taille: 'ligne-dense' })).toContain('text-detail')
    expect(classesBouton({ taille: 'accueil' })).toContain('min-h-12')
    expect(classesBouton({ taille: 'ajout' })).toContain('min-h-13')
    expect(classesBouton({ taille: 'principal' })).toContain('min-h-14')
    expect(classesBouton({ taille: 'enregistrer' })).toContain('min-h-14.5')
    expect(classesBouton({ taille: 'enregistrer' })).toContain('text-enregistrer')
    expect(classesBouton({ variante: 'principal' })).toContain('bg-lumiere')
    expect(classesBouton({ variante: 'sombre' })).toContain('retour-clair')
  })

  it('pendant l’envoi : aria-disabled, jamais disabled, le libellé « en cours », le focus reste', async () => {
    const { rerender } = render(
      <Bouton variante="principal" libelleEnCours="Envoi en cours">
        Ajouter au calendrier
      </Bouton>,
    )
    const bouton = screen.getByRole('button', { name: 'Ajouter au calendrier' })
    bouton.focus()
    rerender(
      <Bouton variante="principal" enCours libelleEnCours="Envoi en cours">
        Ajouter au calendrier
      </Bouton>,
    )
    expect(bouton).toHaveAccessibleName('Envoi en cours')
    expect(bouton).toHaveAttribute('aria-disabled', 'true')
    expect(bouton).not.toBeDisabled()
    expect(bouton).toHaveFocus()
    expect(bouton).toHaveClass('aria-disabled:cursor-wait')
    expect(bouton).not.toHaveClass('opacity-40')
  })

  it('indisponible : aria-disabled et estompé ; le clic arrive au code, qui garde son verrou', async () => {
    const clic = vi.fn()
    render(
      <Bouton indisponible onClick={clic}>
        Plus
      </Bouton>,
    )
    const bouton = screen.getByRole('button', { name: 'Plus' })
    expect(bouton).toHaveAttribute('aria-disabled', 'true')
    expect(bouton).toHaveClass('opacity-40')
    await userEvent.click(bouton)
    expect(clic).toHaveBeenCalledTimes(1)
  })
})
