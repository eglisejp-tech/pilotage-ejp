import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMPTAGES_EXEMPLE,
  COMPTAGES_PREMIER_MOIS_EXEMPLE,
  NOMS_MINISTERES_EXEMPLE,
  RETARDS_EXEMPLE,
} from '@/features/fiche/apercu/exemplesComptages'
import { BlocEvenementsEglise } from '@/features/fiche/BlocEvenementsEglise'
import { BlocPonctualite } from '@/features/fiche/BlocPonctualite'
import { ComptagesEvenements } from '@/features/fiche/ComptagesEvenements'
import { construireComptages, construireRetards } from '@/features/fiche/construireComptages'
import type { EtatComptages, EtatRetards } from '@/features/fiche/construireComptages'
import type { LigneComptagesEglise, TypeCompte } from '@/lib/base'
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

function bloc(lignes: LigneComptagesEglise[] = COMPTAGES_EXEMPLE): EtatComptages {
  const donnees = construireComptages(lignes)
  if (donnees === null) throw new Error('données attendues')
  return { etat: 'donnees', donnees }
}

const RETARDS: EtatRetards = {
  etat: 'donnees',
  donnees: construireRetards(RETARDS_EXEMPLE, NOMS_MINISTERES_EXEMPLE),
}

const ligneDe = (cle: string) => {
  const ligne = document.querySelector<HTMLElement>(`[data-comptage="${cle}"]`)
  if (ligne === null) throw new Error(`ligne ${cle} absente`)
  return within(ligne)
}

