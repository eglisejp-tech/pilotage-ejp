import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EcranMotDePasse } from '@/features/connexion/EcranMotDePasse'
import type { ProprietesEcranMotDePasse } from '@/features/connexion/EcranMotDePasse'
import { messagesConnexion } from '@/features/connexion/messages'

function afficher(proprietes: Partial<ProprietesEcranMotDePasse> = {}) {
  const onSubmit = vi.fn()
  const utilisateur = userEvent.setup()
  render(<EcranMotDePasse variante="invitation" onSubmit={onSubmit} {...proprietes} />)
  return { onSubmit, utilisateur }
}

const champ = () => screen.getByLabelText('Mot de passe')

describe('EcranMotDePasse (invitation et mot de passe oublié)', () => {
  it("après l'invitation : « Choisissez votre mot de passe », pour un gestionnaire de mots de passe", () => {
    afficher({ email: 'communication@ejp.exemple' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Choisissez votre mot de passe' }),
    ).toBeInTheDocument()
    expect(champ()).toHaveAttribute('autocomplete', 'new-password')
    expect(champ()).toHaveAccessibleDescription(
      '12 caractères au moins. Une phrase de quelques mots se retient facilement.',
    )
    const identifiant = document.querySelector('input[autocomplete="username"]')
    expect(identifiant).toHaveValue('communication@ejp.exemple')
  })

  it('après un lien de récupération : « Nouveau mot de passe »', () => {
    afficher({ variante: 'recuperation' })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Nouveau mot de passe' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nouveau mot de passe')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }),
    ).toBeInTheDocument()
  })

  it('refuse moins de 12 caractères : message relié au champ, focus sur le champ', async () => {
    const { onSubmit, utilisateur } = afficher()
    await utilisateur.type(champ(), 'trop court')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))

    expect(champ()).toHaveAttribute('aria-invalid', 'true')
    expect(champ()).toHaveAccessibleDescription(
      '12 caractères au moins. Une phrase de quelques mots se retient facilement. Choisissez un mot de passe de 12 caractères au moins.',
    )
    expect(champ()).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('enregistre un mot de passe valide, collé depuis un gestionnaire', async () => {
    const { onSubmit, utilisateur } = afficher()
    await utilisateur.click(champ())
    await utilisateur.paste('Xk9!mP2#qL7$vR4')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))
    expect(onSubmit).toHaveBeenCalledWith({ motDePasse: 'Xk9!mP2#qL7$vR4' })
  })

  it('affiche le mot de passe sur demande', async () => {
    const { utilisateur } = afficher()
    expect(champ()).toHaveAttribute('type', 'password')
    await utilisateur.click(screen.getByLabelText('Afficher le mot de passe'))
    expect(champ()).toHaveAttribute('type', 'text')
  })

  it("donne le focus au bandeau d'erreur du serveur", () => {
    afficher({ erreur: messagesConnexion.echecReseau })
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('alert')).toHaveFocus()
  })
})
