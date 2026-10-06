import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BlocChiffresParDepartement } from '@/features/fiche/BlocChiffresParDepartement'
import { ChiffresParDepartement } from '@/features/fiche/ChiffresParDepartement'
import { construireChiffresParDepartement } from '@/features/fiche/donneesChiffresParDepartement'
import { statistiquesExemple } from '@/features/saisie-fij/apercu/exemplesE4'
import type { TypeCompte } from '@/lib/base'
import { fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import { simulerLargeur } from '@/test/largeur'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  simulerLargeur(1440)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function donnees(forme: Parameters<typeof statistiquesExemple>[0] = 'donnees') {
  const construit = construireChiffresParDepartement(statistiquesExemple(forme))
  if (construit?.situation !== 'donnees') throw new Error('données attendues')
  return construit.donnees
}

function afficherEmplacement(
  ministereCode: string | null,
  profil: TypeCompte,
  reponse: ReponseFausse = { data: statistiquesExemple(), error: null },
) {
  const faux = fauxRequete({ v_fij_statistique: reponse })
  courant.client = faux.client
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rendu = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChiffresParDepartement ministereId="m" ministereCode={ministereCode} profil={profil} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { faux, rendu }
}

describe('BlocChiffresParDepartement', () => {
  it('total de chaque rubrique avec « 6 dép. sur 8 », une seule aide, la semaine en titre', () => {
    render(
      <BlocChiffresParDepartement
        bloc={{ etat: 'donnees', donnees: donnees() }}
        peutSaisir={false}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Chiffres par département' })).toBeInTheDocument()
    expect(screen.getByText('Semaine 39, du 21 au 27 sept.')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getAllByText('6 dép. sur 8')).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(1)
    expect(screen.getAllByRole('img')).toHaveLength(4)
  })

  it('par département, « Pas de saisie » pour un département absent, jamais 0', () => {
    render(
      <BlocChiffresParDepartement
        bloc={{ etat: 'donnees', donnees: donnees() }}
        peutSaisir={false}
      />,
    )
    const ligne77 = screen.getByRole('rowheader', { name: '77 Seine-et-Marne' }).closest('tr')
    expect(ligne77).toHaveTextContent('Pas de saisie'.repeat(4))
    expect(ligne77).not.toHaveTextContent('0')
  })

  it('sur téléphone, une liste par département à la place du tableau', () => {
    simulerLargeur(390)
    render(
      <BlocChiffresParDepartement
        bloc={{ etat: 'donnees', donnees: donnees() }}
        peutSaisir={false}
      />,
    )
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('77 Seine-et-Marne')).toBeInTheDocument()
  })

  it('semaine de référence sans saisie : la phrase, les totaux en « Pas de saisie »', () => {
    render(
      <BlocChiffresParDepartement
        bloc={{ etat: 'donnees', donnees: donnees('semaine-vide') }}
        peutSaisir={false}
      />,
    )
    expect(
      screen.getByText('Aucun département saisi pour la semaine 39, du 21 au 27 sept.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('0 dép. sur 8')).toHaveLength(4)
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('premier usage : la phrase, et l’action pour le seul ministère fij', () => {
    const { rerender } = render(
      <MemoryRouter>
        <BlocChiffresParDepartement bloc={{ etat: 'premier_usage' }} peutSaisir />
      </MemoryRouter>,
    )
    expect(screen.getByText('Pas encore de saisie par département.')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Saisir les chiffres par département' }),
    ).toHaveAttribute('href', '/saisir/fij-statistiques')
    rerender(
      <MemoryRouter>
        <BlocChiffresParDepartement bloc={{ etat: 'premier_usage' }} peutSaisir={false} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('FIJ saisit ces chiffres chaque semaine.')).toBeInTheDocument()
  })

  it('problème passager : « La connexion a échoué. Réessayez. » et « Réessayer »', async () => {
    const reessayer = vi.fn()
    render(<BlocChiffresParDepartement bloc={{ etat: 'erreur', reessayer }} peutSaisir={false} />)
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Chiffres par département' })).toBeInTheDocument()
  })
})

describe('emplacement « statistiques FIJ » de la fiche', () => {
  it.each([
    [null, 'berger'],
    ['coordination', 'conseil'],
    ['fij', 'admin_eglise'],
  ] as const)('fiche %s lue par %s : rien, sans requête', (code, profil) => {
    const { faux, rendu } = afficherEmplacement(code, profil)
    expect(rendu.container).toBeEmptyDOMElement()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it.each(['berger', 'conseil', 'admin_plateforme'] as const)(
    'fiche de Coordo FIJ lue par %s : le bloc, sans aucune action',
    async (profil) => {
      afficherEmplacement('fij', profil, {
        data: statistiquesExemple('premier-usage'),
        error: null,
      })
      expect(await screen.findByText('Pas encore de saisie par département.')).toBeInTheDocument()
      expect(screen.queryByRole('link')).toBeNull()
      expect(screen.queryByRole('button', { name: /^Saisir/ })).toBeNull()
    },
  )

  it('le ministère fij sur sa fiche : l’action de saisie au premier usage', async () => {
    afficherEmplacement('fij', 'ministere', {
      data: statistiquesExemple('premier-usage'),
      error: null,
    })
    expect(
      await screen.findByRole('link', { name: 'Saisir les chiffres par département' }),
    ).toBeInTheDocument()
  })

  it('les données lues : totaux et complétude', async () => {
    afficherEmplacement('fij', 'berger')
    expect(await screen.findByText('48')).toBeInTheDocument()
  })

  it('lecture en échec : le problème passager', async () => {
    afficherEmplacement('fij', 'berger', { data: null, error: { message: 'coupure' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
  })

  it('vue sans ligne (aucun droit de lecture) : rien', async () => {
    const { faux, rendu } = afficherEmplacement('fij', 'berger', { data: [], error: null })
    await vi.waitFor(() => expect(faux.from).toHaveBeenCalled())
    await vi.waitFor(() => expect(rendu.container).toBeEmptyDOMElement())
  })
})