describe('BlocPonctualite', () => {
  it('mois écoulé, mois en cours à part, depuis le départ ; complétude et retard moyen', () => {
    render(<BlocPonctualite bloc={bloc()} retards={null} />)
    expect(screen.getByRole('heading', { name: 'Ponctualité' })).toBeInTheDocument()
    const ecoule = ligneDe('principal')
    expect(ecoule.getByText('Septembre 2026')).toBeInTheDocument()
    expect(ecoule.getByText('63')).toBeInTheDocument()
    expect(ecoule.getByText('Retard moyen : 8 min')).toBeInTheDocument()
    expect(ecoule.getByText('8 sur 10 ont leurs heures')).toBeInTheDocument()
    expect(ecoule.getByText('Cultes : 3 sur 4')).toBeInTheDocument()
    expect(ecoule.getByText('Autres événements : 2 sur 4')).toBeInTheDocument()
    expect(ligneDe('en_cours').getByText('Octobre en cours')).toBeInTheDocument()
    expect(ligneDe('depuis').getByText('Depuis le 21 août')).toBeInTheDocument()
    expect(screen.getByText(/au plus 5 minutes après l'heure prévue/)).toBeInTheDocument()
  })

  it('Coordination (retards à null) : totaux seulement, aucune liste ni titre d’événement', () => {
    render(<BlocPonctualite bloc={bloc()} retards={null} />)
    expect(screen.queryByText(/^Voir /)).not.toBeInTheDocument()
    expect(screen.queryByText(/Soirée jeunesse/)).not.toBeInTheDocument()
  })

  it('berger : la liste repliée des retards s’ouvre au clic', async () => {
    const utilisateur = userEvent.setup()
    render(<BlocPonctualite bloc={bloc()} retards={RETARDS} />)
    const resume = screen.getByText('Voir les 2 événements commencés en retard en septembre')
    expect(screen.getByText('12 min de retard')).not.toBeVisible()
    await utilisateur.click(resume)
    expect(screen.getByText('12 min de retard')).toBeVisible()
    expect(screen.getByText(/Jeu\. 10 sept\., Soirée jeunesse \(Jeunesse\)/)).toBeVisible()
    expect(screen.getByText('35 min de retard')).toBeVisible()
  })

  it('aucun avec ses heures : « Non calculé », la complétude reste affichée', () => {
    render(<BlocPonctualite bloc={bloc(COMPTAGES_PREMIER_MOIS_EXEMPLE)} retards={RETARDS} />)
    const ligne = ligneDe('principal')
    expect(ligne.getByText('Non calculé')).toBeInTheDocument()
    expect(ligne.getByText('0 sur 2 a ses heures')).toBeInTheDocument()
    expect(screen.queryByText(/^Voir /)).not.toBeInTheDocument()
  })

  it('problème passager : le titre reste, le problème et « Réessayer » sont dits ici aussi', async () => {
    const reessayer = vi.fn()
    render(<BlocPonctualite bloc={{ etat: 'erreur', reessayer }} retards={null} />)
    const bloc = within(screen.getByRole('region', { name: 'Ponctualité' }))
    expect(bloc.getByText('La connexion a échoué. Réessayez.')).toBeInTheDocument()
    await userEvent.setup().click(bloc.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledOnce()
    expect(screen.queryByText(/au plus 5 minutes/)).not.toBeInTheDocument()
  })

  it('premier usage : rien, le bloc des événements parle seul', () => {
    const { container } = render(
      <BlocPonctualite bloc={{ etat: 'premier_usage' }} retards={null} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('BlocEvenementsEglise', () => {
  it('six comptages du mois écoulé, le mois en cours et le départ nommés', () => {
    render(<BlocEvenementsEglise bloc={bloc()} />)
    expect(screen.getByRole('heading', { name: "Événements de l'église" })).toBeInTheDocument()
    expect(screen.getByText('Septembre 2026')).toBeInTheDocument()
    const realises = ligneDe('realises')
    expect(realises.getByText('6')).toBeInTheDocument()
    expect(realises.getByText('Octobre en cours : 2')).toBeInTheDocument()
    expect(realises.getByText('Depuis le 21 août : 11')).toBeInTheDocument()
    expect(ligneDe('passes_sans_etat_final').getByText('Passés sans état final')).toBeVisible()
    expect(screen.getByText(/comptés depuis le 21 août\./)).toBeInTheDocument()
  })

  it('premier usage et problème passager avec « Réessayer »', async () => {
    const reessayer = vi.fn()
    const { rerender } = render(<BlocEvenementsEglise bloc={{ etat: 'premier_usage' }} />)
    expect(screen.getByText("Pas encore d'événement déclaré.")).toBeInTheDocument()
    rerender(<BlocEvenementsEglise bloc={{ etat: 'erreur', reessayer }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledOnce()
  })
})

describe('ComptagesEvenements (emplacement)', () => {
  function afficher(
    ministereCode: string | null,
    profil: TypeCompte,
    rpc: ReponseFausse = { data: COMPTAGES_EXEMPLE, error: null },
  ) {
    const faux = fauxRequete({
      v_evenement: { data: RETARDS_EXEMPLE, error: null },
      ministere: {
        data: [...NOMS_MINISTERES_EXEMPLE].map(([id, nom]) => ({
          id,
          nom,
          code: null,
          desactive_le: null,
        })),
        error: null,
      },
    })
    const appelRpc = vi.fn(() => Promise.resolve(rpc))
    courant.client = { from: faux.client.from, rpc: appelRpc }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const rendu = render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ComptagesEvenements ministereId="m" ministereCode={ministereCode} profil={profil} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    return { faux, rpc: appelRpc, rendu }
  }

  it('hors de la fiche de Coordination, ou pour l’administration : rien, sans requête', () => {
    const autre = afficher('fij', 'berger')
    expect(autre.rendu.container).toBeEmptyDOMElement()
    expect(autre.rpc).not.toHaveBeenCalled()
    autre.rendu.unmount()
    const administration = afficher('coordination', 'admin_eglise')
    expect(administration.rendu.container).toBeEmptyDOMElement()
    expect(administration.rpc).not.toHaveBeenCalled()
  })

  it('Coordination : les totaux, jamais la lecture des événements en retard', async () => {
    const { faux } = afficher('coordination', 'ministere')
    expect(await screen.findByText('Retard moyen : 8 min')).toBeInTheDocument()
    expect(screen.queryByText(/^Voir /)).not.toBeInTheDocument()
    expect(faux.de('v_evenement')).toHaveLength(0)
  })

  it('berger : la liste lue dans v_evenement, avec le nom du porteur', async () => {
    const { faux } = afficher('coordination', 'berger')
    await userEvent
      .setup()
      .click(await screen.findByText('Voir les 2 événements commencés en retard en septembre'))
    expect(await screen.findByText(/Veillée de prière \(Coordination\)/)).toBeVisible()
    expect(faux.de('v_evenement')).toHaveLength(1)
  })

  it('un refus de la base : le problème passager dans chaque bloc, titres gardés', async () => {
    afficher('coordination', 'conseil', { data: null, error: { code: '42501', message: 'non' } })
    for (const titre of ["Événements de l'église", 'Ponctualité']) {
      const region = within(await screen.findByRole('region', { name: titre }))
      expect(await region.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
      expect(region.getByText('La connexion a échoué. Réessayez.')).toBeInTheDocument()
    }
  })
})
