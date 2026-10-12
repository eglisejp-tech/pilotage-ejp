import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import {
  ACTIVITES,
  ID_MINISTERE_EXEMPLE,
  INDICATEURS_EXEMPLE,
  LIMITES_EXEMPLE,
  REFUS_EXEMPLE,
  SUGGESTIONS_EXEMPLE,
  SUIVI_EXEMPLE,
} from '@/features/mes-indicateurs/apercu/exemples'
import type { LimitesIndicateurs, TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'

// « Mes indicateurs » (`/ma-fiche/indicateurs`, lot L4), par les routes de l'application : les
// lectures du ministère, le panneau « Ajouter un indicateur », l'envoi d'une suggestion par
// `ajouter_suggestion`, les limites et les états vides. Seul le profil « ministère » a cette page.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const DEMANDE_REFUSEE = '00000000-0000-4000-8000-0000000000d1'

type Options = {
  lignes?: Record<string, unknown[]>
  limites?: LimitesIndicateurs
  enEchec?: string[]
}

function connecte(type: TypeCompte, options: Options = {}) {
  const faux = fauxSupabase({
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? ID_MINISTERE_EXEMPLE : null,
      libelle: 'Compte',
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
    lignes: {
      ministere: [
        { id: ID_MINISTERE_EXEMPLE, code: null, nom: 'Communication', desactive_le: null },
      ],
      indicateur: [...INDICATEURS_EXEMPLE],
      v_indicateur_suivi: [...SUIVI_EXEMPLE],
      validation: REFUS_EXEMPLE.map((refus) => ({
        demande_id: DEMANDE_REFUSEE,
        decision: 'refuse',
        motif: refus.motif,
        saisi_le: refus.saisi_le,
      })),
      demande_indicateur: [{ id: DEMANDE_REFUSEE, indicateur_id: ACTIVITES.id }],
      v_suggestions: [...SUGGESTIONS_EXEMPLE],
      ...options.lignes,
    },
    enEchec: options.enEchec,
  })
  const limites = options.limites ?? LIMITES_EXEMPLE
  const rpc = vi.fn((nom: string, args: unknown) => {
    void args
    return Promise.resolve(
      nom === 'limites_indicateurs'
        ? { data: [limites], error: null }
        : { data: '00000000-0000-4000-8000-0000000000e1', error: null },
    )
  })
  courant.client = { ...faux.client, rpc }
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

afterEach(async () => {
  cleanup()
  await clientRequetes.cancelQueries()
  clientRequetes.clear()
  vi.clearAllMocks()
})

/** L'écran, une fois ses lectures finies. */
async function ecran() {
  await screen.findByRole('heading', { level: 1, name: 'Mes indicateurs' }, { timeout: 5000 })
  await screen.findByRole('button', { name: 'Ajouter un indicateur' }, { timeout: 5000 })
}

async function ouvrirLePanneau() {
  await userEvent.click(screen.getByRole('button', { name: 'Ajouter un indicateur' }))
  return screen.findByRole('dialog', { name: 'Ajouter un indicateur' })
}

describe('/ma-fiche/indicateurs, lectures', () => {
  it('la phrase, les sections par rythme, le titre de l’onglet et le retour à « Ma fiche »', async () => {
    const faux = connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    expect(document.title).toBe('Mes indicateurs, Pilotage EJP')
    expect(
      screen.getByText(
        'Communication suit 7 indicateurs : 5 prévus par la coordination et 2 ajoutés par vous. Vous pouvez en ajouter 1 autre.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent)).toEqual([
      'Chaque dimanche',
      'Chaque mois',
      'À ce jour',
      'Calculs',
    ])
    expect(screen.getByRole('link', { name: 'Retour à ma fiche' })).toHaveAttribute(
      'href',
      '/ma-fiche',
    )
    const lues = new Set(faux.tables)
    for (const table of ['indicateur', 'v_indicateur_suivi', 'validation', 'v_suggestions']) {
      expect(lues.has(table), table).toBe(true)
    }
    for (const interdite of ['mesure', 'v_mesure_periode', 'v_calcul', 'v_a_valider']) {
      expect(lues.has(interdite), interdite).toBe(false)
    }
    expect(faux.rpc).toHaveBeenCalledWith('limites_indicateurs', {
      p_ministere_id: ID_MINISTERE_EXEMPLE,
    })
  })

  it('un ajout à valider dit son attente, l’origine et la dernière saisie se lisent sur chaque ligne', async () => {
    connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    // L'état en gras orange, puis ce qu'on peut faire, en texte normal et sur sa ligne.
    const attente = screen.getByText('À valider par EJP Tech depuis 2 jours.')
    expect(attente).toBeInTheDocument()
    expect(attente.nextElementSibling).toHaveTextContent('Vous pouvez déjà le saisir.')
    expect(screen.queryByText(/le berger voit ses valeurs/)).toBeNull()
    expect(screen.getByText('Suggestion ajoutée par vous le 8 oct.')).toBeInTheDocument()
    expect(screen.getAllByText('Prévu par la coordination')).toHaveLength(5)
    expect(screen.getByText('Dernière saisie le 2 oct.')).toBeInTheDocument()
    expect(screen.getAllByText('Jamais saisi')).toHaveLength(2)
    expect(screen.getByText('Se calcule tout seul')).toBeInTheDocument()
  })

  it('« Retirés » s’ouvre de lui-même quand il porte le motif d’un refus, et son titre est souligné', async () => {
    connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const resume = screen.getByText('Retirés (2)')
    expect(resume.closest('details')).toHaveAttribute('open')
    expect(resume).toHaveClass('underline')
    expect(
      screen.getByText(
        /Refusé le 5 oct\. : «\s*Ce chiffre existe déjà sur votre fiche sous le nom Publications\.\s*»\./,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Retiré le 3 oct. : doublon.')).toBeInTheDocument()
    // Le ministère peut le replier.
    await userEvent.click(resume)
    expect(resume.closest('details')).not.toHaveAttribute('open')
  })

  it('« Retirés » reste replié quand aucun motif de refus n’est à lire', async () => {
    connecte('ministere', { lignes: { validation: [], demande_indicateur: [] } })
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const resume = screen.getByText('Retirés (2)')
    expect(resume.closest('details')).not.toHaveAttribute('open')
    expect(resume).toHaveClass('underline')
  })

  it('l’onglet « Ma fiche » reste l’onglet courant sur cette sous-page', async () => {
    connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const navigation = screen.getAllByRole('navigation', { name: 'Navigation principale' })[0]!
    expect(within(navigation).getByRole('link', { name: 'Ma fiche' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navigation).getByRole('link', { name: 'Cette semaine' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('un ministère sans indicateur : l’état vide de LISEZMOI, le bouton reste', async () => {
    connecte('ministere', {
      lignes: { indicateur: [], v_indicateur_suivi: [], validation: [], demande_indicateur: [] },
      limites: { ajouts: 0, ajouts_max: 3, lignes: 0, lignes_max: 30 },
    })
    afficher('/ma-fiche/indicateurs')
    await ecran()
    expect(
      screen.getByText(
        "Votre ministère n'a pas encore d'indicateur à lui. Les STARs au service, actifs et en FIJ se saisissent déjà chaque dimanche.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/suit \d+ indicateur/)).toBeNull()
  })

  it('une lecture qui échoue : « La connexion a échoué. Réessayez. » et « Réessayer »', async () => {
    connecte('ministere', { enEchec: ['v_suggestions'] })
    afficher('/ma-fiche/indicateurs')
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

describe('/ma-fiche/indicateurs, « Ajouter un indicateur »', () => {
  it('liste les suggestions que la fiche n’a pas encore, avec rythme et définition', async () => {
    connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    expect(
      within(panneau).getByRole('heading', { level: 2, name: 'Suggestions' }),
    ).toBeInTheDocument()
    const choix = within(panneau).getAllByRole('button', { name: /^Choisir /i })
    expect(choix.map((bouton) => bouton.getAttribute('aria-label'))).toEqual([
      'Choisir « Demandes traitées »',
      'Choisir « Événements couverts »',
      'Choisir « Personnes formées »',
    ])
    expect(within(panneau).getAllByText('chaque mois')).toHaveLength(3)
    expect(
      within(panneau).getByText(
        "Rien ne convient ? Demandez un indicateur à l'administration de l'église.",
      ),
    ).toBeInTheDocument()
  })

  it('« Choisir » ouvre « Pourquoi cet indicateur ? » : 280 caractères, compteur, aide, aucun rappel', async () => {
    connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    const champ = within(panneau).getByRole('textbox', { name: 'Pourquoi cet indicateur ?' })
    expect(within(panneau).getByText('0 sur 280')).toBeInTheDocument()
    expect(
      within(panneau).getByRole('button', { name: 'Aide : Pourquoi cet indicateur ?' }),
    ).toBeInTheDocument()
    expect(
      within(panneau).getByText(
        'EJP Tech vérifie chaque ajout. En attendant, vous pouvez déjà le saisir.',
      ),
    ).toBeInTheDocument()
    // Exception voulue (T30) : aucun rappel sur les données personnelles sous ce champ.
    expect(within(panneau).queryByText(/N'écrivez aucun nom/)).toBeNull()
    await userEvent.type(champ, 'Voir ce que le ministère a mené à terme.')
    expect(within(panneau).getByText('40 sur 280')).toBeInTheDocument()
  })

  it('un « Pourquoi » trop court est refusé avant tout appel, avec le message de la base', async () => {
    const faux = connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    await userEvent.type(within(panneau).getByRole('textbox'), 'Neuf cara')
    await userEvent.click(within(panneau).getByRole('button', { name: 'Envoyer pour validation' }))
    expect(
      await within(panneau).findByText('Expliquez pourquoi en 10 caractères au moins.'),
    ).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalledWith('ajouter_suggestion', expect.anything())
  })

  it('un « Pourquoi » de plus de 280 caractères est refusé avant tout appel', async () => {
    const faux = connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    await userEvent.click(within(panneau).getByRole('textbox'))
    await userEvent.paste('a'.repeat(281))
    await userEvent.click(within(panneau).getByRole('button', { name: 'Envoyer pour validation' }))
    expect(await within(panneau).findByText('280 caractères au plus.')).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalledWith('ajouter_suggestion', expect.anything())
  })

  it('« Envoyer pour validation » appelle ajouter_suggestion, ferme le panneau et dit où saisir', async () => {
    const faux = connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    await userEvent.type(
      within(panneau).getByRole('textbox'),
      '  Voir ce que le ministère a mené à terme.  ',
    )
    await userEvent.click(within(panneau).getByRole('button', { name: 'Envoyer pour validation' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('ajouter_suggestion', {
        p_ministere_id: ID_MINISTERE_EXEMPLE,
        p_code: 'suggestion_demandes_traitees',
        p_pourquoi: 'Voir ce que le ministère a mené à terme.',
      }),
    )
    expect(
      await screen.findByText(
        /«\s*Demandes traitées\s*» envoyé pour validation : vous pouvez déjà le saisir dans vos chiffres du mois\./,
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('« Choisir une autre suggestion » revient à la liste sans rien envoyer', async () => {
    const faux = connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    await userEvent.click(
      within(panneau).getByRole('button', { name: 'Choisir une autre suggestion' }),
    )
    expect(within(panneau).getAllByRole('button', { name: /^Choisir «/ })).toHaveLength(3)
    expect(faux.rpc).not.toHaveBeenCalledWith('ajouter_suggestion', expect.anything())
  })

  it('3 ajouts : le panneau ne montre que l’explication, le bouton qui l’ouvre reste actif', async () => {
    connecte('ministere', { limites: { ajouts: 3, ajouts_max: 3, lignes: 8, lignes_max: 30 } })
    afficher('/ma-fiche/indicateurs')
    await ecran()
    expect(screen.getByText(/Vous avez atteint le maximum de 3 ajouts\./)).toBeInTheDocument()
    const panneau = await ouvrirLePanneau()
    expect(
      within(panneau).getByText(/^Votre ministère a déjà 3 indicateurs à lui\./),
    ).toBeInTheDocument()
    expect(within(panneau).getByText(/Demandez à l'administration de l'église/)).toBeInTheDocument()
    expect(within(panneau).queryByRole('button', { name: /^Choisir «/ })).toBeNull()
    expect(within(panneau).queryByRole('textbox')).toBeNull()
  })

  it('30 lignes : la limite de la fiche, avec ce qu’il faut faire', async () => {
    connecte('ministere', { limites: { ajouts: 1, ajouts_max: 3, lignes: 30, lignes_max: 30 } })
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    expect(
      within(panneau).getByText(
        "Votre fiche compte déjà 30 indicateurs. Demandez à l'administration de l'église d'en retirer un.",
      ),
    ).toBeInTheDocument()
  })

  it('le refus d’une quatrième par la base se lit sous le bouton, le texte reste dans le champ', async () => {
    const faux = connecte('ministere')
    faux.rpc.mockImplementation((nom: string) =>
      nom === 'limites_indicateurs'
        ? Promise.resolve({ data: [LIMITES_EXEMPLE], error: null })
        : Promise.reject({
            code: 'P0001',
            message:
              'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.',
          }),
    )
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    await userEvent.type(within(panneau).getByRole('textbox'), 'Voir ce que le ministère a mené.')
    await userEvent.click(within(panneau).getByRole('button', { name: 'Envoyer pour validation' }))
    const alerte = await within(panneau).findByRole('alert')
    expect(alerte).toHaveTextContent(/^Votre ministère a déjà 3 indicateurs à lui\./)
    expect(within(panneau).getByRole('textbox')).toHaveValue('Voir ce que le ministère a mené.')
  })

  it('un refus du « Pourquoi » par la base (donnée personnelle) se lit sous le champ', async () => {
    const faux = connecte('ministere')
    faux.rpc.mockImplementation((nom: string) =>
      nom === 'limites_indicateurs'
        ? Promise.resolve({ data: [LIMITES_EXEMPLE], error: null })
        : Promise.reject({
            code: 'P0001',
            message: "N'écrivez aucun nom ni information personnelle.",
          }),
    )
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    await userEvent.type(
      within(panneau).getByRole('textbox'),
      'Écrire à jean@exemple.test pour voir.',
    )
    await userEvent.click(within(panneau).getByRole('button', { name: 'Envoyer pour validation' }))
    expect(
      await within(panneau).findByText("N'écrivez aucun nom ni information personnelle."),
    ).toBeInTheDocument()
    expect(within(panneau).getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('une connexion perdue garde le texte et le dit sous le bouton', async () => {
    const faux = connecte('ministere')
    faux.rpc.mockImplementation((nom: string) =>
      nom === 'limites_indicateurs'
        ? Promise.resolve({ data: [LIMITES_EXEMPLE], error: null })
        : Promise.reject(new Error('réseau')),
    )
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(
      within(panneau).getByRole('button', { name: /^Choisir «\s*Demandes traitées/ }),
    )
    await userEvent.type(within(panneau).getByRole('textbox'), 'Voir ce que le ministère a mené.')
    await userEvent.click(within(panneau).getByRole('button', { name: 'Envoyer pour validation' }))
    expect(await within(panneau).findByRole('alert')).toHaveTextContent(
      /^La connexion a échoué\. Votre message est encore dans le formulaire/,
    )
    expect(within(panneau).getByRole('textbox')).toHaveValue('Voir ce que le ministère a mené.')
  })

  it('toutes les suggestions sont déjà sur la fiche : l’état vide de LISEZMOI', async () => {
    connecte('ministere', { lignes: { v_suggestions: [] } })
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    expect(
      within(panneau).getByText('Toutes les suggestions sont déjà sur votre fiche.'),
    ).toBeInTheDocument()
    expect(within(panneau).queryByRole('button', { name: /^Choisir «/ })).toBeNull()
  })

  it('« Retour » ferme le panneau sans rien envoyer', async () => {
    const faux = connecte('ministere')
    afficher('/ma-fiche/indicateurs')
    await ecran()
    const panneau = await ouvrirLePanneau()
    await userEvent.click(within(panneau).getByRole('button', { name: 'Retour' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(faux.rpc).not.toHaveBeenCalledWith('ajouter_suggestion', expect.anything())
  })
})

describe.each<TypeCompte>(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'])(
  '%s',
  (profil) => {
    it('/ma-fiche/indicateurs : page non disponible, aucune requête au-delà du compte', async () => {
      const faux = connecte(profil)
      afficher('/ma-fiche/indicateurs')
      expect(
        await screen.findByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
      ).toBeInTheDocument()
      expect(faux.tables).toEqual(['compte'])
      expect(faux.rpc).not.toHaveBeenCalled()
    })
  },
)
