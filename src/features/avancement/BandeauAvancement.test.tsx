import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { BandeauAvancement } from '@/features/avancement/BandeauAvancement'
import { MISE_A_JOUR } from '@/features/avancement/etapes'
import { CLE_FERMETURE, oublierMemoire } from '@/features/avancement/memoire'

function afficher(chemin = '/') {
  return render(
    <MemoryRouter initialEntries={[chemin]}>
      <BandeauAvancement />
      <main id="contenu" tabIndex={-1}>
        Contenu
      </main>
    </MemoryRouter>,
  )
}

afterEach(() => {
  window.localStorage.clear()
  oublierMemoire()
})

describe('BandeauAvancement', () => {
  it('est une région nommée, sans role status, avec le texte et 8 cases décoratives', () => {
    const { container } = afficher()
    const region = screen.getByRole('region', { name: "Avancement de l'outil" })
    expect(region.querySelector('[role="status"]')).toBeNull()
    expect(region).toHaveTextContent('6 étapes sur 8 en ligne.')
    expect(region).toHaveTextContent(
      'Prochaine : Mes indicateurs et validation, prévue vendredi 16 oct.',
    )
    const cases = container.querySelectorAll('[data-statut]')
    expect(cases).toHaveLength(8)
    expect(cases[0]?.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('[data-statut="en-ligne"]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-statut="en-partie"]')).toHaveLength(2)
  })

  it("nomme ses boutons, avec le suffixe réservé aux lecteurs d'écran", () => {
    afficher()
    expect(screen.getByRole('button', { name: 'Voir les étapes' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: "Fermer le bandeau d'avancement" })).toBeVisible()
  })

  it("ouvre le panneau des 8 étapes, avec l'étape suivante marquée", async () => {
    afficher()
    const bouton = screen.getByRole('button', { name: 'Voir les étapes' })
    const panneau = document.getElementById(bouton.getAttribute('aria-controls') ?? '')
    expect(panneau).toHaveAttribute('hidden')
    await userEvent.click(bouton)
    expect(bouton).toHaveAccessibleName('Masquer les étapes')
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    expect(panneau).not.toHaveAttribute('hidden')
    expect(panneau).toHaveTextContent(
      'Point du 8 oct. Les dates à venir sont celles du plan : elles peuvent bouger.',
    )
    const etapes = screen.getAllByRole('listitem')
    expect(etapes).toHaveLength(8)
    expect(etapes[5]).toHaveAttribute('aria-current', 'step')
    expect(etapes[0]).toHaveTextContent('■ En ligne')
    expect(etapes[5]).toHaveTextContent('En partie : 4 parties sur 5 en ligne.')
    expect(screen.getAllByText('■ En ligne')).toHaveLength(6)
  })

  it('se ferme avec Échap et rend le focus au bouton', async () => {
    afficher()
    const bouton = screen.getByRole('button', { name: 'Voir les étapes' })
    await userEvent.click(bouton)
    await userEvent.keyboard('{Escape}')
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    expect(bouton).toHaveFocus()
  })

  it('« Fermer » retient le choix et place le focus sur le contenu', async () => {
    afficher()
    await userEvent.click(screen.getByRole('button', { name: /^Fermer/ }))
    expect(screen.queryByRole('region')).toBeNull()
    expect(window.localStorage.getItem(CLE_FERMETURE)).toBe(MISE_A_JOUR)
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('reste fermé si la version retenue est la bonne, et revient si elle a changé', () => {
    window.localStorage.setItem(CLE_FERMETURE, MISE_A_JOUR)
    const { unmount } = afficher()
    expect(screen.queryByRole('region')).toBeNull()
    unmount()
    window.localStorage.setItem(CLE_FERMETURE, '2026-01-01')
    afficher()
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  it.each(['/saisir/dimanche', '/saisir', '/signaler', '/signaler/nouveau'])(
    'est masqué sur %s',
    (chemin) => {
      afficher(chemin)
      expect(screen.queryByRole('region')).toBeNull()
    },
  )

  it('reste visible sur les autres pages', () => {
    afficher('/points')
    expect(screen.getByRole('region')).toBeInTheDocument()
  })
})
