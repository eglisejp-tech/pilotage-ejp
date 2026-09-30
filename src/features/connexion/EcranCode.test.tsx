import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EcranCode } from '@/features/connexion/EcranCode'
import type { ProprietesEcranCode } from '@/features/connexion/EcranCode'
import { messagesConnexion } from '@/features/connexion/messages'

function afficher(proprietes: Partial<ProprietesEcranCode> = {}) {
  const onVerifyCode = vi.fn()
  const onSignOut = vi.fn()
  const utilisateur = userEvent.setup()
  const tout = (autres: Partial<ProprietesEcranCode>) => (
    <EcranCode
      libelleCompte="Ministère Communication"
      onVerifyCode={onVerifyCode}
      onSignOut={onSignOut}
      {...autres}
    />
  )
  const { rerender } = render(tout(proprietes))
  return {
    onVerifyCode,
    onSignOut,
    utilisateur,
    rafraichir: (autres: Partial<ProprietesEcranCode>) => rerender(tout(autres)),
  }
}

const champCode = () => screen.getByLabelText('Code à 6 chiffres')
const boutonVerifier = () => screen.getByRole('button', { name: 'Vérifier' })

describe('EcranCode (maquette 18)', () => {
  it('présente un seul champ de code, prêt pour le collage et le remplissage automatique', () => {
    afficher()
    expect(screen.getByRole('heading', { level: 1, name: 'Code de vérification' })).toBeVisible()
    expect(screen.getByText('Ministère Communication')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(champCode()).toHaveAttribute('inputmode', 'numeric')
    expect(champCode()).toHaveAttribute('autocomplete', 'one-time-code')
    expect(champCode()).toHaveAttribute('maxlength', '6')
    expect(screen.getByText(/refaire l'activation/)).toBeInTheDocument()
  })

  it('accepte un code collé de 6 chiffres et le vérifie', async () => {
    const { onVerifyCode, utilisateur } = afficher()
    await utilisateur.click(champCode())
    await utilisateur.paste('482913')
    expect(champCode()).toHaveValue('482913')

    await utilisateur.click(boutonVerifier())
    expect(onVerifyCode).toHaveBeenCalledWith('482913')
  })

  it('nettoie un code collé avec une espace ou trop long', async () => {
    const { utilisateur } = afficher()
    await utilisateur.click(champCode())
    await utilisateur.paste('482 913')
    expect(champCode()).toHaveValue('482913')

    await utilisateur.clear(champCode())
    await utilisateur.paste('1234567')
    expect(champCode()).toHaveValue('123456')
  })

  it('ne garde que les chiffres tapés', async () => {
    const { utilisateur } = afficher()
    await utilisateur.type(champCode(), '4a8 2-9')
    expect(champCode()).toHaveValue('4829')
  })

  it('refuse un code incomplet : message relié au champ, focus sur le champ', async () => {
    const { onVerifyCode, utilisateur } = afficher()
    await utilisateur.type(champCode(), '4829')
    await utilisateur.click(boutonVerifier())

    expect(await screen.findByText('Saisissez les 6 chiffres du code.')).toBeInTheDocument()
    expect(champCode()).toHaveAttribute('aria-invalid', 'true')
    expect(champCode()).toHaveAccessibleDescription('Saisissez les 6 chiffres du code.')
    expect(champCode()).toHaveFocus()
    expect(onVerifyCode).not.toHaveBeenCalled()
  })

  it('après un code refusé, vide le champ, y remet le focus et le relie au bandeau', async () => {
    const { utilisateur, rafraichir } = afficher()
    await utilisateur.type(champCode(), '482913')
    await utilisateur.click(boutonVerifier())
    rafraichir({ erreur: messagesConnexion.codeFaux })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ce code ne correspond pas. Attendez le code suivant et réessayez.',
    )
    expect(champCode()).toHaveValue('')
    // react-hook-form place le focus au tour suivant (setFocus passe par setTimeout).
    await waitFor(() => expect(champCode()).toHaveFocus())
    expect(champCode()).toHaveAccessibleDescription(messagesConnexion.codeFaux)
  })

  it('ignore un second envoi pendant la vérification', async () => {
    const { onVerifyCode, utilisateur } = afficher({ enCours: true })
    await utilisateur.type(champCode(), '482913')
    await utilisateur.click(screen.getByRole('button', { name: 'Vérification en cours' }))
    expect(onVerifyCode).not.toHaveBeenCalled()
  })

  it('se déconnecte', async () => {
    const { onSignOut, utilisateur } = afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
