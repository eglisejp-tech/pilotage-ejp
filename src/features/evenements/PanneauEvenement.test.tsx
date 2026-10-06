import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import { PanneauReunion } from '@/features/evenements/PanneauReunion'

function afficher(contenu: ContenuPanneauEvenement) {
  render(
    <MemoryRouter>
      <PanneauEvenement contenu={contenu} onFermer={() => undefined} />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

const titre = () => screen.getByRole('heading', { level: 1 })

describe('états du panneau d’événement (T36)', () => {
  it('aucun résultat : la phrase et « Revenir à ma fiche », sans formulaire', () => {
    afficher({ etat: 'introuvable' })
    expect(titre()).toHaveTextContent("Mettre à jour l'événement")
    expect(
      screen.getByText("Cet événement n'existe pas ou vous n'y avez pas accès."),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à ma fiche' })).toHaveAttribute(
      'href',
      '/ma-fiche',
    )
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('pas pour ce profil : un ministère mentionné lit qui met à jour, sans formulaire', () => {
    afficher({ etat: 'pas_porteur', nomPorteur: 'Coordination' })
    expect(screen.getByText('Seul Coordination met à jour cet événement.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à ma fiche' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull()
  })

  it('problème passager : annoncé, « Réessayer » relance les lectures', async () => {
    const reessayer = vi.fn()
    afficher({ etat: 'probleme', mode: 'ajout', reessayer })
    expect(titre()).toHaveTextContent('Ajouter un événement')
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })

  it('chargement : le titre tout de suite, « Chargement » après 300 ms', () => {
    vi.useFakeTimers()
    afficher({ etat: 'chargement', mode: 'mise_a_jour' })
    expect(titre()).toHaveTextContent("Mettre à jour l'événement")
    expect(screen.queryByText('Chargement')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByText('Chargement')).toBeInTheDocument()
  })
})

describe('états du panneau « Prochaine réunion »', () => {
  it('problème passager avec « Réessayer », le titre gardé', async () => {
    const reessayer = vi.fn()
    render(
      <MemoryRouter>
        <PanneauReunion contenu={{ etat: 'probleme', reessayer }} onFermer={() => undefined} />
      </MemoryRouter>,
    )
    expect(titre()).toHaveTextContent('Prochaine réunion')
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })
})
