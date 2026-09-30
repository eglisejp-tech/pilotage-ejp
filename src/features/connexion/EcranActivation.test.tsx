import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EcranActivation } from '@/features/connexion/EcranActivation'
import type { ProprietesEcranActivation } from '@/features/connexion/EcranActivation'

const QR_CODE =
  'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E'

function afficher(proprietes: Partial<ProprietesEcranActivation> = {}) {
  const onVerifyCode = vi.fn()
  const onSignOut = vi.fn()
  const utilisateur = userEvent.setup()
  render(
    <EcranActivation
      libelleCompte="Ministère Communication"
      comptePartage
      qrCode={QR_CODE}
      cle="JBSWY3DPEHPK3PXP"
      onVerifyCode={onVerifyCode}
      onSignOut={onSignOut}
      {...proprietes}
    />,
  )
  return { onVerifyCode, onSignOut, utilisateur }
}

const champCode = () => screen.getByLabelText("Saisissez le code affiché par l'application.")

describe('EcranActivation (maquette 17)', () => {
  it('guide en trois étapes, avec le QR code, la clé et le deuxième téléphone', () => {
    afficher()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Activer la double authentification' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(
      screen.getByRole('img', { name: "QR code d'activation de Pilotage EJP" }),
    ).toHaveAttribute('src', QR_CODE)
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(
      screen.getByText('Vous pouvez aussi scanner ce code avec un deuxième téléphone, en secours.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ministère Communication')).toBeInTheDocument()
    expect(champCode()).toHaveAttribute('autocomplete', 'one-time-code')
  })

  it("explique le compte partagé d'un ministère, et seulement pour lui", () => {
    afficher()
    expect(screen.getByText('Compte partagé.')).toBeInTheDocument()
    expect(
      screen.getByText(/Chaque personne autorisée du ministère scanne ce même code/),
    ).toBeVisible()
  })

  it("n'affiche pas l'encadré pour un compte personnel", () => {
    afficher({ comptePartage: false, libelleCompte: 'Conseil, compte 3' })
    expect(screen.queryByText('Compte partagé.')).not.toBeInTheDocument()
  })

  it('annonce la préparation du QR code après 300 ms, avec aria-busy', async () => {
    afficher({ qrCode: undefined, cle: undefined })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('Chargement')).not.toBeInTheDocument()
    const chargement = await screen.findByText('Chargement')
    expect(chargement.closest('[aria-busy="true"]')).not.toBeNull()
  })

  it('active avec un code collé', async () => {
    const { onVerifyCode, utilisateur } = afficher()
    await utilisateur.click(champCode())
    await utilisateur.paste('482913')
    await utilisateur.click(screen.getByRole('button', { name: 'Activer' }))
    expect(onVerifyCode).toHaveBeenCalledWith('482913')
  })

  it('refuse un code incomplet', async () => {
    const { onVerifyCode, utilisateur } = afficher()
    await utilisateur.type(champCode(), '482')
    await utilisateur.click(screen.getByRole('button', { name: 'Activer' }))
    expect(champCode()).toHaveAccessibleDescription('Saisissez les 6 chiffres du code.')
    expect(onVerifyCode).not.toHaveBeenCalled()
  })

  it('se déconnecte depuis la barre du haut', async () => {
    const { onSignOut, utilisateur } = afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
