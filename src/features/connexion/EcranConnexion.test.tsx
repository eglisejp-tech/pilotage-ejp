import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EcranConnexion } from '@/features/connexion/EcranConnexion'
import type { ProprietesEcranConnexion } from '@/features/connexion/EcranConnexion'
import { messagesConnexion } from '@/features/connexion/messages'

function afficher(proprietes: Partial<ProprietesEcranConnexion> = {}) {
  const onGoogle = vi.fn()
  const onSubmit = vi.fn()
  const utilisateur = userEvent.setup()
  render(
    <MemoryRouter>
      <EcranConnexion onGoogle={onGoogle} onSubmit={onSubmit} {...proprietes} />
    </MemoryRouter>,
  )
  return { onGoogle, onSubmit, utilisateur }
}

const champEmail = () => screen.getByLabelText('Email')
const champMotDePasse = () => screen.getByLabelText('Mot de passe')
const boutonConnexion = () => screen.getByRole('button', { name: 'Se connecter' })

describe('EcranConnexion (maquette 16)', () => {
  it("affiche Google, les champs pour les gestionnaires de mots de passe, et pas d'inscription", () => {
    afficher()
    expect(screen.getByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeInTheDocument()
    expect(champEmail()).toHaveAttribute('type', 'email')
    expect(champEmail()).toHaveAttribute('autocomplete', 'username')
    expect(champMotDePasse()).toHaveAttribute('type', 'password')
    expect(champMotDePasse()).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'recevoir un lien' })).toHaveAttribute(
      'href',
      '/connexion/mot-de-passe-oublie',
    )
    expect(screen.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute(
      'href',
      '/confidentialite',
    )
    expect(screen.queryByText(/inscri/i)).not.toBeInTheDocument()
    expect(document.title).toBe('Connexion, Pilotage EJP')
  })

  it('refuse un envoi vide : messages reliés aux champs et focus sur le premier', async () => {
    const { onSubmit, utilisateur } = afficher()
    await utilisateur.click(boutonConnexion())

    expect(await screen.findByText('Saisissez votre adresse email.')).toBeInTheDocument()
    expect(champEmail()).toHaveAttribute('aria-invalid', 'true')
    expect(champEmail()).toHaveAccessibleDescription('Saisissez votre adresse email.')
    expect(champMotDePasse()).toHaveAccessibleDescription('Saisissez votre mot de passe.')
    expect(champEmail()).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuse une adresse incomplète', async () => {
    const { onSubmit, utilisateur } = afficher()
    await utilisateur.type(champEmail(), 'communication@')
    await utilisateur.type(champMotDePasse(), 'mot de passe')
    await utilisateur.click(boutonConnexion())

    expect(champEmail()).toHaveAccessibleDescription(
      'Saisissez une adresse email complète, par exemple nom@exemple.fr.',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envoie un email et un mot de passe valides, mot de passe collé compris', async () => {
    const { onSubmit, utilisateur } = afficher()
    await utilisateur.type(champEmail(), 'communication@ejp.exemple')
    await utilisateur.click(champMotDePasse())
    await utilisateur.paste('un mot de passe collé')
    await utilisateur.click(boutonConnexion())

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'communication@ejp.exemple',
      motDePasse: 'un mot de passe collé',
    })
  })

  it('lance la connexion Google', async () => {
    const { onGoogle, utilisateur } = afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer avec Google' }))
    expect(onGoogle).toHaveBeenCalledTimes(1)
  })

  it("affiche l'erreur du serveur dans un bandeau qui prend le focus", () => {
    afficher({ erreur: messagesConnexion.identifiantsIncorrects })
    const bandeau = screen.getByRole('alert')
    expect(bandeau).toHaveTextContent(
      "Email ou mot de passe incorrect. Vérifiez l'un et l'autre, puis réessayez.",
    )
    expect(bandeau).toHaveFocus()
  })

  it("pendant l'envoi, le bouton l'annonce et un second envoi est ignoré", async () => {
    const { onGoogle, onSubmit, utilisateur } = afficher({ enCours: 'mot-de-passe' })
    await utilisateur.type(champEmail(), 'communication@ejp.exemple')
    await utilisateur.type(champMotDePasse(), 'mot de passe')
    const bouton = screen.getByRole('button', { name: 'Connexion en cours' })
    expect(bouton).toHaveAttribute('aria-disabled', 'true')
    await utilisateur.click(bouton)
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer avec Google' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onGoogle).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Connexion en cours')
  })
})
