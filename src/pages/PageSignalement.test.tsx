import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { ContexteSession } from '@/features/session/contexte'
import { BlocSignalements } from '@/features/signalement/BlocSignalements'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

// « Signaler une difficulté » (`/signaler`) et le bloc « Signalements » (`/moderation`), lot E8,
// par les routes de l'application : chaque profil, l'écran venu de l'adresse, l'envoi par
// `signaler_difficulte`. Seuls le ministère (les siens) et EJP Tech (tous) lisent un signalement.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'

const SIGNALEMENT_CLOS = {
  id: '43000000-0000-4000-8000-000000000002',
  ministere_id: COMMUNICATION,
  ministere_nom: 'Communication',
  ecran: 'saisie_dimanche',
  texte: 'Le bouton Envoyer reste grisé après la saisie.',
  saisi_le: '2026-09-27T13:10:00+02:00',
  suivi_id: '43000000-0000-4000-8000-000000000011',
  commentaire: 'Réglé avec le ministère.',
  clos_le: '2026-09-29T10:00:00+02:00',
  ouvert: false,
  clos_recent: true,
}

function scenario(type: TypeCompte, lignes: ScenarioSession['lignes'] = {}): ScenarioSession {
  return {
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? COMMUNICATION : null,
      libelle: type === 'ministere' ? 'Ministère Communication' : 'Compte',
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
    lignes,
  }
}

function connecte(type: TypeCompte, lignes: ScenarioSession['lignes'] = {}) {
  const faux = fauxSupabase(scenario(type, lignes))
  const rpc = vi.fn((nom: string, args: unknown) => {
    void nom
    void args
    return Promise.resolve({ data: '43000000-0000-4000-8000-000000000099', error: null })
  })
  courant.client = { ...faux.client, rpc }
  return { ...faux, rpc }
}

function afficher(adresse: string) {
  return render(
    <QueryClientProvider client={clientRequetes}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [adresse] })} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  clientRequetes.clear()
  vi.clearAllMocks()
})

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

describe('/signaler', () => {
  it('ministère, code inconnu dans l’adresse : « Écran concerné : Autre écran »', async () => {
    connecte('ministere')
    afficher('/signaler?ecran=saisie_point')
    expect(await screen.findByText('Écran concerné : Autre écran')).toBeInTheDocument()
    expect(document.title).toBe('Signaler une difficulté, Pilotage EJP')
  })

  it('ministère : envoi par signaler_difficulte, avec l’écran de l’adresse, puis la confirmation', async () => {
    const faux = connecte('ministere')
    afficher('/signaler?ecran=saisie_evenement')
    const champ = await screen.findByLabelText('Quelle difficulté rencontrez-vous ?')
    // Coller plutôt que taper touche par touche : un poste chargé dépasse sinon les 5 secondes.
    await userEvent.click(champ)
    await userEvent.paste('Je ne peux pas choisir la date de la soirée.')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))
    expect(await screen.findByText('Signalement envoyé. EJP Tech le lira.')).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledWith('signaler_difficulte', {
      p_ecran: 'saisie_evenement',
      p_texte: 'Je ne peux pas choisir la date de la soirée.',
    })
    // Jamais d'ajout direct : seule la vue des signalements est lue, sous la RLS du ministère.
    expect(new Set(faux.tables)).toEqual(new Set(['compte', 'v_signalement']))
  })

  it('ministère : « Vos derniers signalements » sous le formulaire', async () => {
    connecte('ministere', { v_signalement: [SIGNALEMENT_CLOS] })
    afficher('/signaler')
    const liste = await screen.findByRole('region', { name: 'Vos derniers signalements' })
    expect(within(liste).getByText('Clos le 29 sept.')).toBeInTheDocument()
    expect(liste).toHaveTextContent("Réponse d'EJP Tech : Réglé avec le ministère.")
  })

  it('lecture de la liste en échec : le formulaire reste, « Réessayer » sous lui', async () => {
    const faux = fauxSupabase({ ...scenario('ministere'), enEchec: ['v_signalement'] })
    courant.client = faux.client
    afficher('/signaler')
    expect(
      await screen.findByRole('button', { name: 'Réessayer' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Quelle difficulté rencontrez-vous ?')).toBeInTheDocument()
  })

  it.each<TypeCompte>(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'])(
    '%s : la page non disponible, aucune lecture ni envoi',
    async (type) => {
      const faux = connecte(type)
      afficher('/signaler?ecran=saisie_evenement')
      expect(
        await screen.findByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
      ).toBeInTheDocument()
      expect(faux.tables).toEqual(['compte'])
      expect(faux.rpc).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Envoyer le signalement' })).toBeNull()
    },
  )
})

describe('/moderation, bloc « Signalements »', () => {
  it('EJP Tech : clôture par clore_signalement, puis la liste relue', async () => {
    const faux = connecte('admin_plateforme', {
      v_signalement: [
        {
          ...SIGNALEMENT_CLOS,
          suivi_id: null,
          commentaire: null,
          clos_le: null,
          ouvert: true,
          clos_recent: false,
        },
      ],
    })
    afficher('/moderation')
    await userEvent.click(await screen.findByRole('button', { name: 'Clore le signalement' }))
    await userEvent.click(screen.getByLabelText('Commentaire (facultatif)'))
    await userEvent.paste('transmis à l’administration')
    await userEvent.click(screen.getByRole('button', { name: 'Clore définitivement' }))
    expect(await screen.findByText('Signalement clos.')).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledWith('clore_signalement', {
      p_signalement_id: SIGNALEMENT_CLOS.id,
      p_commentaire: 'transmis à l’administration',
    })
    await waitFor(() =>
      expect(faux.tables.filter((table) => table === 'v_signalement')).toHaveLength(2),
    )
  })

  it('EJP Tech sans signalement : « Aucun signalement. ... »', async () => {
    connecte('admin_plateforme')
    afficher('/moderation')
    expect(
      await screen.findByText(
        'Aucun signalement. Les difficultés signalées par les ministères arriveront ici.',
      ),
    ).toBeInTheDocument()
  })

  it.each<TypeCompte>(['ministere', 'berger', 'conseil', 'admin_eglise'])(
    'le bloc posé pour %s ne rend rien et ne lit rien',
    (type) => {
      const faux = connecte(type)
      const { container } = render(
        <QueryClientProvider client={clientRequetes}>
          <ContexteSession.Provider
            value={{
              statut: 'connecte',
              email: null,
              compte: {
                id: `u-${type}`,
                type,
                ministereId: type === 'ministere' ? COMMUNICATION : null,
                libelle: 'Compte',
                actif: true,
              },
            }}
          >
            <BlocSignalements />
          </ContexteSession.Provider>
        </QueryClientProvider>,
      )
      expect(container).toBeEmptyDOMElement()
      expect(faux.from).not.toHaveBeenCalled()
    },
  )
})
