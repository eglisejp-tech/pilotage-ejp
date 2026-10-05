import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BlocSession } from './BlocSession'
import { exempleCetteSemaine } from './exemple'
import type { DerniereSession, DonneesBlocSession } from './types'

function afficher(session: DerniereSession | DonneesBlocSession) {
  const bloc: DonneesBlocSession = 'etat' in session ? session : { etat: 'session', session }
  render(
    <MemoryRouter>
      <BlocSession bloc={bloc} />
    </MemoryRouter>,
  )
}

const exemple = exempleCetteSemaine('berger').session
if (exemple.etat !== 'session') throw new Error("L'exemple doit avoir une session.")
const batir = exemple.session

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

  it('sans ministère attendu : ni barre ni liste vides, le résumé le dit', () => {
    afficher({
      titre: 'Soirée des parents, samedi 17 octobre',
      total: null,
      saisis: 0,
      attendus: 0,
      apports: [],
      noteDoubleCompte: null,
      autres: [],
    })
    expect(screen.getByText('Aucun ministère attendu pour cette session.')).toBeInTheDocument()
    expect(screen.queryByTestId('barre-session')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it("dit quand aucune session n'est déclarée, sous le titre et son filet", () => {
    afficher({ etat: 'aucune_session' })
    const region = screen.getByRole('region', { name: 'Dernière session' })
    expect(within(region).getByText('Aucune session déclarée.')).toBeInTheDocument()
    expect(
      within(region).getByText("L'administration de l'église déclare les sessions."),
    ).toBeInTheDocument()
    expect(within(region).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByTestId('barre-session')).not.toBeInTheDocument()
  })

  it('type de session jamais tenu : son nom, la phrase, et les liens vers les autres types', () => {
    afficher({
      etat: 'aucune_session_du_type',
      type: 'anti_dispersion',
      titre: 'Anti-Dispersion',
      autres: [{ libelle: "Voir Bâtir l'Église", href: '/?session=batir' }],
    })
    const region = screen.getByRole('region', { name: 'Anti-Dispersion' })
    expect(
      within(region).getByText("Aucune session Anti-Dispersion pour l'instant."),
    ).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: "Voir Bâtir l'Église" })).toHaveAttribute(
      'href',
      '/?session=batir',
    )
    expect(within(region).queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  it('autre rassemblement jamais tenu : sa propre phrase', () => {
    afficher({
      etat: 'aucune_session_du_type',
      type: 'autre',
      titre: 'Autre rassemblement',
      autres: [],
    })
    expect(screen.getByText("Aucun autre rassemblement pour l'instant.")).toBeInTheDocument()
    // D'autres sessions existent : pas de phrase sur qui les déclare.
    expect(screen.queryByText(/déclare les sessions/)).not.toBeInTheDocument()
  })

  it('écrit les nombres à la française, comme le tableau des chiffres', () => {
    afficher({
      titre: "Bâtir l'Église, samedi 3 octobre",
      total: 1050,
      saisis: 2,
      attendus: 2,
      apports: [
        { ministere: 'Jeunesse', valeur: 1000, saisis: 1200 },
        { ministere: 'Social', valeur: 50, saisis: null },
      ],
      noteDoubleCompte: null,
      autres: [],
    })
    // Les outils de test ramènent l'espace fine (U+202F) à une espace simple.
    const region = screen.getByRole('region', { name: "Bâtir l'Église, samedi 3 octobre" })
    expect(region).toHaveTextContent('1 050STARs présents')
    expect(within(region).getByText('(1 200 saisis)')).toBeInTheDocument()
    expect(screen.getByTestId('barre-session')).toHaveTextContent('1 000')
  })
})
