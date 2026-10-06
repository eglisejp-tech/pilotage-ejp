import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SAISIE_SESSION_EXEMPLE,
  SESSION_EXEMPLE,
  SESSIONS_A_CHOISIR,
} from '@/features/saisie-fij/apercu/exemplesE4'
import { ChoixSession } from '@/features/saisie-session/ChoixSession'
import { FormulaireSession } from '@/features/saisie-session/FormulaireSession'
import type { SaisieParticipation } from '@/features/saisie-session/schemas'
import type { PresencePrecedente } from '@/features/saisie-session/session'

afterEach(() => {
  vi.restoreAllMocks()
})

function afficher(
  enregistrer: (saisie: SaisieParticipation) => Promise<void> = () => Promise.resolve(),
  dejaSaisi: typeof SAISIE_SESSION_EXEMPLE | null = null,
  precedente: PresencePrecedente | null = { presents: 12 },
) {
  render(
    <MemoryRouter>
      <FormulaireSession
        session={SESSION_EXEMPLE}
        ministereId="m1"
        precedente={precedente}
        dejaSaisi={dejaSaisi}
        enregistrer={enregistrer}
      />
    </MemoryRouter>,
  )
  return {
    presents: screen.getByLabelText('STARs de votre ministère présents'),
    dejaComptes: screen.getByLabelText('Dont déjà comptés par leur ministère principal'),
  }
}

