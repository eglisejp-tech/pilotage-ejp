import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnTete } from '@/features/navigation/EnTete'
import { ONGLETS } from '@/features/navigation/profils'
import { RubanOctobreRose } from '@/features/octobre-rose/RubanOctobreRose'

function auJour(instant: string) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(instant))
}

function afficherEnTete() {
  return render(
    <MemoryRouter>
      <EnTete
        libelleCompte="Berger"
        onglets={ONGLETS.berger}
        accueil="/"
        onSignOut={() => undefined}
      />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('RubanOctobreRose', () => {
  it('en octobre : une image nommée « Octobre rose », hors de l’ordre du clavier', () => {
    auJour('2026-10-01T00:00:00+02:00')
    render(<RubanOctobreRose className="h-5" />)
    const ruban = screen.getByRole('img', { name: 'Octobre rose' })
    expect(ruban.tagName.toLowerCase()).toBe('svg')
    expect(ruban).toHaveClass('h-5', 'text-octobre-rose')
    expect(ruban).not.toHaveAttribute('tabindex')
    expect(ruban.querySelector('path')).not.toBeNull()
  })

  it('en novembre : rien', () => {
    auJour('2026-11-01T00:00:00+01:00')
    const { container } = render(<RubanOctobreRose />)
    expect(container).toBeEmptyDOMElement()
  })

  it('dans l’en-tête, en ses deux formats : à côté du nom, hors du lien, qui garde son nom', () => {
    auJour('2026-10-31T23:59:00+01:00')
    afficherEnTete()
    const entete = screen.getByRole('banner')
    const rubans = within(entete).getAllByRole('img', { name: 'Octobre rose' })
    const liens = within(entete).getAllByRole('link', { name: 'Pilotage EJP' })
    expect(rubans).toHaveLength(2)
    expect(liens).toHaveLength(2)
    rubans.forEach((ruban, rang) => {
      expect(liens[rang]?.contains(ruban)).toBe(false)
      expect(ruban.parentElement).toBe(liens[rang]?.parentElement)
    })
  })

  it('dans l’en-tête, à partir du 1er novembre 0 h (Paris) : plus de ruban', () => {
    auJour('2026-10-31T23:00:00Z')
    afficherEnTete()
    expect(screen.queryByRole('img', { name: 'Octobre rose' })).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Pilotage EJP' })).toHaveLength(2)
  })
})
