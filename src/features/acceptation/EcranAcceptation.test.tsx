import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EcranAcceptation } from '@/features/acceptation/EcranAcceptation'
import type { ProprietesEcranAcceptation } from '@/features/acceptation/EcranAcceptation'

function afficher(proprietes: Partial<ProprietesEcranAcceptation> = {}) {
  const onAccept = vi.fn()
  const onSignOut = vi.fn()
  const utilisateur = userEvent.setup()
  render(
    <EcranAcceptation
      libelleCompte="Ministère Communication"
      version="2026-10-08"
      onAccept={onAccept}
      onSignOut={onSignOut}
      {...proprietes}
    />,
  )
  return { onAccept, onSignOut, utilisateur }
}

const caseACocher = () =>
  screen.getByRole('checkbox', {
    name: "J'accepte les conditions d'utilisation et j'ai pris connaissance de la politique de confidentialité",
  })
const bouton = () => screen.getByRole('button', { name: 'Accepter et continuer' })

describe('EcranAcceptation (T53)', () => {
  it('présente la case décochée, la date de la version, les deux liens et « Se déconnecter »', () => {
    afficher()
    expect(
      screen.getByRole('heading', { level: 1, name: "Conditions d'utilisation" }),
    ).toBeVisible()
    expect(screen.getByText('Ministère Communication')).toBeInTheDocument()
    expect(screen.getByText('Conditions du 8 octobre 2026')).toBeInTheDocument()
    expect(caseACocher()).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /refuser/i })).not.toBeInTheDocument()
  })

  it('les liens ouvrent les conditions et la confidentialité dans un nouvel onglet, et le disent', () => {
    afficher()
    const conditions = screen.getByRole('link', {
      name: "Lire les conditions d'utilisation (nouvel onglet)",
    })
    expect(conditions).toHaveAttribute('href', '/conditions')
    expect(conditions).toHaveAttribute('target', '_blank')
    expect(conditions).toHaveAttribute('rel', expect.stringContaining('noopener'))
    const confidentialite = screen.getByRole('link', {
      name: 'Lire la politique de confidentialité (nouvel onglet)',
    })
    expect(confidentialite).toHaveAttribute('href', '/confidentialite')
    expect(confidentialite).toHaveAttribute('target', '_blank')
  })

  it('sans case cochée : le message, rien n’est envoyé, le bouton reste actif', async () => {
    const { onAccept, utilisateur } = afficher()
    expect(bouton()).not.toBeDisabled()
    await utilisateur.click(bouton())
    expect(await screen.findByText('Cochez la case pour continuer.')).toBeVisible()
    expect(caseACocher()).toHaveAttribute('aria-invalid', 'true')
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('case cochée : envoie l’acceptation une seule fois', async () => {
    const { onAccept, utilisateur } = afficher()
    await utilisateur.click(caseACocher())
    await utilisateur.click(bouton())
    await vi.waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Cochez la case pour continuer.')).not.toBeInTheDocument()
  })

  it('pendant l’envoi, un second clic est ignoré', async () => {
    const { onAccept, utilisateur } = afficher({ enCours: true })
    await utilisateur.click(caseACocher())
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrement en cours' }))
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('affiche l’erreur de l’enregistrement dans un bandeau', () => {
    afficher({ erreur: 'La connexion a échoué. Réessayez.' })
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
  })

  it('« Se déconnecter » appelle la déconnexion', async () => {
    const { onSignOut, utilisateur } = afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