describe('FormulaireSession (maquette 09)', () => {
  it('montre la session précédente, les deux champs, la complétude et ses manquants', () => {
    const { dejaComptes } = afficher()
    expect(screen.getByText('Session précédente : 12')).toBeInTheDocument()
    expect(dejaComptes).toHaveValue('0')
    expect(screen.getByText('Coordination et Intégration')).toHaveClass('text-attention')
    expect(
      screen.getByText('Un nombre de personnes seulement, jamais de noms.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_session',
    )
  })

  it('session précédente non saisie par le ministère : « non saisie », sans la cacher', () => {
    afficher(undefined, null, { presents: null })
    expect(screen.getByText('Session précédente : non saisie')).toBeInTheDocument()
  })

  it('aucune session précédente : pas de note', () => {
    afficher(undefined, null, null)
    expect(screen.queryByText(/^Session précédente/)).toBeNull()
  })

  it('trois aides au plus, celles du document des aides', () => {
    afficher()
    expect(
      screen.getAllByRole('button', { name: /^Aide : / }).map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'Aide : STARs de votre ministère présents',
      'Aide : Dont déjà comptés par leur ministère principal',
      'Aide : Ministères qui ont déjà saisi',
    ])
  })

  it('calcule en direct « Comptés dans le total de l’église : 11. »', async () => {
    const utilisateur = userEvent.setup()
    const { presents, dejaComptes } = afficher()
    await utilisateur.type(presents, '13')
    await utilisateur.clear(dejaComptes)
    await utilisateur.type(dejaComptes, '2')
    expect(screen.getByText("Comptés dans le total de l'église : 11.")).toBeInTheDocument()
  })

  it('refuse plus de déjà comptés que de présents, sans envoi', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    const { presents, dejaComptes } = afficher(enregistrer)
    await utilisateur.type(presents, '3')
    await utilisateur.clear(dejaComptes)
    await utilisateur.type(dejaComptes, '5')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la présence' }))
    expect(screen.getByText('Ce nombre ne peut pas dépasser les présents.')).toBeInTheDocument()
    expect(dejaComptes).toHaveFocus()
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('déjà comptés au-delà des présents : la ligne du total dit « à corriger », pas l’inverse', async () => {
    const utilisateur = userEvent.setup()
    const { presents, dejaComptes } = afficher()
    expect(
      screen.getByText("Comptés dans le total de l'église : saisissez d'abord les présents."),
    ).toBeInTheDocument()
    await utilisateur.type(presents, '3')
    await utilisateur.clear(dejaComptes)
    await utilisateur.type(dejaComptes, '5')
    expect(screen.getByText("Comptés dans le total de l'église : à corriger.")).toBeInTheDocument()
    expect(screen.queryByText(/saisissez d'abord les présents/)).toBeNull()
  })

  it('second appui après une réussite : rien n’est renvoyé, la phrase le dit', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    const { presents } = afficher(enregistrer)
    await utilisateur.type(presents, '13')
    const bouton = screen.getByRole('button', { name: 'Enregistrer la présence' })
    await utilisateur.click(bouton)
    await screen.findByText("Présence enregistrée pour Bâtir l'Église du 26 sept.")
    expect(bouton).toHaveAttribute('aria-disabled', 'true')
    await utilisateur.click(bouton)
    await utilisateur.click(bouton)
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(
      screen.getByText('Cette saisie est déjà enregistrée. Changez un chiffre pour la corriger.'),
    ).toBeInTheDocument()
    // Un chiffre change : l'envoi repart, et le bouton redevient actif.
    await utilisateur.type(presents, '5')
    expect(bouton).not.toHaveAttribute('aria-disabled')
    await utilisateur.click(bouton)
    expect(enregistrer).toHaveBeenCalledTimes(2)
  })

  it('un champ vide n’est pas un 0 : les présents sont demandés', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    const { presents } = afficher(enregistrer)
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la présence' }))
    expect(screen.getByText('Saisissez le nombre de STARs présents.')).toBeInTheDocument()
    expect(presents).toHaveFocus()
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('envoie la présence, puis annonce la réussite', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    const { presents, dejaComptes } = afficher(enregistrer)
    await utilisateur.type(presents, '13')
    await utilisateur.clear(dejaComptes)
    await utilisateur.type(dejaComptes, '2')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la présence' }))
    expect(enregistrer).toHaveBeenCalledWith({
      sessionId: SESSION_EXEMPLE.sessionId,
      ministereId: 'm1',
      valeur: 13,
      dejaComptes: 2,
    })
    expect(
      await screen.findByText("Présence enregistrée pour Bâtir l'Église du 26 sept."),
    ).toBeInTheDocument()
  })

  it('en cas de coupure, les valeurs restent et le message de LISEZMOI s’affiche', async () => {
    const utilisateur = userEvent.setup()
    const { presents } = afficher(() => Promise.reject(new TypeError('Failed to fetch')))
    await utilisateur.type(presents, '7')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la présence' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez.',
    )
    expect(presents).toHaveValue('7')
  })

  it('correction : part de la saisie la plus récente et le dit', () => {
    const { presents, dejaComptes } = afficher(undefined, SAISIE_SESSION_EXEMPLE)
    expect(presents).toHaveValue('13')
    expect(dejaComptes).toHaveValue('2')
    expect(screen.getByText(/^Déjà saisi : 13 présents, dont 2 déjà comptés/)).toBeInTheDocument()
  })
})

describe('ChoixSession', () => {
  it('une ligne par session, la plus récente d’abord, chacune ouvre sa saisie', () => {
    render(
      <MemoryRouter>
        <ChoixSession sessions={SESSIONS_A_CHOISIR} />
      </MemoryRouter>,
    )
    const liens = within(screen.getByRole('list')).getAllByRole('link')
    expect(liens[0]).toHaveTextContent("Bâtir l'Église, samedi 26 sept. : à saisir")
    expect(liens[0]).toHaveAttribute('href', '/saisir/session/session-batir-26-sept')
    expect(screen.getByText('Choisissez la session à saisir.')).toBeInTheDocument()
  })

  it('en attente des autres : la phrase et qui déclare les sessions, sans action', () => {
    render(
      <MemoryRouter>
        <ChoixSession sessions={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Aucune session à saisir.')).toBeInTheDocument()
    expect(
      screen.getByText("L'administration de l'église déclare les sessions."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('tout est fait : chaque session reste ouverte pour une correction', () => {
    render(
      <MemoryRouter>
        <ChoixSession
          sessions={SESSIONS_A_CHOISIR.map((session) => ({ ...session, presentsSaisis: 4 }))}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByText(
        'Toutes les sessions récentes sont saisies. Ouvrez une session pour corriger sa saisie.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(SESSIONS_A_CHOISIR.length)
  })
})
