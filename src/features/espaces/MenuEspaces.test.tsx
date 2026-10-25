import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MenuEspaces } from '@/features/espaces/MenuEspaces'
import type { ProprietesEspaces } from '@/features/espaces/MenuEspaces'

function proprietes(deux = true): ProprietesEspaces {
  return {
    liste: [
      { id: 'principal', libelle: 'EJP Tech, compte 1', actif: true },
      ...(deux ? [{ id: 'tech0001', libelle: 'Ministère Tech', actif: false }] : []),
    ],
    peutAjouter: true,
    surChanger: vi.fn(() => Promise.resolve({})),
    surAjouter: vi.fn(() => ({})),
    surRetirer: vi.fn(() => Promise.resolve({})),
  }
}

describe("MenuEspaces (« Changer d'espace », T73)", () => {
  it('au clavier : Entrée ouvre la liste, Tab va au compte, Entrée y passe', async () => {
    const props = proprietes()
    render(<MenuEspaces {...props} disposition="en-tete" />)
    const bouton = screen.getByRole('button', { name: "Changer d'espace" })
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    await userEvent.tab()
    expect(bouton).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    const liste = screen.getByRole('list', { name: 'Comptes ouverts sur cet appareil' })
    expect(liste).toHaveTextContent('EJP Tech, compte 1 (espace actif)')
    expect(screen.getByText('EJP Tech, compte 1').closest('[aria-current="true"]')).not.toBeNull()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Passer à Ministère Tech' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(props.surChanger).toHaveBeenCalledWith('tech0001')
  })

  it('Échap ferme la liste et rend le focus au bouton', async () => {
    render(<MenuEspaces {...proprietes()} disposition="menu" />)
    const bouton = screen.getByRole('button', { name: "Changer d'espace" })
    await userEvent.click(bouton)
    await userEvent.tab()
    await userEvent.keyboard('{Escape}')
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    expect(bouton).toHaveFocus()
  })

  it('dans l’en-tête, le focus qui sort ou un clic ailleurs ferme la liste', async () => {
    render(
      <>
        <MenuEspaces {...proprietes()} disposition="en-tete" />
        <button type="button">Ailleurs</button>
      </>,
    )
    const bouton = screen.getByRole('button', { name: "Changer d'espace" })
    await userEvent.click(bouton)
    await userEvent.click(screen.getByRole('button', { name: 'Ailleurs' }))
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
  })

  it('un seul compte : « Ajouter un compte », sans « Retirer ce compte »', async () => {
    const props = proprietes(false)
    render(<MenuEspaces {...props} disposition="en-tete" />)
    await userEvent.click(screen.getByRole('button', { name: "Changer d'espace" }))
    expect(screen.queryByRole('button', { name: 'Retirer ce compte' })).not.toBeInTheDocument()
    expect(screen.queryByText(/ferme les/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un compte' }))
    expect(props.surAjouter).toHaveBeenCalled()
  })

  it('deux comptes : « Retirer ce compte » et ce que ferme « Se déconnecter »', async () => {
    const props = proprietes()
    render(<MenuEspaces {...props} disposition="en-tete" />)
    await userEvent.click(screen.getByRole('button', { name: "Changer d'espace" }))
    expect(screen.getByText('« Se déconnecter » ferme les 2 comptes.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Retirer ce compte' }))
    expect(props.surRetirer).toHaveBeenCalled()
  })

  it('un passage refusé se dit, et la liste reste utilisable', async () => {
    const props = {
      ...proprietes(),
      surChanger: vi.fn(() =>
        Promise.resolve({ erreur: 'Un enregistrement est en cours. Réessayez dans un instant.' }),
      ),
    }
    render(<MenuEspaces {...props} disposition="en-tete" />)
    await userEvent.click(screen.getByRole('button', { name: "Changer d'espace" }))
    await userEvent.click(screen.getByRole('button', { name: 'Passer à Ministère Tech' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Un enregistrement est en cours. Réessayez dans un instant.',
    )
    expect(screen.getByRole('button', { name: 'Passer à Ministère Tech' })).not.toHaveAttribute(
      'aria-disabled',
    )
  })

  it('sans place pour un autre compte, « Ajouter un compte » disparaît', async () => {
    render(<MenuEspaces {...proprietes()} peutAjouter={false} disposition="en-tete" />)
    await userEvent.click(screen.getByRole('button', { name: "Changer d'espace" }))
    expect(screen.queryByRole('button', { name: 'Ajouter un compte' })).not.toBeInTheDocument()
  })
})
