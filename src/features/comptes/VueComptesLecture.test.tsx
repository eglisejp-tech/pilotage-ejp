// Décision T60 : EJP Tech gère seul les ministères et les comptes ; l'administration de l'église
// lit le même écran 13, sans aucun bouton d'action, avec la phrase qui le dit.
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { donneesExemple } from '@/features/comptes/apercu/exemples'
import { construireComptes } from '@/features/comptes/construireComptes'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import { VueComptes } from '@/features/comptes/VueComptes'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { simulerLargeur } from '@/test/largeur'

function donnees(): EtatBloc<DonneesComptes> {
  const exemple = donneesExemple()
  return {
    etat: 'donnees',
    donnees: construireComptes(
      exemple.comptes.map((compte) => compte.ligne),
      exemple.ministeres,
      exemple.indicateurs,
    ),
  }
}

function afficherEnLecture(etat: EtatBloc<DonneesComptes>) {
  const actions = {
    creer: vi.fn(() => Promise.resolve()),
    relancer: vi.fn(() => Promise.resolve()),
    desactiver: vi.fn(() => Promise.resolve()),
    reactiver: vi.fn(() => Promise.resolve()),
    refaireActivation: vi.fn(() => Promise.resolve()),
  } satisfies ActionsComptes
  render(
    <MemoryRouter>
      <VueComptes titre="Ministères et comptes" donnees={etat} actions={actions} lectureSeule />
    </MemoryRouter>,
  )
  return actions
}

/** Seules les aides (« ? ») sont des boutons : aucun ajout, aucune action de ligne. */
function seulementDesAides() {
  expect(screen.queryAllByRole('button')).toEqual(
    screen.queryAllByRole('button', { name: /^Aide/ }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VueComptes (écran 13), administration de l’église en lecture', () => {
  it('la phrase qui dit qu’EJP Tech gère, puis les mêmes sections, sans aucun bouton', () => {
    const actions = afficherEnLecture(donnees())
    expect(
      screen.getByText(
        'EJP Tech crée et gère les ministères et les comptes. Adressez-lui vos demandes.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Les comptes sont créés ici/)).toBeNull()
    for (const nom of ['Ministères', 'Berger et conseil', 'EJP Tech', 'Listes']) {
      expect(screen.getByRole('region', { name: nom })).toBeInTheDocument()
    }
    // Les comptes et leurs états se lisent.
    expect(screen.getByRole('region', { name: 'Ministères' })).toHaveTextContent(
      'communication@exemple.test',
    )
    expect(screen.getAllByText('Invitation envoyée').length).toBeGreaterThan(0)
    // Aucun bouton d'action, ni d'ajout ni de ligne ; aucune colonne d'actions.
    seulementDesAides()
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).toBeNull()
    expect(screen.queryByText('Votre compte')).toBeNull()
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
    // « Listes » : la demande de changement va à EJP Tech.
    expect(screen.getByRole('region', { name: 'Listes' })).toHaveTextContent(
      "Liste commune à toute l'église. Pour la changer, faites une demande à EJP Tech.",
    )
  })

  it('la note renvoie à l’écran Indicateurs pour lire, pas pour changer', () => {
    afficherEnLecture(donnees())
    expect(
      screen.getByText(/Pour lire les indicateurs de chaque ministère, ouvrez/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "l'écran Indicateurs" })).toHaveAttribute(
      'href',
      '/indicateurs',
    )
  })

  it('premier usage : qui agit, sans bouton', () => {
    afficherEnLecture({ etat: 'donnees', donnees: construireComptes([], [], []) })
    expect(screen.getByRole('region', { name: 'Ministères' })).toHaveTextContent(
      'EJP Tech ajoute les ministères.',
    )
    expect(screen.getByRole('region', { name: 'EJP Tech' })).toHaveTextContent(
      "Le premier compte EJP Tech se crée à l'installation de l'outil.",
    )
    seulementDesAides()
  })

  it('sous 600 px aussi, les blocs n’ont aucun bouton, « Créer le compte » compris', () => {
    simulerLargeur(390)
    const actions = afficherEnLecture(donnees())
    expect(screen.queryByRole('table')).toBeNull()
    // Coordination n'a pas de compte : en gestion, son bloc aurait « Créer le compte ».
    expect(screen.getByRole('region', { name: 'Ministères' })).toHaveTextContent(
      'Pas encore de compte',
    )
    seulementDesAides()
    for (const action of Object.values(actions)) expect(action).not.toHaveBeenCalled()
  })

  it('premier usage sous 600 px : ni « Ajouter un ministère », ni ajout du berger ou du conseil', () => {
    simulerLargeur(390)
    afficherEnLecture({ etat: 'donnees', donnees: construireComptes([], [], []) })
    seulementDesAides()
  })
})
