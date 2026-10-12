import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApercuPersonnes } from '@/features/personnes/apercu/ApercuPersonnes'
import { VuePersonnes } from '@/features/personnes/VuePersonnes'
import type { ActionsPersonnes } from '@/features/personnes/usePersonnes'

function apercu(adresse = '/apercu/personnes') {
  render(
    <MemoryRouter initialEntries={[adresse]}>
      <Routes>
        <Route path="/apercu/personnes" element={<ApercuPersonnes />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('onglet « Personnes » d’EJP Tech (T56)', () => {
  it('le titre, les personnes actives par compte et les dernières connexions', () => {
    apercu()
    expect(screen.getByRole('heading', { level: 1, name: 'Personnes' })).toBeInTheDocument()
    expect(document.title).toBe('Personnes, Pilotage EJP')
    const actives = screen.getByRole('region', { name: 'Actives sur 30 jours' })
    expect(
      within(actives).getByRole('heading', { level: 3, name: 'Ministère Communication' }),
    ).toBeInTheDocument()
    expect(within(actives).getByText('Marie D.')).toBeInTheDocument()
    expect(within(actives).getAllByText("Jours d'utilisation").length).toBeGreaterThan(0)
    const connexions = screen.getByRole('region', { name: 'Dernières connexions' })
    expect(within(connexions).getAllByRole('listitem')).toHaveLength(50)
    expect(
      within(connexions).getByText('Dim. 11 oct., 11 h : Ministère Communication, Marie D.'),
    ).toBeInTheDocument()
  })

  it('« Afficher 50 de plus » ajoute les connexions suivantes', async () => {
    apercu()
    await userEvent.click(screen.getByRole('button', { name: 'Afficher 50 de plus' }))
    const connexions = screen.getByRole('region', { name: 'Dernières connexions' })
    expect(within(connexions).getAllByRole('listitem')).toHaveLength(55)
    expect(screen.queryByRole('button', { name: 'Afficher 50 de plus' })).not.toBeInTheDocument()
  })

  it('« Effacer ce prénom » : la fenêtre, puis « Effacer définitivement » et « Prénom effacé. »', async () => {
    apercu()
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Effacer ce prénom (Marie D., Ministère Communication)',
      }),
    )
    const fenetre = screen.getByRole('dialog', { name: 'Effacer ce prénom' })
    expect(fenetre).toHaveTextContent('Marie D., Ministère Communication')
    expect(fenetre).toHaveTextContent(
      'Ce prénom sera remplacé par « [prénom effacé] » partout. Cette action ne peut pas être annulée.',
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Effacer définitivement' }))
    expect(await screen.findByText('Prénom effacé.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Effacer ce prénom (Marie D., Ministère Communication)',
      }),
    ).not.toBeInTheDocument()
  })

  it('« Annuler » ferme la fenêtre sans rien effacer', async () => {
    apercu()
    await userEvent.click(
      screen.getByRole('button', { name: 'Effacer ce prénom (Paul, Ministère Communication)' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Paul')).toBeInTheDocument()
  })

  it('les prénoms de plus de 12 mois : la phrase, le bouton, puis le nombre effacé', async () => {
    apercu()
    expect(screen.getByText('3 prénoms ont plus de 12 mois.')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Effacer les prénoms de plus de 12 mois' }),
    )
    const fenetre = screen.getByRole('dialog', { name: 'Effacer les prénoms de plus de 12 mois' })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Effacer définitivement' }))
    expect(await screen.findByText('3 prénoms effacés.')).toBeInTheDocument()
    expect(screen.queryByText('3 prénoms ont plus de 12 mois.')).not.toBeInTheDocument()
  })

  it('un échec de l’effacement reste dans la fenêtre', async () => {
    const actions: ActionsPersonnes = {
      afficherPlus: vi.fn(),
      effacer: vi.fn(() => Promise.reject(new Error('refus'))),
      effacerAnciens: vi.fn(() => Promise.resolve(0)),
    }
    render(
      <VuePersonnes
        titre="Personnes"
        actions={actions}
        resultat={{
          etat: 'pret',
          donnees: {
            actives: [
              {
                compte: 'c1',
                libelle: 'Ministère Communication',
                personnes: [
                  {
                    intervenantId: 1,
                    prenom: 'Marie',
                    efface: false,
                    connexions: 1,
                    jours: 1,
                    actions: 0,
                    derniereActivite: '11 oct., 11 h',
                  },
                ],
              },
            ],
            aEffacer: 0,
            connexions: [],
            aPlus: false,
            plusEnCours: false,
          },
        }}
      />,
    )
    expect(screen.getByText('Aucune connexion pour le moment.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Effacer ce prénom/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Effacer définitivement' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('vide, chargement et erreur', () => {
    apercu('/apercu/personnes?etat=vide')
    expect(
      screen.getByText("Personne n'a utilisé un compte de ministère depuis 30 jours."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/plus de 12 mois/)).not.toBeInTheDocument()
  })

  it('erreur de lecture : « Réessayer »', async () => {
    const reessayer = vi.fn()
    render(
      <VuePersonnes
        titre="Personnes"
        resultat={{ etat: 'erreur', reessayer }}
        actions={{
          afficherPlus: vi.fn(),
          effacer: vi.fn(),
          effacerAnciens: vi.fn(),
        }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })
})
