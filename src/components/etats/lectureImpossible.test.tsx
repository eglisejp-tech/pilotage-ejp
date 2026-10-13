import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EtatVide } from '@/components/etats/EtatVide'
import { EcranErreurSession } from '@/features/session/EcranErreurSession'
import { ErreurDePage } from '@/pages/ErreurDePage'

const PHRASE = 'La connexion a échoué. Réessayez.'
const RECOURS = 'La connexion a échoué. Réessayez, et si le problème revient, prévenez EJP Tech.'

/** L'écran de session reste affiché pendant le nouvel essai, qui échoue encore. */
function SessionEnEchec() {
  const [enCours, setEnCours] = useState(false)
  return (
    <>
      <EcranErreurSession enCours={enCours} onRetry={() => setEnCours(true)} />
      <button type="button" onClick={() => setEnCours(false)}>
        Fin du nouvel essai
      </button>
    </>
  )
}

/** Une page dont la lecture échoue toujours : « Réessayer » repasse par « Chargement ». */
function PageEnEchec() {
  const [enCours, setEnCours] = useState(false)
  if (enCours) {
    return (
      <button type="button" onClick={() => setEnCours(false)}>
        Fin du nouvel essai
      </button>
    )
  }
  return (
    <ErreurDePage message={PHRASE} libelleBouton="Réessayer" onReessayer={() => setEnCours(true)} />
  )
}

describe('lecture impossible qui revient après « Réessayer » (m250)', () => {
  it('écran « Connexion impossible » : la phrase commune, puis le recours vers EJP Tech', async () => {
    const utilisateur = userEvent.setup()
    render(<SessionEnEchec />)
    expect(screen.getByRole('alert')).toHaveTextContent(PHRASE)
    expect(screen.getByRole('alert')).not.toHaveTextContent('EJP Tech')
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Fin du nouvel essai' }))
    expect(screen.getByRole('alert')).toHaveTextContent(RECOURS)
  })

  it('erreur de page : le recours après un nouvel échec, jamais au premier', async () => {
    const utilisateur = userEvent.setup()
    const reessayer = vi.fn()
    const { unmount } = render(
      <ErreurDePage message={PHRASE} libelleBouton="Réessayer" onReessayer={reessayer} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(new RegExp(`^${PHRASE}$`))
    unmount()
    render(<PageEnEchec />)
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Fin du nouvel essai' }))
    expect(screen.getByRole('alert')).toHaveTextContent(RECOURS)
  })

  it('un nouvel essai lent (un échec près de 10 s, la relance, un second délai) garde le recours', async () => {
    const utilisateur = userEvent.setup()
    let maintenant = Date.parse('2026-10-13T10:00:00Z')
    const horloge = vi.spyOn(Date, 'now').mockImplementation(() => maintenant)
    try {
      render(<PageEnEchec />)
      await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
      // Premier essai : 9,9 s ; relance après 1 s ; second essai : 10 s (délai maximal).
      maintenant += 9_900 + 1_000 + 10_000
      await utilisateur.click(screen.getByRole('button', { name: 'Fin du nouvel essai' }))
      expect(screen.getByRole('alert')).toHaveTextContent(RECOURS)
    } finally {
      horloge.mockRestore()
    }
  })

  it('un état vide ordinaire affiché après « Réessayer » ne consomme pas le nouvel essai', async () => {
    const utilisateur = userEvent.setup()
    // Pendant le nouvel essai, un bloc voisin affiche son état vide ; puis la lecture échoue.
    function PageEtBloc() {
      const [etape, setEtape] = useState<'echec' | 'essai' | 'vide' | 'nouvel-echec'>('echec')
      if (etape === 'echec') {
        return (
          <ErreurDePage
            message={PHRASE}
            libelleBouton="Réessayer"
            onReessayer={() => setEtape('essai')}
          />
        )
      }
      return (
        <>
          {etape === 'essai' ? (
            <button type="button" onClick={() => setEtape('vide')}>
              Bloc voisin lu
            </button>
          ) : (
            <EtatVide situation="premier_usage">Aucun point ouvert.</EtatVide>
          )}
          {etape === 'vide' ? (
            <button type="button" onClick={() => setEtape('nouvel-echec')}>
              Fin du nouvel essai
            </button>
          ) : null}
          {etape === 'nouvel-echec' ? (
            <EtatVide situation="probleme_passager">{PHRASE}</EtatVide>
          ) : null}
        </>
      )
    }
    render(<PageEtBloc />)
    await utilisateur.click(screen.getByRole('button', { name: 'Réessayer' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Bloc voisin lu' }))
    expect(screen.getByText('Aucun point ouvert.')).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('button', { name: 'Fin du nouvel essai' }))
    expect(screen.getByRole('alert')).toHaveTextContent(RECOURS)
  })
})
