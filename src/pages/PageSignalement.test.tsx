import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { ContexteSession } from '@/features/session/contexte'
import { BlocSignalements } from '@/features/signalement/BlocSignalements'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

// « Signaler une difficulté » (`/signaler`), « Mes signalements » (`/signalements`, T77) et le
// bloc « Signalements » (`/moderation`), par les routes de l'application : chaque profil, l'écran
// venu de l'adresse, l'envoi par `signaler_difficulte`, les gestes du suivi par leurs fonctions.
// Seuls le ministère (les siens) et EJP Tech (tous) lisent un signalement.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const ID = '43000000-0000-4000-8000-000000000006'
const QUESTION = 'Quel événement, à quelle date, et quel message s’affiche quand vous enregistrez ?'

/** Le signalement de Coordination (conception T77, critère 1), Reçu, tel que la vue le rend. */
const RECU = {
  id: ID,
  ministere_id: COMMUNICATION,
  ministere_nom: 'Coordination',
  ecran: 'saisie_evenement',
  texte: 'Problème au niveau de la saisie des événement dans le calendrier',
  saisi_le: '2026-10-26T10:15:00+01:00',
  suivi_id: null,
  commentaire: null,
  clos_le: null,
  ouvert: true,
  clos_recent: false,
  statut: 'recu',
  derniere_etape: null,
  statut_le: '2026-10-26T10:15:00+01:00',
  jours_depuis: 0,
  fin: null,
  reponse_possible_jusquau: null,
  compte_actif: true,
}

/** Le même, après la question d'EJP Tech du 27 octobre (critères 3 et 4). */
const REPONDU = {
  ...RECU,
  statut: 'repondu',
  derniere_etape: 'reponse',
  statut_le: '2026-10-27T09:05:00+01:00',
  reponse_possible_jusquau: '2026-11-03',
}
const LIGNES_REPONDU = [
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    signalement_id: ID,
    etape: 'en_cours',
    commentaire: null,
    saisi_le: '2026-10-27T09:00:00+01:00',
    ordre: 1,
  },
  {
    id: 'd1000000-0000-4000-8000-000000000002',
    signalement_id: ID,
    etape: 'reponse',
    commentaire: QUESTION,
    saisi_le: '2026-10-27T09:05:00+01:00',
    ordre: 2,
  },
]

