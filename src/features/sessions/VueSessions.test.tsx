import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  AUJOURDHUI_APERCU,
  donneesExemple,
  MINISTERES_APERCU,
} from '@/features/sessions/apercu/exemples'
import { construireLignesSessions } from '@/features/sessions/construire'
import type { ActionsSessions, DonneesSessions } from '@/features/sessions/types'
import { VueSessions } from '@/features/sessions/VueSessions'
import type { EtatBloc } from '@/features/fiche/modeleFiche'

function donnees(vide = false): EtatBloc<DonneesSessions> {
  return {
    etat: 'donnees',
    donnees: {
      lignes: vide
        ? []
        : construireLignesSessions(donneesExemple().sessions.map(({ ligne }) => ligne)),
      ministeres: MINISTERES_APERCU,
      aujourdhui: AUJOURDHUI_APERCU,
    },
  }
}

function actionsFausses() {
  return {
    declarer: vi.fn(() => Promise.resolve('id')),
    modifier: vi.fn(() => Promise.resolve()),
    supprimer: vi.fn(() => Promise.resolve()),
    lireAttendus: vi.fn(() => Promise.resolve(MINISTERES_APERCU.slice(0, 3).map(({ id }) => id))),
  } satisfies ActionsSessions
}

function afficher(etat: EtatBloc<DonneesSessions>, actions: ActionsSessions = actionsFausses()) {
  render(
    <MemoryRouter>
      <VueSessions titre="Sessions" donnees={etat} actions={actions} />
    </MemoryRouter>,
  )
  return actions
}

