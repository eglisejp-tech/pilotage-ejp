import { act, render, screen, configure } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMMUNICATION,
  COMMUNS_EXEMPLE,
  COMPTES_EXEMPLE,
  lireExemple,
  MINISTERES_EXEMPLE,
  SESSIONS_EXEMPLE,
} from '@/features/journal/apercu/exemplesJournal'
import { construireJournal, contexteJournal } from '@/features/journal/construireJournal'
import { optionMinistere, optionsActions, optionsComptes } from '@/features/journal/choix'
import type { DonneesJournal } from '@/features/journal/modeleJournal'
import { SANS_FILTRE } from '@/features/journal/filtres'
import { useJournal } from '@/features/journal/useJournal'
import type { ResultatJournal } from '@/features/journal/useJournal'
import { useCompteConnecte } from '@/features/session/contexte'
import type { TypeCompte } from '@/lib/base'
import { PageJournal } from './PageJournal'

// Sous la charge de toute la suite, une lecture simulée peut dépasser la seconde par défaut.
configure({ asyncUtilTimeout: 5000 })

vi.mock('@/features/journal/useJournal', () => ({ useJournal: vi.fn() }))
vi.mock(import('@/features/session/contexte'), async (importOriginal) => ({
  ...(await importOriginal()),
  useCompteConnecte: vi.fn(),
}))
const hook = vi.mocked(useJournal)
const compteConnecte = vi.mocked(useCompteConnecte)

function connecter(type: TypeCompte) {
  compteConnecte.mockReturnValue({
    id: 'u1',
    type,
    ministereId: type === 'ministere' ? COMMUNICATION : null,
    libelle: 'Compte',
    actif: true,
  })
}

function pret(profil: TypeCompte): ResultatJournal {
  const { lignes, aPlus } = lireExemple(
    { compte: null, action: null, ministere: null, depuis: null, limite: 3 },
    profil,
  )
  const donnees: DonneesJournal = {
    filtres: SANS_FILTRE,
    comptes: profil === 'ministere' ? null : optionsComptes(COMPTES_EXEMPLE),
    actions: optionsActions(profil),
    ministereChoisi: optionMinistere(MINISTERES_EXEMPLE[0]!),
    lignes: construireJournal(
      lignes,
      contexteJournal(COMMUNS_EXEMPLE, MINISTERES_EXEMPLE, SESSIONS_EXEMPLE),
    ),
    aPlus,
    enMiseAJour: false,
  }
  return { etat: 'pret', donnees, afficherPlus: vi.fn() }
}

function Adresse() {
  const { search } = useLocation()
  return <output data-testid="adresse">{search}</output>
}

function afficher(titre: string, adresse = '/journal') {
  return render(
    <MemoryRouter initialEntries={[adresse]}>
      <PageJournal titre={titre} />
      <Adresse />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  hook.mockReturnValue({ etat: 'chargement' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  document.title = ''
})

describe('PageJournal', () => {
  it('lit le journal avec le type du compte et les filtres de l’adresse', () => {
    connecter('berger')
    afficher('Journal', '/journal?action=point_cree&periode=7j&ministere=min-jeunesse')
    expect(hook).toHaveBeenCalledWith('berger', {
      compte: null,
      action: 'point_cree',
      periode: '7j',
      ministere: 'min-jeunesse',
    })
  })

  it('titre de l’onglet : « Journal, Pilotage EJP », « Mon journal » ou « Journal technique »', () => {
    connecter('berger')
    const { unmount } = afficher('Journal')
    expect(document.title).toBe('Journal, Pilotage EJP')
    unmount()
    connecter('ministere')
    const suivant = afficher('Mon journal')
    expect(document.title).toBe('Mon journal, Pilotage EJP')
    suivant.unmount()
    connecter('admin_plateforme')
    afficher('Journal technique', '/journal-technique')
    expect(document.title).toBe('Journal technique, Pilotage EJP')
  })

  it('chargement : le titre est déjà là, « Chargement » après 300 ms', () => {
    vi.useFakeTimers()
    connecter('berger')
    afficher('Journal')
    expect(screen.getByRole('heading', { level: 1, name: 'Journal' })).toBeInTheDocument()
    expect(screen.queryByText('Chargement')).toBeNull()
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByText('Chargement')).toBeInTheDocument()
  })

  it('erreur : le bandeau et « Réessayer » relance la lecture', async () => {
    const reessayer = vi.fn()
    hook.mockReturnValue({ etat: 'erreur', reessayer })
    connecter('berger')
    afficher('Journal')
    expect(screen.getByRole('heading', { level: 1, name: 'Journal' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })

  it('prêt : un filtre change l’adresse et « Afficher 50 lignes de plus » appelle la lecture', async () => {
    connecter('berger')
    const resultat = pret('berger')
    hook.mockReturnValue(resultat)
    afficher('Journal')
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Période' }),
      '7 derniers jours',
    )
    expect(screen.getByTestId('adresse')).toHaveTextContent('?periode=7j')
    await userEvent.click(screen.getByRole('button', { name: 'Afficher 50 lignes de plus' }))
    if (resultat.etat === 'pret') expect(resultat.afficherPlus).toHaveBeenCalledTimes(1)
  })
})
