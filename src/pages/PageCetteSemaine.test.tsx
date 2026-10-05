import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exempleCetteSemaine, exemplePremierDimanche } from '@/features/cette-semaine/exemple'
import type { DonneesCetteSemaine, Lecteur, ProfilVue } from '@/features/cette-semaine/types'
import type { ResultatCetteSemaine } from '@/features/cette-semaine/useCetteSemaine'
import { useCetteSemaine } from '@/features/cette-semaine/useCetteSemaine'
import { simulerLargeur } from '@/test/largeur'
import { PageCetteSemaine } from './PageCetteSemaine'

vi.mock('@/features/cette-semaine/useCetteSemaine', () => ({ useCetteSemaine: vi.fn() }))
const hook = vi.mocked(useCetteSemaine)
const reessayer = vi.fn()

const enChargement: ResultatCetteSemaine = {
  enChargement: true,
  erreur: false,
  donnees: null,
  reessayer,
}
const enErreur: ResultatCetteSemaine = {
  enChargement: false,
  erreur: true,
  donnees: null,
  reessayer,
}
const pret = (donnees: DonneesCetteSemaine): ResultatCetteSemaine => ({
  enChargement: false,
  erreur: false,
  donnees,
  reessayer,
})

const LECTEURS: Record<ProfilVue, Lecteur> = {
  berger: { profil: 'berger' },
  conseil: { profil: 'conseil' },
  admin_eglise: { profil: 'admin_eglise' },
  admin_plateforme: { profil: 'admin_plateforme' },
  ministere: { profil: 'ministere', ministereId: 'com' },
}

function afficher(profil: ProfilVue, adresse = '/') {
  return render(
    <MemoryRouter initialEntries={[adresse]}>
      <PageCetteSemaine lecteur={LECTEURS[profil]} />
    </MemoryRouter>,
  )
}

const titres = () =>
  screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent ?? '')

beforeEach(() => {
  hook.mockReturnValue(enChargement)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  document.title = ''
})