describe('VueSessions (écran 14)', () => {
  it('liste les sessions déclarées avec leur complétude et les ministères qui manquent', () => {
    afficher(donnees())
    expect(screen.getByRole('heading', { level: 1, name: 'Sessions' })).toBeInTheDocument()
    const liste = screen.getByRole('region', { name: 'Sessions déclarées' })
    expect(within(liste).getByText('Pas encore eu lieu')).toBeInTheDocument()
    expect(within(liste).getByText('6 sur 8')).toBeInTheDocument()
    expect(within(liste).getByText('Manquent : Intégration et Social')).toBeInTheDocument()
    expect(within(liste).getAllByText('8 sur 8')).toHaveLength(4)
  })

  it('état vide : la phrase, sans tableau', () => {
    afficher(donnees(true))
    expect(
      screen.getByText('Aucune session déclarée. Déclarez la première avec le panneau.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('« Supprimer » n’est proposé que pour une session sans saisie', () => {
    afficher(donnees())
    expect(screen.getAllByRole('button', { name: /^Supprimer / })).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Supprimer Anti-Dispersion du 10 oct.' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Modifier / })).toHaveLength(6)
  })

  it('déclare : Bâtir l’Église et les 8 ministères cochés par défaut, puis le message de réussite', async () => {
    const actions = afficher(donnees(true))
    const colonne = screen.getByRole('complementary', { name: 'Déclarer une session' })
    expect(within(colonne).getByText('8 sur 8')).toBeInTheDocument()
    expect(within(colonne).getByRole('radio', { name: "Bâtir l'Église" })).toBeChecked()
    expect(within(colonne).getAllByRole('checkbox')).toHaveLength(8)
    expect(within(colonne).getByLabelText(/^Date/)).toHaveValue('2026-10-10')
    await userEvent.click(within(colonne).getByRole('checkbox', { name: 'Social' }))
    expect(within(colonne).getByText('7 sur 8')).toBeInTheDocument()
    await userEvent.click(within(colonne).getByRole('button', { name: 'Déclarer la session' }))
    await waitFor(() => expect(actions.declarer).toHaveBeenCalledTimes(1))
    expect(actions.declarer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'batir',
        date: '2026-10-10',
        ministeres: MINISTERES_APERCU.slice(0, 7).map(({ id }) => id),
      }),
    )
    expect(await screen.findByText("Session Bâtir l'Église du 10 oct. déclarée.")).toBeVisible()
    // Le formulaire revient à son état de départ.
    expect(within(colonne).getByText('8 sur 8')).toBeInTheDocument()
  })

  it('« Autre rassemblement » demande un nom, avec le rappel une seule fois', async () => {
    const actions = afficher(donnees(true))
    const colonne = screen.getByRole('complementary', { name: 'Déclarer une session' })
    expect(within(colonne).queryByLabelText('Nom du rassemblement')).toBeNull()
    await userEvent.click(within(colonne).getByRole('radio', { name: 'Autre rassemblement' }))
    expect(within(colonne).getByLabelText('Nom du rassemblement')).toBeInTheDocument()
    expect(screen.getAllByText(/N'écrivez aucun nom ni information personnelle/)).toHaveLength(1)
    await userEvent.click(within(colonne).getByRole('button', { name: 'Déclarer la session' }))
    expect(await within(colonne).findByText('Donnez un nom au rassemblement.')).toBeInTheDocument()
    expect(actions.declarer).not.toHaveBeenCalled()
  })

  it('refuse sans ministère coché, sans appeler la base', async () => {
    const actions = afficher(donnees(true))
    const colonne = screen.getByRole('complementary', { name: 'Déclarer une session' })
    for (const caseACocher of within(colonne).getAllByRole('checkbox')) {
      await userEvent.click(caseACocher)
    }
    await userEvent.click(within(colonne).getByRole('button', { name: 'Déclarer la session' }))
    expect(await within(colonne).findByText('Cochez au moins un ministère.')).toBeInTheDocument()
    expect(actions.declarer).not.toHaveBeenCalled()
  })

  it('dit sous le bouton le refus de la base et garde les valeurs', async () => {
    const actions = actionsFausses()
    actions.declarer.mockRejectedValueOnce({
      code: 'P0001',
      message: "Une session Bâtir l'Église est déjà déclarée le samedi 10 octobre.",
    })
    afficher(donnees(true), actions)
    const colonne = screen.getByRole('complementary', { name: 'Déclarer une session' })
    await userEvent.click(within(colonne).getByRole('checkbox', { name: 'Social' }))
    await userEvent.click(within(colonne).getByRole('button', { name: 'Déclarer la session' }))
    expect(await within(colonne).findByRole('alert')).toHaveTextContent(
      "Une session Bâtir l'Église est déjà déclarée le samedi 10 octobre.",
    )
    expect(within(colonne).getByText('7 sur 8')).toBeInTheDocument()
  })

  it('modifie les ministères attendus : le panneau se préremplit puis enregistre', async () => {
    const actions = afficher(donnees())
    await userEvent.click(screen.getByRole('button', { name: "Modifier Bâtir l'Église du 3 oct." }))
    const panneau = await screen.findByRole('dialog', {
      name: "Modifier Bâtir l'Église du 3 oct.",
    })
    expect(await within(panneau).findByText('3 sur 8')).toBeInTheDocument()
    expect(within(panneau).queryByRole('radio')).toBeNull()
    await userEvent.click(within(panneau).getByRole('checkbox', { name: 'Social' }))
    await userEvent.click(
      within(panneau).getByRole('button', { name: 'Enregistrer les ministères attendus' }),
    )
    await waitFor(() =>
      expect(actions.modifier).toHaveBeenCalledWith(
        expect.stringMatching(/^20000000-/),
        expect.arrayContaining([MINISTERES_APERCU[0]!.id, MINISTERES_APERCU[7]!.id]),
      ),
    )
    expect(
      await screen.findByText("Ministères attendus de Bâtir l'Église du 3 oct. enregistrés."),
    ).toBeVisible()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('supprime après confirmation, et dit le refus de la base dans la fenêtre', async () => {
    const actions = actionsFausses()
    actions.supprimer.mockRejectedValueOnce({
      code: 'P0001',
      message: 'Des ministères ont déjà saisi : la session ne peut plus être supprimée.',
    })
    afficher(donnees(), actions)
    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer Anti-Dispersion du 10 oct.' }),
    )
    const fenetre = screen.getByRole('alertdialog', {
      name: 'Supprimer Anti-Dispersion du 10 oct. ?',
    })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Supprimer la session' }))
    expect(await within(fenetre).findByRole('alert')).toHaveTextContent(
      'Des ministères ont déjà saisi : la session ne peut plus être supprimée.',
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Supprimer la session' }))
    await waitFor(() => expect(actions.supprimer).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Session Anti-Dispersion du 10 oct. supprimée.')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('chargement et problème passager : pas de formulaire', () => {
    const { unmount } = render(
      <MemoryRouter>
        <VueSessions titre="Sessions" donnees={{ etat: 'chargement' }} actions={actionsFausses()} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('complementary')).toBeNull()
    unmount()
    afficher({ etat: 'erreur', reessayer: vi.fn() })
    expect(screen.getByText('La connexion a échoué. Réessayez.')).toBeInTheDocument()
  })
})
