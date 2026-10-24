import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FenetreConfirmation } from '@/components/ui/FenetreConfirmation'

function Ecran({ action }: { action: () => Promise<void> }) {
  const [ouverte, setOuverte] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOuverte(true)}>
        Désactiver Louange
      </button>
      {ouverte ? (
        <FenetreConfirmation
          titre="Désactiver Louange ?"
          texte="Plus personne ne pourra se connecter."
          confirmer="Désactiver le ministère"
          libelleEnCours="Désactivation en cours"
          onConfirmer={async () => {
            await action()
            setOuverte(false)
          }}
          onAnnuler={() => setOuverte(false)}
          lireMessage={() => 'La connexion a échoué. Réessayez.'}
        />
      ) : null}
    </>
  )
}

describe('FenetreConfirmation (proposition 20)', () => {
  it('s’ouvre sur elle-même, nommée par son titre et décrite par sa phrase', async () => {
    render(<Ecran action={vi.fn().mockResolvedValue(undefined)} />)
    await userEvent.click(screen.getByRole('button', { name: 'Désactiver Louange' }))
    const fenetre = screen.getByRole('alertdialog', { name: 'Désactiver Louange ?' })
    expect(fenetre.tagName).toBe('DIALOG')
    expect(fenetre).toHaveAttribute('open')
    expect(fenetre).toHaveAccessibleDescription('Plus personne ne pourra se connecter.')
    expect(fenetre).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Désactiver Louange ?' })).toHaveClass(
      'text-titre-fenetre',
    )
  })

  it('Échap et « Annuler » ferment sans rien appeler, et le focus revient au bouton', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    render(<Ecran action={action} />)
    const origine = screen.getByRole('button', { name: 'Désactiver Louange' })
    await userEvent.click(origine)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(origine).toHaveFocus()

    await userEvent.click(origine)
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(origine).toHaveFocus()
    expect(action).not.toHaveBeenCalled()
  })

  it('pendant l’action : « en cours », aria-disabled, Échap n’annule pas ; un refus reste affiché', async () => {
    let refuser: (raison: Error) => void = () => {}
    const action = vi.fn(
      () =>
        new Promise<void>((_, rejeter) => {
          refuser = rejeter
        }),
    )
    render(<Ecran action={action} />)
    await userEvent.click(screen.getByRole('button', { name: 'Désactiver Louange' }))
    await userEvent.click(screen.getByRole('button', { name: 'Désactiver le ministère' }))
    const enCours = screen.getByRole('button', { name: 'Désactivation en cours' })
    expect(enCours).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(enCours)
    expect(action).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    refuser(new Error('réseau'))
    expect(await screen.findByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('button', { name: 'Désactiver le ministère' })).not.toHaveAttribute(
      'aria-disabled',
    )
  })
})
