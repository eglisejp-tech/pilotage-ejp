import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EtatVide } from '@/components/etats/EtatVide'
import { SITUATIONS_VIDES } from '@/components/etats/situations'

function afficher(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

/** Une lecture qui échoue toujours : « Réessayer » passe par « Chargement », puis l'échec revient. */
function LectureEnEchec() {
  const [enCours, setEnCours] = useState(false)
  if (enCours) {
    return (
      <button type="button" onClick={() => setEnCours(false)}>
        Fin du nouvel essai
      </button>
    )
  }
  return (
    <EtatVide
      situation="probleme_passager"
      action={{ libelle: 'Réessayer', surClic: () => setEnCours(true) }}
    >
      La connexion a échoué. Réessayez.
    </EtatVide>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EtatVide, problème passager qui revient (m250)', () => {
  it('premier échec : la phrase commune ; échec après « Réessayer » : la phrase et le recours', async () => {
    const utilisateur = userEvent.setup()
    afficher(<LectureEnEchec />)
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('EJP Tech')
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Fin du nouvel essai' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Réessayez, et si le problème revient, prévenez EJP Tech.',
    )
  })

  it('un échec bien après le dernier « Réessayer » reprend la phrase commune', async () => {
    const utilisateur = userEvent.setup()
    const maintenant = Date.now()
    afficher(<LectureEnEchec />)
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    vi.spyOn(Date, 'now').mockReturnValue(maintenant + 60_000)
    await utilisateur.click(screen.getByRole('button', { name: 'Fin du nouvel essai' }))
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('EJP Tech')
  })

  it('le « Réessayer » sert au seul écran d’erreur qui le suit : un autre échec garde la phrase commune', async () => {
    const utilisateur = userEvent.setup()
    const { unmount } = afficher(<LectureEnEchec />)
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Fin du nouvel essai' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/prévenez EJP Tech\.$/)
    unmount()
    // Un autre bloc de la même page échoue ensuite pour la première fois.
    afficher(
      <EtatVide situation="probleme_passager" action={{ libelle: 'Réessayer', surClic: vi.fn() }}>
        La connexion a échoué. Réessayez.
      </EtatVide>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/^La connexion a échoué\. Réessayez\.$/)
  })

  it('un « Réessayer » qui a réussi ne change pas le premier échec d’une autre page', async () => {
    const utilisateur = userEvent.setup()
    const { unmount } = afficher(<LectureEnEchec />)
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    unmount()
    window.history.pushState({}, '', '/autre-page')
    try {
      afficher(
        <EtatVide situation="probleme_passager" action={{ libelle: 'Réessayer', surClic: vi.fn() }}>
          La connexion a échoué. Réessayez.
        </EtatVide>,
      )
      expect(screen.getByRole('alert')).not.toHaveTextContent('EJP Tech')
    } finally {
      window.history.pushState({}, '', '/')
    }
  })

  it('une phrase propre à l’écran reste telle quelle', async () => {
    const utilisateur = userEvent.setup()
    const surClic = vi.fn()
    afficher(
      <EtatVide situation="probleme_passager" action={{ libelle: 'Réessayer', surClic }}>
        La connexion a échoué.
      </EtatVide>,
    )
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(surClic).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent(/^La connexion a échoué\.$/)
  })
})

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
