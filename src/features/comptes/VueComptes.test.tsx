import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ErreurCompte } from '@/data/comptes'
import { donneesExemple } from '@/features/comptes/apercu/exemples'
import { construireComptes } from '@/features/comptes/construireComptes'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import { VueComptes } from '@/features/comptes/VueComptes'
import type { EtatBloc } from '@/features/fiche/modeleFiche'

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

function actionsFausses(): {
  [K in keyof ActionsComptes]: ReturnType<typeof vi.fn>
} & ActionsComptes {
  return {
    creer: vi.fn(() => Promise.resolve()),
    relancer: vi.fn(() => Promise.resolve()),
    desactiver: vi.fn(() => Promise.resolve()),
    reactiver: vi.fn(() => Promise.resolve()),
    refaireActivation: vi.fn(() => Promise.resolve()),
  }
}

function afficher(etat: EtatBloc<DonneesComptes>, actions: ActionsComptes = actionsFausses()) {
  render(
    <MemoryRouter>
      <VueComptes titre="Ministères et comptes" donnees={etat} actions={actions} />
    </MemoryRouter>,
  )
  return actions
}

const bouton = (nom: string) => screen.getByRole('button', { name: nom })

describe('VueComptes (écran 13)', () => {
  it('chargement : le titre, puis « Chargement » sans bouton d’ajout', async () => {
    afficher({ etat: 'chargement' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ministères et comptes')
    expect(await screen.findByText('Chargement')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter un ministère' })).toBeNull()
  })

  it('problème passager : bandeau et « Réessayer »', async () => {
    const reessayer = vi.fn()
    afficher({ etat: 'erreur', reessayer })
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(bouton('Réessayer'))
    expect(reessayer).toHaveBeenCalled()
  })

  it('premier usage : chaque section garde son titre et dit qui agit', () => {
    afficher({
      etat: 'donnees',
      donnees: construireComptes([], [], []),
    })
    expect(screen.getByRole('region', { name: 'Ministères' })).toHaveTextContent(
      'Aucun ministère pour le moment.',
    )
    expect(screen.getByRole('region', { name: 'EJP Tech' })).toHaveTextContent(
      "Aucun compte EJP Tech pour l'instant.",
    )
    expect(bouton('Ajouter le compte du berger')).toBeInTheDocument()
  })

  it('« Relancer l’invitation » : appel avec l’identifiant, puis le message de réussite', async () => {
    const actions = afficher(donnees())
    await userEvent.click(bouton("Relancer l'invitation Conseil, compte 3"))
    expect(actions.relancer).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000014')
    expect(
      await screen.findByText('Invitation renvoyée à conseil3@exemple.test.'),
    ).toBeInTheDocument()
  })

  it('un refus d’une action directe se dit en français, sous l’introduction', async () => {
    const actions = actionsFausses()
    actions.reactiver.mockRejectedValue(new ErreurCompte('ministere_a_deja_un_compte'))
    afficher(donnees(), actions)
    await userEvent.click(bouton('Réactiver Merch'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce ministère a déjà un compte actif.',
    )
  })

  it('désactiver passe par la fenêtre ; « Annuler » n’appelle rien', async () => {
    const actions = afficher(donnees())
    await userEvent.click(bouton('Désactiver Communication'))
    const fenetre = screen.getByRole('alertdialog', { name: 'Désactiver Communication ?' })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Annuler' }))
    expect(actions.desactiver).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()

    await userEvent.click(bouton('Désactiver Communication'))
    await userEvent.click(screen.getByRole('button', { name: 'Désactiver le ministère' }))
    expect(actions.desactiver).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000001')
    expect(await screen.findByText('Ministère Communication désactivé.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('refus dans la fenêtre : elle reste ouverte avec le message', async () => {
    const actions = actionsFausses()
    actions.refaireActivation.mockRejectedValue(new ErreurCompte('propre_compte'))
    afficher(donnees(), actions)
    await userEvent.click(bouton("Refaire l'activation Berger"))
    const fenetre = screen.getByRole('alertdialog', { name: "Refaire l'activation de Berger ?" })
    await userEvent.click(within(fenetre).getByRole('button', { name: "Refaire l'activation" }))
    expect(await within(fenetre).findByRole('alert')).toHaveTextContent(
      'Cette action ne se fait pas sur votre propre compte.',
    )
  })

  it('« Ajouter un ministère » : la demande du panneau, puis le message sur la page', async () => {
    const actions = afficher(donnees())
    await userEvent.click(bouton('Ajouter un ministère'))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom du ministère' }), 'Tech')
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Email partagé du ministère' }),
      'ejptech1+ministere@exemple.test',
    )
    await userEvent.click(bouton("Créer le ministère et envoyer l'invitation"))
    expect(actions.creer).toHaveBeenCalledWith({
      type: 'ministere',
      nom: 'Tech',
      description: '',
      email: 'ejptech1+ministere@exemple.test',
    })
    expect(
      await screen.findByText(
        'Ministère Tech créé. Invitation envoyée à ejptech1+ministere@exemple.test.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ajouter un ministère' })).toBeNull()
  })

  it('adresse déjà utilisée : sous le champ, le panneau reste ouvert', async () => {
    const actions = actionsFausses()
    actions.creer.mockRejectedValue(new ErreurCompte('adresse_deja_utilisee'))
    afficher(donnees(), actions)
    await userEvent.click(bouton('Ajouter un membre du conseil'))
    expect(screen.getByText('Nom affiché : Conseil, compte 5')).toBeInTheDocument()
    const champ = screen.getByRole('textbox', { name: 'Email personnel' })
    await userEvent.type(champ, 'conseil1@exemple.test')
    await userEvent.click(bouton("Créer le compte et envoyer l'invitation"))
    expect(actions.creer).toHaveBeenCalledWith({ type: 'conseil', email: 'conseil1@exemple.test' })
    expect(champ).toHaveAccessibleDescription(
      'Cette adresse a déjà un compte. Choisissez une autre adresse.',
    )
  })
})
