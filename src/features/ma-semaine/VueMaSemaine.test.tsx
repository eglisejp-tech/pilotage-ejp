import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvecRequetes } from '@/test/AvecRequetes'
import { ChargementMaSemaine } from './ChargementMaSemaine'
import { exempleFij, exempleMaSemaine, exemplePremierDimanche } from './exempleMaSemaine'
import type { DonneesMaSemaine } from './types'
import { VueMaSemaine } from './VueMaSemaine'

function afficher(donnees: DonneesMaSemaine) {
  return render(
    <MemoryRouter>
      <VueMaSemaine donnees={donnees} />
    </MemoryRouter>,
    { wrapper: AvecRequetes },
  )
}

const titres = () =>
  screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent ?? '')
const chiffres = () => screen.getByRole('region', { name: 'Vos chiffres de la semaine' })
const eglise = () => screen.getByRole('region', { name: "Dans l'église" })

afterEach(() => {
  vi.useRealTimers()
})

describe('VueMaSemaine', () => {
  it('l’ouverture de 07, « Vos saisies », « Vos chiffres de la semaine », « Mes points », « Dans l’église »', () => {
    const { container } = afficher(exempleMaSemaine())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Vos chiffres sont à jour. Il reste la date de la prochaine réunion.',
    )
    expect(container.querySelector('h1 mark')).toHaveTextContent(
      'Il reste la date de la prochaine réunion',
    )
    expect(screen.getByText('Semaine 39, du 21 au 27 sept.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ajouter la prochaine réunion' })).toHaveAttribute(
      'href',
      '/saisir/reunion',
    )
    expect(titres()).toEqual([
      'Vos saisies',
      'Vos chiffres de la semaine',
      'Mes points',
      "Dans l'église",
    ])
  })

  it('aucun bloc du berger : ni session par ministère, ni tableau, ni carte, ni six chiffres', () => {
    afficher(exempleMaSemaine())
    for (const nom of [
      'Les ministères',
      'À décider',
      'Dernière session',
      'FIJ en Île-de-France',
      "L'église cette semaine",
      "Les chiffres de l'église",
    ]) {
      expect(screen.queryByRole('heading', { name: nom }), nom).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Tout voir' })).not.toBeInTheDocument()
    expect(screen.queryByText('À saisir')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('ses chiffres : service avec écart et courbe, actifs, % FIJ, session, indicateur propre', () => {
    afficher(exempleMaSemaine())
    const bloc = chiffres()
    expect(within(bloc).getAllByRole('listitem')).toHaveLength(5)
    expect(within(bloc).getByText('STARs au service')).toBeInTheDocument()
    expect(within(bloc).getByText('Dimanche 27 sept.')).toBeInTheDocument()
    expect(within(bloc).getByText('+1 par rapport à dimanche dernier')).toBeInTheDocument()
    expect(
      within(bloc).getByRole('img', { name: /^10 derniers dimanches : 8, 9, sans saisie/ }),
    ).toBeInTheDocument()
    expect(within(bloc).getByText('11 sur 14 actifs')).toBeInTheDocument()
    expect(within(bloc).getByText("Présents à Bâtir l'Église")).toBeInTheDocument()
    expect(within(bloc).getByText('Visuels livrés ce mois')).toBeInTheDocument()
    expect(within(bloc).getByText('Septembre en cours. Août 2026 : 6')).toBeInTheDocument()
    expect(
      within(bloc).getByRole('link', { name: 'Tous vos chiffres dans Ma fiche' }),
    ).toHaveAttribute('href', '/ma-fiche')
  })

  it('« Dans l’église » : deux totaux, chacun avec « 6 sur 8 », sans nom ni lien', () => {
    afficher(exempleMaSemaine())
    const bloc = eglise()
    expect(within(bloc).getAllByRole('listitem')).toHaveLength(2)
    expect(within(bloc).getByText('52')).toBeInTheDocument()
    expect(within(bloc).getByText('Dimanche 27 sept., 6 sur 8')).toBeInTheDocument()
    expect(within(bloc).getByText('58')).toBeInTheDocument()
    expect(within(bloc).getByText('Sam. 26 sept., 6 sur 8')).toBeInTheDocument()
    expect(within(bloc).queryByRole('link')).not.toBeInTheDocument()
  })

  it('aucun nom d’un autre ministère dans les chiffres ni dans l’église', () => {
    afficher(exempleMaSemaine())
    for (const bloc of [chiffres(), eglise()]) {
      for (const nom of ['Social', 'Coordination', 'Intégration', 'Jeunesse', 'Prodiges Junior']) {
        expect(bloc.textContent, nom).not.toContain(nom)
      }
    }
  })

  it('la carte et les chiffres par département : le ministère FIJ seul', () => {
    const { unmount } = afficher(exempleMaSemaine())
    expect(within(chiffres()).queryByText('Total de la carte des FIJ')).not.toBeInTheDocument()
    expect(within(chiffres()).queryByText('Chiffres par département saisis')).toBeNull()
    unmount()
    afficher(exempleFij())
    expect(within(chiffres()).getByText('Total de la carte des FIJ')).toBeInTheDocument()
    expect(
      within(chiffres()).getByText('8 départements sur 8, saisi le 21 sept.'),
    ).toBeInTheDocument()
    expect(within(chiffres()).getByText('Chiffres par département saisis')).toBeInTheDocument()
    expect(within(chiffres()).getByText('sur 32, dimanche 27 sept.')).toBeInTheDocument()
    expect(titres()).not.toContain('FIJ en Île-de-France')
  })

  it('premier dimanche : « Pas encore de saisie », complétude « 0 sur 8 », jamais un 0', () => {
    afficher(exemplePremierDimanche())
    expect(within(chiffres()).getAllByText('Pas encore de saisie')).toHaveLength(3)
    expect(within(eglise()).getByText('Pas encore de saisie')).toBeInTheDocument()
    expect(within(eglise()).getByText('Dimanche 27 sept., 0 sur 8')).toBeInTheDocument()
    expect(within(chiffres()).queryByText('0')).not.toBeInTheDocument()
  })
})

describe('ChargementMaSemaine', () => {
  it('les titres tout de suite, « Chargement » après 300 ms, avec aria-busy', () => {
    vi.useFakeTimers()
    const { container } = render(<ChargementMaSemaine />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Ma semaine' })).toHaveClass('sr-only')
    expect(titres()).toEqual([
      'Vos saisies',
      'Vos chiffres de la semaine',
      'Mes points',
      "Dans l'église",
    ])
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    act(() => vi.advanceTimersByTime(299))
    expect(screen.queryByText('Chargement')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('status')).toHaveTextContent('Chargement')
  })
})
