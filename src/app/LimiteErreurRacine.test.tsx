import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LimiteErreurRacine } from '@/app/LimiteErreurRacine'

function Plantage(): never {
  throw new Error('Rendu impossible')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LimiteErreurRacine (m241)', () => {
  it('sans erreur, l’application s’affiche telle quelle', () => {
    render(
      <LimiteErreurRacine>
        <p>Application</p>
      </LimiteErreurRacine>,
    )
    expect(screen.getByText('Application')).toBeVisible()
  })

  it('une erreur de rendu hors du routeur : un message et « Recharger la page », jamais une page blanche', async () => {
    // React et la limite écrivent l'erreur dans la console : le test la tait.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const recharger = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload: recharger,
    })
    render(
      <LimiteErreurRacine>
        <Plantage />
      </LimiteErreurRacine>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: "La page n'a pas pu s'afficher" }),
    ).toBeVisible()
    expect(screen.getByText('Si le problème revient, prévenez EJP Tech.')).toBeVisible()
    expect(document.title).toBe('Affichage impossible, Pilotage EJP')
    await userEvent.click(screen.getByRole('button', { name: 'Recharger la page' }))
    expect(recharger).toHaveBeenCalledTimes(1)
  })
})
