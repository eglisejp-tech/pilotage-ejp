import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
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
})
