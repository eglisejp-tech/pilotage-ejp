import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { simulerLargeur } from '@/test/largeur'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Panneau({ onFermer = () => undefined }: { onFermer?: () => void }) {
  return (
    <PanneauSaisie
      surtitre="Chiffres du dimanche"
      titre="Dimanche 27 septembre"
      onFermer={onFermer}
    >
      <label htmlFor="service">STARs au service</label>
      <input id="service" />
      <button type="submit">Enregistrer les chiffres</button>
    </PanneauSaisie>
  )
}

describe('PanneauSaisie à partir de 600 px', () => {
  it.each([600, 834, 1440])('à %s px : une fenêtre modale nommée par son titre', (largeur) => {
    simulerLargeur(largeur)
    render(<Panneau />)
    const fenetre = screen.getByRole('dialog', { name: 'Dimanche 27 septembre' })
    expect(fenetre).toHaveAttribute('aria-modal', 'true')
    expect(fenetre).toHaveClass('max-w-[460px]')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dimanche 27 septembre')
    expect(screen.getByText('Chiffres du dimanche')).toBeInTheDocument()
    expect(document.title).toBe('Dimanche 27 septembre, Pilotage EJP')
  })

  it('le focus entre dans le panneau, et Échap, « Retour » et le fond le ferment', async () => {
    simulerLargeur(834)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    const { container } = render(<Panneau onFermer={onFermer} />)
    expect(screen.getByRole('dialog')).toHaveFocus()
    await utilisateur.keyboard('{Escape}')
    expect(onFermer).toHaveBeenCalledTimes(1)
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFermer).toHaveBeenCalledTimes(2)
    await utilisateur.click(container.querySelector('[aria-hidden="true"]') as HTMLElement)
    expect(onFermer).toHaveBeenCalledTimes(3)
  })

  it('garde Tab et Maj+Tab dans le panneau', async () => {
    simulerLargeur(834)
    const utilisateur = userEvent.setup()
    render(
      <>
        <button type="button">Hors du panneau</button>
        <Panneau />
      </>,
    )
    const retour = screen.getByRole('button', { name: 'Retour' })
    const enregistrer = screen.getByRole('button', { name: 'Enregistrer les chiffres' })
    await utilisateur.tab()
    expect(retour).toHaveFocus()
    await utilisateur.tab({ shift: true })
    expect(enregistrer).toHaveFocus()
    await utilisateur.tab()
    expect(retour).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Hors du panneau' })).not.toHaveFocus()
  })

  it('rend le focus à la fermeture, là où il était', () => {
    simulerLargeur(834)
    const { rerender } = render(<button type="button">Saisir</button>)
    screen.getByRole('button', { name: 'Saisir' }).focus()
    rerender(
      <>
        <button type="button">Saisir</button>
        <Panneau />
      </>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()
    rerender(<button type="button">Saisir</button>)
    expect(screen.getByRole('button', { name: 'Saisir' })).toHaveFocus()
  })

  it('Échap ferme d’abord l’aide ouverte, puis le panneau', async () => {
    simulerLargeur(834)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(
      <PanneauSaisie titre="Chiffres du dimanche" onFermer={onFermer}>
        <LibelleAvecAide htmlFor="actifs" libelle="STARs actifs" code="dimanche.actifs" />
        <input id="actifs" />
      </PanneauSaisie>,
    )
    const aide = screen.getByRole('button', { name: 'Aide : STARs actifs' })
    await utilisateur.click(aide)
    expect(aide).toHaveAttribute('aria-expanded', 'true')
    await utilisateur.keyboard('{Escape}')
    expect(aide).toHaveAttribute('aria-expanded', 'false')
    expect(onFermer).not.toHaveBeenCalled()
    await utilisateur.keyboard('{Escape}')
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})

describe('PanneauSaisie sous 600 px', () => {
  it.each([360, 390, 599])('à %s px : une page entière, pas une fenêtre modale', (largeur) => {
    simulerLargeur(largeur)
    render(<Panneau />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('region', { name: 'Dimanche 27 septembre' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dimanche 27 septembre')
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('« Retour » ferme ; Échap ne ferme rien (aucun piège de focus en page entière)', async () => {
    simulerLargeur(390)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(<Panneau onFermer={onFermer} />)
    await utilisateur.keyboard('{Escape}')
    expect(onFermer).not.toHaveBeenCalled()
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})
