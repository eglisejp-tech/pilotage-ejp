import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChoixSegmente } from '@/features/saisie/ChoixSegmente'

const CHOIX = [
  { valeur: 'batir', libelle: "Bâtir l'Église" },
  { valeur: 'anti_dispersion', libelle: 'Anti-Dispersion' },
  { valeur: 'autre', libelle: 'Autre session' },
] as const

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Un groupe de `largeur` px dont chaque libellé mesure `libelle` px : ResizeObserver et les
 * mesures du navigateur, que jsdom n'a pas.
 */
function simulerMesures(largeur: number, libelle: number) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(largeur)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: libelle,
  } as DOMRect)
}

function Groupe({ onChange = () => undefined }: { onChange?: (valeur: string) => void }) {
  return (
    <fieldset>
      <legend>Type</legend>
      <ChoixSegmente nom="type" choix={CHOIX} valeur="batir" onChange={onChange} />
    </fieldset>
  )
}

describe('ChoixSegmente (proposition 9, T69)', () => {
  it('de vrais boutons radio, le choix coché, des cases de 48 px', async () => {
    const utilisateur = userEvent.setup()
    const onChange = vi.fn()
    render(<Groupe onChange={onChange} />)
    expect(screen.getByRole('radio', { name: "Bâtir l'Église" })).toBeChecked()
    expect(screen.getByText('Anti-Dispersion').parentElement).toHaveClass('min-h-12')
    await utilisateur.click(screen.getByRole('radio', { name: 'Anti-Dispersion' }))
    expect(onChange).toHaveBeenCalledWith('anti_dispersion')
  })

  it('côte à côte quand chaque libellé tient sur une ligne : aucun mot coupé', () => {
    simulerMesures(600, 120)
    const { container } = render(<Groupe />)
    expect(container.querySelector('[data-disposition]')).toHaveAttribute(
      'data-disposition',
      'ligne',
    )
    expect(screen.getByText('Anti-Dispersion')).toHaveClass('whitespace-nowrap')
  })

  it('les uns sous les autres quand un libellé ne tient plus (panneau, écart 3)', () => {
    simulerMesures(350, 120)
    const { container } = render(<Groupe />)
    expect(container.querySelector('[data-disposition]')).toHaveAttribute(
      'data-disposition',
      'colonne',
    )
  })

  it('en grille, l’erreur du groupe décrit chaque bouton', () => {
    render(
      <>
        <ChoixSegmente
          nom="statut"
          choix={CHOIX}
          valeur=""
          onChange={() => undefined}
          idErreur="statut-erreur"
          disposition="grille"
        />
        <p id="statut-erreur">Choisissez un statut.</p>
      </>,
    )
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
      expect(radio).toHaveAttribute('aria-invalid', 'true')
      expect(radio).toHaveAccessibleDescription('Choisissez un statut.')
    }
  })
})
