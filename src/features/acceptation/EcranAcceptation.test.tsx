import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
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
    // La version, en petit sous les liens de lecture, juste avant la case qu'elle précise.
    const version = screen.getByText('Conditions du 8 octobre 2026')
    const apres = Node.DOCUMENT_POSITION_FOLLOWING
    expect(
      screen
        .getByRole('link', { name: 'Lire la politique de confidentialité (nouvel onglet)' })
        .compareDocumentPosition(version) & apres,
    ).toBe(apres)
    expect(version.compareDocumentPosition(caseACocher()) & apres).toBe(apres)
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

  it('nouvelle version après une acceptation : l’écran dit pourquoi il revient (m056)', () => {
    afficher()
    expect(screen.queryByText(/Les conditions ont changé/)).not.toBeInTheDocument()
    afficher({ conditionsChangees: true })
    expect(
      screen.getByText('Les conditions ont changé. Lisez-les avant de continuer.'),
    ).toBeVisible()
  })

  it('« Se déconnecter » appelle la déconnexion', async () => {
    const { onSignOut, utilisateur } = afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('compte non partagé : ni prénom, ni « Ce n’est pas moi »', () => {
    afficher()
    expect(screen.queryByText(/^Vous :/)).not.toBeInTheDocument()
    expect(screen.queryByText(/chaque personne/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: "Ce n'est pas moi" })).not.toBeInTheDocument()
  })

  it('compte de ministère : la personne déclarée accepte elle-même, avec « Ce n’est pas moi » (T61)', () => {
    render(
      <MemoryRouter>
        <EcranAcceptation
          libelleCompte="Ministère Communication"
          personne={{ prenom: 'Marie D.', lienChangement: '/qui-utilise?changer=1' }}
          version="2026-10-12"
          onAccept={vi.fn()}
          onSignOut={vi.fn()}
        />
      </MemoryRouter>,
    )
    // Une seule phrase pour le partage et la personne, puis la sortie de la mauvaise personne.
    expect(screen.getByText('Vous : Marie D.')).toBeVisible()
    expect(screen.getByText('Vous : Marie D.').closest('p')).toHaveTextContent(
      'Chaque personne du compte accepte elle-même. Vous : Marie D.',
    )
    const lien = screen.getByRole('link', { name: "Ce n'est pas moi" })
    expect(lien).toHaveAttribute('href', '/qui-utilise?changer=1')
    // Dessiné comme les liens de lecture (bleu nuit, souligné), pas en gris.
    expect(lien).toHaveClass('text-nuit', 'underline')
    // La case garde le texte décidé (T53).
    expect(caseACocher()).not.toBeChecked()
  })
})
