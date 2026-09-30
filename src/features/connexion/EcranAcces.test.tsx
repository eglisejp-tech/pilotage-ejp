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
  it('attend un clic sur « Continuer » avant de vérifier le lien', async () => {
    const { onContinue, utilisateur } = afficher()
    expect(onContinue).not.toHaveBeenCalled()
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it("lien d'invitation refusé : le dit, renvoie vers l'administration, focus sur le titre", () => {
    afficher({ lienInvalide: true })
    const titre = screen.getByRole('heading', { level: 1, name: "Ce lien n'est plus valable" })
    expect(titre).toHaveFocus()
    expect(
      screen.getByText("Demandez à l'administration de l'église de relancer l'invitation."),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à la connexion' })).toHaveAttribute(
      'href',
      '/connexion',
    )
    expect(screen.queryByRole('button', { name: 'Continuer' })).not.toBeInTheDocument()
  })

  it('lien de récupération refusé : propose un nouveau lien', () => {
    afficher({ type: 'recuperation', lienInvalide: true })
    expect(
      screen.getByText("Demandez un nouveau lien depuis l'écran de connexion."),
    ).toBeInTheDocument()
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
    expect(
      screen.getByText("Ce compte est désactivé. Adressez-vous à l'administration de l'église."),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à la connexion' })).toBeInTheDocument()
  })
})
