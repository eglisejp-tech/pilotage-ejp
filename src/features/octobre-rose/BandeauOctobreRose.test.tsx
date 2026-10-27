import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BandeauOctobreRose } from '@/features/octobre-rose/BandeauOctobreRose'
import { CLE_MASQUE, oublierMemoire } from '@/features/octobre-rose/memoire'
import { ADRESSE_DEPISTAGE } from '@/features/octobre-rose/octobreRose'

const TEXTE = 'Octobre rose : le dépistage du cancer sauve des vies. Parlez-en autour de vous.'

function afficher() {
  return render(
    <>
      <BandeauOctobreRose />
      <main id="contenu" tabIndex={-1}>
        Contenu
      </main>
    </>,
  )
}

/** Seule la date est simulée : les minuteurs restent réels pour userEvent. */
function auJour(instant: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(instant))
}

const region = () => screen.queryByRole('region', { name: 'Octobre rose' })

beforeEach(() => auJour('2026-10-27T10:00:00+01:00'))

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  window.localStorage.clear()
  oublierMemoire()
})

describe('BandeauOctobreRose', () => {
  it('en octobre : une région nommée, le texte exact, sans « du sein »', () => {
    afficher()
    const bandeau = region()
    expect(bandeau).toBeVisible()
    expect(bandeau?.querySelector('[role="status"]')).toBeNull()
    expect(bandeau?.querySelector('p')?.textContent).toBe(TEXTE)
    expect(bandeau).not.toHaveTextContent(/sein/)
  })

  it('« En savoir plus » ouvre la page de l’Institut national du cancer dans un nouvel onglet, et le dit', () => {
    afficher()
    const lien = screen.getByRole('link', { name: 'En savoir plus (nouvel onglet)' })
    expect(lien).toHaveAttribute('href', ADRESSE_DEPISTAGE)
    expect(lien).toHaveAttribute('target', '_blank')
    expect(lien).toHaveAttribute('rel', 'noopener noreferrer')
    expect(lien.querySelector('.sr-only')).toHaveTextContent('(nouvel onglet)')
    expect(ADRESSE_DEPISTAGE).toMatch(/^https:\/\/www\.cancer\.fr\//)
  })

  it('« Masquer » le cache, retient l’année sur l’appareil et rend le focus au contenu', async () => {
    const utilisateur = userEvent.setup()
    const { unmount } = afficher()
    const bouton = screen.getByRole('button', { name: 'Masquer le bandeau Octobre rose' })
    expect(bouton).toHaveClass('min-h-cible', 'min-w-cible')
    await utilisateur.click(bouton)
    expect(region()).toBeNull()
    expect(screen.getByRole('main')).toHaveFocus()
    expect(window.localStorage.getItem(CLE_MASQUE)).toBe('2026')
    // Au rechargement, il reste masqué.
    unmount()
    oublierMemoire()
    afficher()
    expect(region()).toBeNull()
  })

  it('masqué l’an dernier : il revient cet octobre', () => {
    window.localStorage.setItem(CLE_MASQUE, '2025')
    afficher()
    expect(region()).toBeVisible()
  })

  it('stockage bloqué : le bandeau s’affiche normalement, et « Masquer » le cache sans erreur', async () => {
    const refus = () => {
      throw new DOMException('Stockage bloqué', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refus)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refus)
    const utilisateur = userEvent.setup()
    afficher()
    expect(region()).toBeVisible()
    await utilisateur.click(screen.getByRole('button', { name: 'Masquer le bandeau Octobre rose' }))
    expect(region()).toBeNull()
  })

  it.each([
    ['30 sept. 23 h 59', '2026-09-30T23:59:00+02:00'],
    ['1er nov. 0 h', '2026-11-01T00:00:00+01:00'],
  ])('hors octobre (%s, Paris) : rien', (_cas, instant) => {
    auJour(instant)
    const { container } = afficher()
    expect(region()).toBeNull()
    expect(container).not.toHaveTextContent('Octobre rose')
  })
})