function scenario(type: TypeCompte, lignes: ScenarioSession['lignes'] = {}): ScenarioSession {
  return {
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? COMMUNICATION : null,
      libelle: type === 'ministere' ? 'Ministère Coordination' : 'Compte',
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
  courant.client = faux.clientAvecRpc(rpc)
  return { ...faux, rpc }
}

function afficher(adresse: string) {
  const routeur = createMemoryRouter(routes, { initialEntries: [adresse] })
  render(
    <QueryClientProvider client={clientRequetes}>
      <RouterProvider router={routeur} />
    </QueryClientProvider>,
  )
  return routeur
}

beforeAll(() => {
  // jsdom ne fait pas défiler : l'ancre `/signalements#<id>` appelle `scrollIntoView`.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  clientRequetes.clear()
  vi.clearAllMocks()
})

const PAGE_NON_DISPONIBLE = 'Page non disponible'
const lues = (faux: { tables: string[] }, table: string) =>
  faux.tables.filter((lue) => lue === table).length

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
    await userEvent.paste('Problème au niveau de la saisie des événement dans le calendrier')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))
    expect(
      await screen.findByText(
        "Signalement envoyé. Suivez la réponse d'EJP Tech dans « Mes signalements ».",
      ),
    ).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledWith('signaler_difficulte', {
      p_ecran: 'saisie_evenement',
      p_texte: 'Problème au niveau de la saisie des événement dans le calendrier',
    })
    // Jamais d'ajout direct, et plus aucune lecture : le suivi est sur « Mes signalements » (T77).
    expect(faux.tables).toEqual(['compte'])
  })

  it('ministère : « Voir mes signalements » mène à /signalements, qui lit ses signalements', async () => {
    const faux = connecte('ministere', { v_signalement: [RECU] })
    const routeur = afficher('/signaler')
    await userEvent.click(await screen.findByRole('link', { name: 'Voir mes signalements' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mes signalements' }),
    ).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/signalements')
    await waitFor(() => expect(lues(faux, 'v_signalement')).toBe(1))
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

describe('/signalements, « Mes signalements » (T77)', () => {
  it('critère 1 : le Reçu de Coordination dans « En cours », sans bouton', async () => {
    connecte('ministere', { v_signalement: [RECU] })
    afficher('/signalements')
    const enCours = await screen.findByRole('region', { name: 'En cours' })
    expect(within(enCours).getByText('Reçu')).toBeInTheDocument()
    expect(enCours).toHaveTextContent('EJP Tech a reçu votre signalement le 26 oct.')
    expect(within(enCours).queryByRole('button')).toBeNull()
  })

  it('critère 7 : « Oui, c’est réglé » par confirmer_signalement, annoncé, puis la liste relue', async () => {
    const faux = connecte('ministere', {
      v_signalement: [REPONDU],
      signalement_suivi: LIGNES_REPONDU,
    })
    afficher('/signalements')
    const aVerifier = await screen.findByRole('region', { name: 'À vérifier' })
    expect(aVerifier).toHaveTextContent(QUESTION)
    await userEvent.click(within(aVerifier).getByRole('button', { name: "Oui, c'est réglé" }))
    expect(await screen.findByText('Merci. Le signalement est clos.')).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledWith('confirmer_signalement', { p_signalement_id: ID })
    await waitFor(() => expect(lues(faux, 'v_signalement')).toBe(2))
    // Jamais un ajout direct dans le suivi.
    expect(faux.rpc).not.toHaveBeenCalledWith('repondre_a_ejp_tech', expect.anything())
  })

  it('critère 5 : « Répondre à EJP Tech » par repondre_a_ejp_tech, avec le texte', async () => {
    const faux = connecte('ministere', {
      v_signalement: [REPONDU],
      signalement_suivi: LIGNES_REPONDU,
    })
    afficher('/signalements')
    await userEvent.click(await screen.findByRole('button', { name: 'Répondre à EJP Tech' }))
    await userEvent.click(screen.getByLabelText('Votre réponse à EJP Tech'))
    await userEvent.paste(
      "L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche.",
    )
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(
      await screen.findByText('Réponse envoyée. EJP Tech reprend votre signalement.'),
    ).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledWith('repondre_a_ejp_tech', {
      p_signalement_id: ID,
      p_texte: "L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche.",
    })
  })

  it('critère 4 : l’ancre du lien de « Ma semaine » met le focus sur l’en-tête du signalement', async () => {
    connecte('ministere', { v_signalement: [REPONDU], signalement_suivi: LIGNES_REPONDU })
    afficher(`/signalements#${ID}`)
    const entete = await screen.findByRole('heading', {
      level: 3,
      name: 'Ajouter un événement, 26 oct.',
    })
    await waitFor(() => expect(entete).toHaveFocus())
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('lecture en échec : « Réessayer », jamais une page blanche', async () => {
    const faux = fauxSupabase({ ...scenario('ministere'), enEchec: ['v_signalement'] })
    courant.client = faux.client
    afficher('/signalements')
    expect(
      await screen.findByRole('button', { name: 'Réessayer' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Mes signalements' })).toBeInTheDocument()
  })
})

describe('/moderation, bloc « Signalements »', () => {
  it('EJP Tech : clôture par clore_signalement, réponse obligatoire, puis la liste relue', async () => {
    const faux = connecte('admin_plateforme', { v_signalement: [RECU] })
    afficher('/moderation')
    await userEvent.click(await screen.findByRole('button', { name: 'Clore le signalement' }))
    // Le même libellé ouvre le panneau et confirme (T66) : le bouton de la ligne a laissé sa
    // place à celui du panneau. Sans réponse, rien ne part (T77).
    await userEvent.click(screen.getByRole('button', { name: 'Clore le signalement' }))
    expect(await screen.findByText('Écrivez au moins 10 caractères.')).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalled()
    await userEvent.click(screen.getByLabelText('Réponse au ministère'))
    await userEvent.paste('transmis à l’administration')
    await userEvent.click(screen.getByRole('button', { name: 'Clore le signalement' }))
    expect(await screen.findByText('Signalement clos.')).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledWith('clore_signalement', {
      p_signalement_id: ID,
      p_commentaire: 'transmis à l’administration',
    })
    await waitFor(() => expect(lues(faux, 'v_signalement')).toBe(2))
  })

  it('EJP Tech, critère 2 : « Prendre en charge » par prendre_en_charge_signalement', async () => {
    const faux = connecte('admin_plateforme', { v_signalement: [RECU] })
    afficher('/moderation')
    await userEvent.click(await screen.findByRole('button', { name: 'Prendre en charge' }))
    expect(await screen.findByText('Signalement pris en charge.')).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledWith('prendre_en_charge_signalement', {
      p_signalement_id: ID,
    })
  })

  it('EJP Tech sans signalement : « Aucun signalement. »', async () => {
    connecte('admin_plateforme')
    afficher('/moderation')
    expect(await screen.findByText('Aucun signalement.')).toBeInTheDocument()
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
