import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EtatVide } from '@/components/etats/EtatVide'
import { SITUATIONS_VIDES } from '@/components/etats/situations'

function afficher(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('EtatVide', () => {
  it('connaît les six situations de T36', () => {
    expect(SITUATIONS_VIDES).toEqual([
      'premier_usage',
      'en_attente_des_autres',
      'tout_est_fait',
      'aucun_resultat',
      'pas_pour_ce_profil',
      'probleme_passager',
    ])
  })

  it.each(SITUATIONS_VIDES)('%s : une phrase complète, rangée dans sa situation', (situation) => {
    const { container } = afficher(<EtatVide situation={situation}>Aucun point ouvert.</EtatVide>)
    expect(screen.getByText('Aucun point ouvert.')).toBeInTheDocument()
    expect(container.querySelector(`[data-situation="${situation}"]`)).not.toBeNull()
    // Une phrase, jamais d'action par défaut.
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('annonce seulement le problème passager (role alert)', () => {
    for (const situation of SITUATIONS_VIDES) {
      const { unmount } = afficher(<EtatVide situation={situation}>Message.</EtatVide>)
      if (situation === 'probleme_passager') {
        expect(screen.getByRole('alert')).toHaveTextContent('Message.')
      } else {
        expect(screen.queryByRole('alert')).toBeNull()
      }
      unmount()
    }
  })

  it('dit ce qui viendra, ou qui doit agir, sous la phrase', () => {
    afficher(
      <EtatVide
        situation="premier_usage"
        suite="L'administration de l'église déclare les sessions."
      >
        Aucune session déclarée.
      </EtatVide>,
    )
    expect(screen.getByText('Aucune session déclarée.')).toBeInTheDocument()
    expect(
      screen.getByText("L'administration de l'église déclare les sessions."),
    ).toBeInTheDocument()
  })

  it('montre une action qui ouvre une page, au profil qui peut agir', () => {
    afficher(
      <EtatVide
        situation="premier_usage"
        action={{ libelle: 'Ajouter un événement', vers: '/saisir/evenement' }}
      >
        Aucun événement prévu.
      </EtatVide>,
    )
    expect(screen.getByRole('link', { name: 'Ajouter un événement' })).toHaveAttribute(
      'href',
      '/saisir/evenement',
    )
  })

  it('montre une action qui lance un traitement, et la déclenche au clic', async () => {
    const surClic = vi.fn()
    afficher(
      <EtatVide situation="probleme_passager" action={{ libelle: 'Réessayer', surClic }}>
        La connexion a échoué. Réessayez.
      </EtatVide>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(surClic).toHaveBeenCalledTimes(1)
  })

  it('cache l’action au profil qui ne peut pas agir, et garde la phrase', () => {
    afficher(
      <EtatVide
        situation="en_attente_des_autres"
        peutAgir={false}
        action={{ libelle: 'Saisir la carte', vers: '/saisir/fij' }}
      >
        La carte s'affichera quand FIJ aura saisi ses chiffres.
      </EtatVide>,
    )
    expect(
      screen.getByText("La carte s'affichera quand FIJ aura saisi ses chiffres."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