describe('PageCetteSemaine', () => {
  it('titre de l’onglet « Cette semaine, Pilotage EJP »', () => {
    afficher('berger')
    expect(document.title).toBe('Cette semaine, Pilotage EJP')
  })

  describe('chargement', () => {
    it('titres de section et filets tout de suite, « Chargement » après 300 ms, avec aria-busy', () => {
      vi.useFakeTimers()
      const { container } = afficher('berger')
      expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Cette semaine' })).toHaveClass(
        'sr-only',
      )
      expect(titres()).toEqual([
        "Les chiffres de l'église",
        'À décider',
        'Dernière session',
        'FIJ en Île-de-France',
        'Les ministères',
      ])
      expect(screen.queryByText('Chargement')).not.toBeInTheDocument()

      // La zone d'annonce est là dès le départ, vide, pour que « Chargement » soit annoncé.
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
      act(() => vi.advanceTimersByTime(299))
      expect(screen.queryByText('Chargement')).not.toBeInTheDocument()
      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByText('Chargement')).toHaveClass('text-encre-3')
      expect(screen.getByRole('status')).toHaveTextContent('Chargement')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('EJP Tech : les blocs du berger, « À décider » compris (T29)', () => {
      afficher('admin_plateforme')
      expect(titres()).toEqual([
        "Les chiffres de l'église",
        'À décider',
        'Dernière session',
        'FIJ en Île-de-France',
        'Les ministères',
      ])
    })

    it("administration de l'église : les blocs de l'église, sans « À décider »", () => {
      afficher('admin_eglise')
      expect(titres()).toEqual([
        "Les chiffres de l'église",
        'Dernière session',
        'FIJ en Île-de-France',
        'Les ministères',
      ])
    })

    it('ministère : « L’église cette semaine », et sous 600 px ce seul bloc', () => {
      afficher('ministere')
      expect(titres()[0]).toBe("L'église cette semaine")
      expect(titres()).not.toContain('À décider')
    })

    it('ministère sous 600 px : seul « L’église cette semaine », comme avant « Tout voir »', () => {
      simulerLargeur(390)
      afficher('ministere')
      expect(titres()).toEqual(["L'église cette semaine"])
    })
  })

  describe('erreur de page', () => {
    it('bandeau « La connexion a échoué. Réessayez. » et bouton « Réessayer », qui relance', async () => {
      hook.mockReturnValue(enErreur)
      afficher('conseil')
      const alerte = screen.getByRole('alert')
      expect(alerte).toHaveTextContent('La connexion a échoué. Réessayez.')
      expect(alerte.parentElement).toHaveClass('bg-alerte-fond')
      expect(alerte.parentElement).toHaveFocus()
      expect(screen.getByRole('heading', { level: 1, name: 'Cette semaine' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
      expect(reessayer).toHaveBeenCalledTimes(1)
    })

    it('« Réessayer » repasse au chargement, puis à la vue quand les données arrivent', async () => {
      hook.mockReturnValue(enErreur)
      const { rerender } = afficher('berger')
      hook.mockReturnValue(enChargement)
      await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
      rerender(
        <MemoryRouter>
          <PageCetteSemaine lecteur={LECTEURS.berger} />
        </MemoryRouter>,
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(titres()).toContain('Dernière session')

      hook.mockReturnValue(pret(exempleCetteSemaine('berger')))
      rerender(
        <MemoryRouter>
          <PageCetteSemaine lecteur={LECTEURS.berger} />
        </MemoryRouter>,
      )
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et un point attend votre décision.",
      )
    })
  })

  describe('type de session (?session=, T20)', () => {
    it.each([
      ['/?session=anti_dispersion', 'anti_dispersion'],
      ['/?session=batir', 'batir'],
      ['/?session=autre', 'autre'],
      ['/?session=inconnu', null],
      ['/', null],
    ])('%s lit le type %s', (adresse, attendu) => {
      afficher('berger', adresse)
      expect(hook).toHaveBeenCalledWith({ profil: 'berger' }, attendu)
    })

    it('le lecteur du ministère porte son ministère', () => {
      afficher('ministere')
      expect(hook).toHaveBeenCalledWith({ profil: 'ministere', ministereId: 'com' }, null)
    })
  })

  describe('vue, selon le profil', () => {
    it.each<ProfilVue>(['berger', 'conseil', 'admin_plateforme'])(
      '%s : surligneur, « À décider », cinq colonnes, chaque nom ouvre la fiche',
      (profil) => {
        hook.mockReturnValue(pret(exempleCetteSemaine(profil)))
        const { container } = afficher(profil)
        expect(container.querySelector('h1 mark')).toHaveTextContent(
          'un point attend votre décision',
        )
        expect(screen.getByRole('region', { name: 'À décider' })).toBeInTheDocument()
        const ministeres = screen.getByRole('region', { name: 'Les ministères' })
        expect(within(ministeres).getAllByRole('columnheader')).toHaveLength(5)
        const liens = within(ministeres).getAllByRole('link')
        expect(liens).toHaveLength(8)
        for (const lien of liens) expect(lien.getAttribute('href')).toMatch(/^\/ministeres\//)
        expect(screen.queryByRole('button', { name: 'Marquer traité' })).not.toBeInTheDocument()
      },
    )

    it('EJP Tech : le contenu du berger, en lecture seule, sans aucun bouton d’action (T29)', () => {
      hook.mockReturnValue(pret(exempleCetteSemaine('admin_plateforme')))
      afficher('admin_plateforme')
      expect(hook).toHaveBeenCalledWith({ profil: 'admin_plateforme' }, null)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et un point attend votre décision.",
      )
      const aDecider = screen.getByRole('region', { name: 'À décider' })
      expect(within(aDecider).getAllByRole('heading', { level: 3 })).toHaveLength(3)
      // Garde de l'étape 5 : « Marquer traité » ne doit jamais apparaître pour EJP Tech, ni
      // aucun autre bouton d'action ou de saisie.
      expect(within(aDecider).queryByRole('button')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Marquer traité/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('ministère : « L’église cette semaine », trois colonnes, seul son nom ouvre « Ma fiche »', () => {
      hook.mockReturnValue(pret(exempleCetteSemaine('ministere')))
      const { container } = afficher('ministere')
      expect(container.querySelector('mark')).toBeNull()
      expect(titres()[0]).toBe("L'église cette semaine")
      expect(titres()).not.toContain('À décider')
      const ministeres = screen.getByRole('region', { name: 'Les ministères' })
      expect(within(ministeres).getAllByRole('columnheader')).toHaveLength(3)
      const liens = within(ministeres).getAllByRole('link')
      expect(liens).toHaveLength(1)
      expect(liens[0]).toHaveAccessibleName('Communication')
      expect(liens[0]).toHaveAttribute('href', '/ma-fiche')
    })

    it("administration de l'église : ni surligneur, ni « À décider », ni lien, ni action", () => {
      hook.mockReturnValue(pret(exempleCetteSemaine('admin_eglise')))
      const { container } = afficher('admin_eglise')
      expect(container.querySelector('mark')).toBeNull()
      expect(titres()).not.toContain('À décider')
      const ministeres = screen.getByRole('region', { name: 'Les ministères' })
      expect(within(ministeres).getAllByRole('columnheader')).toHaveLength(3)
      expect(within(ministeres).queryByRole('link')).not.toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('états vides (premier dimanche, T22)', () => {
    it.each<ProfilVue>(['berger', 'conseil', 'ministere', 'admin_eglise', 'admin_plateforme'])(
      '%s : chaque bloc garde son titre et dit ce qui manque',
      (profil) => {
        hook.mockReturnValue(pret(exemplePremierDimanche(profil)))
        afficher(profil)
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          "Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept.",
        )
        const chiffres = screen.getByRole('table', {
          name: profil === 'ministere' ? "L'église cette semaine" : "Les chiffres de l'église",
        })
        expect(within(chiffres).getAllByText('Pas encore de saisie')).toHaveLength(6)
        expect(within(chiffres).getAllByText('0 sur 8')).toHaveLength(3)
        expect(
          within(screen.getByRole('region', { name: 'Dernière session' })).getByText(
            'Aucune session déclarée.',
          ),
        ).toBeInTheDocument()
        expect(
          within(screen.getByRole('region', { name: 'FIJ en Île-de-France' })).getByText(
            "La carte s'affichera quand FIJ aura saisi ses chiffres.",
          ),
        ).toBeInTheDocument()
        const ministeres = screen.getByRole('region', { name: 'Les ministères' })
        expect(within(ministeres).getAllByText('Aucune saisie')).toHaveLength(8)
        if (profil === 'berger' || profil === 'conseil' || profil === 'admin_plateforme') {
          expect(
            within(screen.getByRole('region', { name: 'À décider' })).getByText(
              'Aucun point ouvert.',
            ),
          ).toBeInTheDocument()
        }
      },
    )
  })
})
