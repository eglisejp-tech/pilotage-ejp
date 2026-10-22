import { act, render, screen, within } from '@testing-library/react'
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

  it('qui a accepté quelle version des conditions (T61), prénom effacé compris', () => {
    apercu()
    const actives = screen.getByRole('region', { name: 'Actives sur 30 jours' })
    expect(
      within(actives).getByText(/^Conditions du 12 octobre 2026 acceptées le 12 oct\., 9 h 30\./),
    ).toBeInTheDocument()
    expect(within(actives).getByText('Conditions pas encore acceptées.')).toBeInTheDocument()
    expect(
      within(actives).getByText(/^Conditions du 8 octobre 2026 acceptées le 8 oct\., 11 h\./),
    ).toBeInTheDocument()
    const sansActivite = screen.getByRole('region', { name: 'Sans activité depuis 30 jours' })
    expect(within(sansActivite).getByText('Conditions pas encore acceptées.')).toBeInTheDocument()
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
    expect(screen.getByText('2 prénoms ont plus de 12 mois.')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Effacer les prénoms de plus de 12 mois' }),
    )
    const fenetre = screen.getByRole('dialog', { name: 'Effacer les prénoms de plus de 12 mois' })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Effacer définitivement' }))
    expect(await screen.findByText('2 prénoms effacés.')).toBeInTheDocument()
    expect(screen.queryByText('2 prénoms ont plus de 12 mois.')).not.toBeInTheDocument()
  })

  it('une personne sans activité depuis 30 jours s’efface aussi, sans attendre les 12 mois', async () => {
    apercu()
    const sansActivite = screen.getByRole('region', { name: 'Sans activité depuis 30 jours' })
    expect(within(sansActivite).getByText('Ancien')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Actives sur 30 jours' })).queryByText('Ancien'),
    ).not.toBeInTheDocument()
    await userEvent.click(
      within(sansActivite).getByRole('button', {
        name: 'Effacer ce prénom (Ancien, Ministère Intégration)',
      }),
    )
    const fenetre = screen.getByRole('dialog', { name: 'Effacer ce prénom' })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Effacer définitivement' }))
    expect(await screen.findByText('Prénom effacé.')).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Sans activité depuis 30 jours' }),
    ).not.toBeInTheDocument()
  })

  it.each([
    ['une coupure', new TypeError('Failed to fetch'), 'La connexion a échoué. Réessayez.'],
    [
      'un prénom déjà effacé ailleurs',
      { code: 'P0001', message: 'Prénom introuvable ou déjà effacé.' },
      'Prénom introuvable ou déjà effacé.',
    ],
    [
      'une connexion expirée',
      { code: '42501', message: 'Double authentification requise.' },
      'Votre connexion a expiré. Reconnectez-vous.',
    ],
    [
      'un refus inattendu',
      { code: '23505', message: 'duplicate key value' },
      "L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech.",
    ],
  ])(
    'un échec de l’effacement reste dans la fenêtre : %s, par la table (m270)',
    async (_cas, erreur, phrase) => {
      const actions: ActionsPersonnes = {
        afficherPlus: vi.fn(),
        effacer: vi.fn(() => Promise.reject(erreur)),
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
                      conditions: 'Conditions pas encore acceptées.',
                    },
                  ],
                },
              ],
              sansActivite: [],
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
      expect(await screen.findByRole('alert')).toHaveTextContent(phrase)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    },
  )

  it('« Chargement des personnes », puis « Chargement plus long que d’habitude » après 4 s (m248, T65)', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(
        <VuePersonnes
          titre="Personnes"
          resultat={{ etat: 'chargement' }}
          actions={{ afficherPlus: vi.fn(), effacer: vi.fn(), effacerAnciens: vi.fn() }}
        />,
      )
      const attente = container.querySelector<HTMLElement>('[aria-busy="true"]')
      expect(attente).not.toBeNull()
      // La zone status de l'indicateur, juste avant les places qui attendent, n'est dans aucun
      // élément occupé : son texte est annoncé (T65).
      const zone = attente?.previousElementSibling as HTMLElement
      expect(zone).toHaveAttribute('role', 'status')
      expect(zone.closest('[aria-busy="true"]')).toBeNull()
      expect(zone).toBeEmptyDOMElement()
      act(() => vi.advanceTimersByTime(300))
      expect(zone).toHaveTextContent(/^Chargement des personnes$/)
      act(() => vi.advanceTimersByTime(3_700))
      expect(zone).toHaveTextContent("Chargement plus long que d'habitude")
    } finally {
      vi.useRealTimers()
    }
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
