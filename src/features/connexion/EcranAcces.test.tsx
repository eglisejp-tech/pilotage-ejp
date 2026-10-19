import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EcranAcces } from '@/features/connexion/EcranAcces'
import type { ProprietesEcranAcces } from '@/features/connexion/EcranAcces'
import { EcranCompteDesactive } from '@/features/connexion/EcranCompteDesactive'

function afficher(proprietes: Partial<ProprietesEcranAcces> = {}) {
  const onContinue = vi.fn()
  const utilisateur = userEvent.setup()
  render(
    <MemoryRouter>
      <EcranAcces type="invitation" onContinue={onContinue} {...proprietes} />
    </MemoryRouter>,
  )
  return { onContinue, utilisateur }
}

describe('EcranAcces (/acces)', () => {
  it('attend un clic sur « Choisir un mot de passe » avant de vérifier le lien', async () => {
    const { onContinue, utilisateur } = afficher()
    expect(onContinue).not.toHaveBeenCalled()
    expect(document.title).toBe('Invitation, Pilotage EJP')
    expect(screen.getByText('Votre compte est prêt.')).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('button', { name: 'Choisir un mot de passe' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('lien de récupération : le titre d’onglet le dit, sans phrase sous le titre (T66)', () => {
    afficher({ type: 'recuperation' })
    expect(document.title).toBe('Mot de passe oublié, Pilotage EJP')
    expect(screen.getByRole('button', { name: 'Choisir un mot de passe' })).toBeInTheDocument()
    expect(screen.queryByText(/Vous avez demandé/)).not.toBeInTheDocument()
  })

  it("lien d'invitation refusé : le dit, renvoie vers EJP Tech (T59), focus sur le titre", () => {
    afficher({ lienInvalide: true })
    const titre = screen.getByRole('heading', { level: 1, name: "Ce lien n'est plus valable" })
    expect(titre).toHaveFocus()
    expect(screen.getByText("Demandez à EJP Tech de renvoyer l'invitation.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à la connexion' })).toHaveAttribute(
      'href',
      '/connexion',
    )
    expect(
      screen.queryByRole('button', { name: 'Choisir un mot de passe' }),
    ).not.toBeInTheDocument()
  })

  it('lien de récupération refusé : propose un nouveau lien, sans phrase qui le répète', () => {
    afficher({ type: 'recuperation', lienInvalide: true })
    expect(screen.queryByText(/Demandez un nouveau lien depuis/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Demander un nouveau lien' })).toHaveAttribute(
      'href',
      '/connexion/mot-de-passe-oublie',
    )
  })
})

describe('EcranCompteDesactive', () => {
  it("dit que le compte est désactivé et à qui s'adresser", () => {
    render(
      <MemoryRouter>
        <EcranCompteDesactive />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Compte désactivé' })).toBeInTheDocument()
    expect(screen.getByText('Ce compte est désactivé. Contactez EJP Tech.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à la connexion' })).toBeInTheDocument()
  })
})
