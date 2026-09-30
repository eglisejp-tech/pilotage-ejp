import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EcranMotDePasseOublie } from '@/features/connexion/EcranMotDePasseOublie'
import type { ProprietesEcranMotDePasseOublie } from '@/features/connexion/EcranMotDePasseOublie'

function afficher(proprietes: Partial<ProprietesEcranMotDePasseOublie> = {}) {
  const onSubmit = vi.fn()
  const utilisateur = userEvent.setup()
  render(
    <MemoryRouter>
      <EcranMotDePasseOublie onSubmit={onSubmit} {...proprietes} />
    </MemoryRouter>,
  )
  return { onSubmit, utilisateur }
}

describe('EcranMotDePasseOublie', () => {
  it('refuse une adresse vide et donne le focus au champ', async () => {
    const { onSubmit, utilisateur } = afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Recevoir un lien' }))
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Saisissez votre adresse email.',
    )
    expect(screen.getByLabelText('Email')).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('demande le lien pour une adresse valide', async () => {
    const { onSubmit, utilisateur } = afficher()
    await utilisateur.type(screen.getByLabelText('Email'), 'communication@ejp.exemple')
    await utilisateur.click(screen.getByRole('button', { name: 'Recevoir un lien' }))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'communication@ejp.exemple' })
  })

  it("après l'envoi, affiche toujours le même message et y place le focus", () => {
    afficher({ envoye: true })
    const message = screen.getByRole('status')
    expect(message).toHaveTextContent(
      'Si un compte existe pour cette adresse, un lien vient de lui être envoyé. Pensez à regarder les courriers indésirables.',
    )
    expect(message).toHaveFocus()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à la connexion' })).toHaveAttribute(
      'href',
      '/connexion',
    )
  })
})
