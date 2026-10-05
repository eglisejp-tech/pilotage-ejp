import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BlocSession } from './BlocSession'
import { exempleCetteSemaine } from './exemple'
import type { DerniereSession } from './types'

function afficher(session: DerniereSession | null) {
  render(
    <MemoryRouter>
      <BlocSession session={session} />
    </MemoryRouter>,
  )
}

const bloc = exempleCetteSemaine('berger').session
const batir = bloc.etat === 'session' ? bloc.session : null

describe('BlocSession', () => {
  it("donne le total sans double compte, sa complétude et le lien vers l'autre session", () => {
    afficher(batir)
    const region = screen.getByRole('region', { name: "Bâtir l'Église, samedi 26 septembre" })
    expect(region).toHaveTextContent('58STARs présents, selon 6 ministères sur 8')
    expect(within(region).getByRole('link', { name: 'Voir Anti-Dispersion' })).toHaveAttribute(
      'href',
      '/?profil=berger&session=anti-dispersion',
    )
  })

  it('montre les ministères manquants en pointillés « À saisir » et dans la liste', () => {
    afficher(batir)
    const barre = screen.getByTestId('barre-session')
    expect(barre).toHaveAttribute('aria-hidden', 'true')
    expect(barre.querySelectorAll('[data-a-saisir]')).toHaveLength(2)
    expect(barre.children).toHaveLength(8)
    expect(screen.getByText('Coordination, Intégration')).toHaveClass('text-attention')

    const apports = screen.getAllByRole('listitem').filter((item) => !item.querySelector('a'))
    expect(apports.map((item) => item.textContent)).toEqual([
      'Communication13',
      'Jeunesse13',
      'FIJ10',
      'Prodiges Junior8',
      'EJP Formation7',
      'Social7',
      'CoordinationÀ saisir',
      'IntégrationÀ saisir',
    ])
  })

  it("accorde le résumé et signale les présents saisis qui diffèrent de l'apport", () => {
    afficher({
      titre: 'Soirée des parents, samedi 17 octobre',
      total: 1,
      saisis: 1,
      attendus: 3,
      apports: [{ ministere: 'Jeunesse', valeur: 1, saisis: 3 }],
      noteDoubleCompte:
        "3 présences saisies : 2 STARs saisis par deux ministères ne sont comptés qu'une fois.",
      autres: [],
    })
    expect(screen.getByText('STAR présent, selon 1 ministère sur 3')).toBeInTheDocument()
    expect(screen.getByText('(3 saisis)')).toBeInTheDocument()
    expect(screen.getByText(/ne sont comptés qu'une fois/)).toBeInTheDocument()
  })

  it("remplace le total par « Pas encore de saisie » quand personne n'a saisi", () => {
    afficher({
      titre: "Bâtir l'Église, samedi 3 octobre",
      total: null,
      saisis: 0,
      attendus: 8,
      apports: [{ ministere: 'Jeunesse', valeur: null, saisis: null }],
      noteDoubleCompte: null,
      autres: [],
    })
    expect(screen.getByText('Pas encore de saisie')).toBeInTheDocument()
    expect(
      screen.getByText("Aucun des 8 ministères attendus n'a encore saisi."),
    ).toBeInTheDocument()
  })

  it("dit quand aucune session n'est déclarée", () => {
    afficher(null)
    expect(screen.getByRole('heading', { level: 2, name: 'Dernière session' })).toBeInTheDocument()
    expect(screen.getByText('Aucune session déclarée.')).toBeInTheDocument()
  })
})
