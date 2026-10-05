import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { simulerLargeur } from '@/test/largeur'
import { exempleCetteSemaine, exemplePremierDimanche } from './exemple'
import type { DonneesCetteSemaine, ProfilVue } from './types'
import { VueCetteSemaine } from './VueCetteSemaine'

function afficher(profil: ProfilVue, donnees: DonneesCetteSemaine = exempleCetteSemaine(profil)) {
  const rendu = render(
    <MemoryRouter>
      <VueCetteSemaine donnees={donnees} />
    </MemoryRouter>,
  )
  const titres = screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent)
  return { ...rendu, titres }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VueCetteSemaine', () => {
  it.each<ProfilVue>(['berger', 'conseil', 'admin_plateforme'])(
    '%s : phrase surlignée, « À décider » sans « Marquer traité » (T19), colonnes du conseil',
    (profil) => {
      const { container, titres } = afficher(profil)
      expect(container.querySelector('h1 mark')).toHaveTextContent('un point attend votre décision')
      expect(titres).toEqual([
        "Les chiffres de l'église",
        'À décider',
        "Bâtir l'Église, samedi 26 septembre",
        'FIJ en Île-de-France',
        'Les ministères',
      ])
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Point ouvert' })).toBeInTheDocument()
      const liens = within(screen.getByRole('region', { name: 'Les ministères' })).getAllByRole(
        'link',
      )
      expect(liens).toHaveLength(8)
      for (const lien of liens) expect(lien.getAttribute('href')).toMatch(/^\/ministeres\//)
    },
  )

  it('EJP Tech : la vue du berger, en lecture seule, sans bouton d’action (T29)', () => {
    const donnees = exempleCetteSemaine('admin_plateforme')
    expect(donnees.lectureSeule).toBe(true)
    expect(exempleCetteSemaine('berger').lectureSeule).toBe(false)
    afficher('admin_plateforme', donnees)
    const aDecider = screen.getByRole('region', { name: 'À décider' })
    // Garde de l'étape 5 : le bouton « Marquer traité » ne s'affiche jamais pour EJP Tech.
    expect(within(aDecider).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Marquer traité/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tous les points' })).toBeInTheDocument()
  })

  it('ministère : ni « À décider », ni surligneur, ni colonnes du conseil', () => {
    const { container, titres } = afficher('ministere')
    expect(container.querySelector('mark')).toBeNull()
    expect(titres).toEqual([
      "L'église cette semaine",
      "Bâtir l'Église, samedi 26 septembre",
      'FIJ en Île-de-France',
      'Les ministères',
    ])
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Point ouvert' })).not.toBeInTheDocument()
  })

  it("administration de l'église : la vue de l'église, sans action ni surligneur", () => {
    const { container, titres } = afficher('admin_eglise')
    expect(container.querySelector('mark')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi.",
    )
    expect(titres).not.toContain('À décider')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Prochaine réunion' }),
    ).not.toBeInTheDocument()
  })

  it('téléphone : « À décider » remonte après la phrase quand un point est urgent', () => {
    simulerLargeur(390)
    const { titres } = afficher('berger')
    expect(titres.slice(0, 2)).toEqual(['À décider', "Les chiffres de l'église"])
  })

  it('téléphone : sans point urgent, « À décider » garde sa place après les chiffres', () => {
    simulerLargeur(390)
    const donnees = exempleCetteSemaine('berger')
    const sansUrgence = {
      ...donnees,
      aDecider: {
        ...donnees.aDecider,
        points: donnees.aDecider.points.filter((point) => point.priorite !== 'urgente'),
        urgent: false,
      },
    }
    const { titres } = afficher('berger', sansUrgence)
    expect(titres.slice(0, 2)).toEqual(["Les chiffres de l'église", 'À décider'])
  })

  it.each<ProfilVue>(['berger', 'conseil', 'ministere', 'admin_eglise', 'admin_plateforme'])(
    '%s, premier dimanche : chaque bloc dit ce qui manque',
    (profil) => {
      afficher(profil, exemplePremierDimanche(profil))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        "Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept.",
      )
      expect(screen.getAllByText('Pas encore de saisie')).toHaveLength(6)
      expect(screen.getByText('Aucune session déclarée.')).toBeInTheDocument()
      expect(
        screen.getByText("La carte s'affichera quand FIJ aura saisi ses chiffres."),
      ).toBeInTheDocument()
      expect(screen.getAllByText('Aucune saisie')).toHaveLength(8)
      expect(screen.getAllByText('Aucun événement prévu')).toHaveLength(8)
      if (profil === 'berger' || profil === 'conseil' || profil === 'admin_plateforme') {
        expect(screen.getByText('Aucun point ouvert.')).toBeInTheDocument()
      }
    },
  )

  it("premier dimanche : aucun nombre à la place d'une valeur, la phrase prend la place de l'écart et de la courbe", () => {
    afficher('berger', exemplePremierDimanche('berger'))
    const tableau = screen.getByRole('table', { name: "Les chiffres de l'église" })
    const lignes = within(tableau).getAllByRole('row').slice(1)
    expect(lignes).toHaveLength(6)
    for (const ligne of lignes) {
      const cellule = within(ligne).getByText('Pas encore de saisie').closest('td')
      expect(cellule).toHaveAttribute('colspan', '3')
      expect(within(ligne).queryByRole('img')).not.toBeInTheDocument()
    }
    expect(lignes[0]).toHaveTextContent('0 sur 8')
    expect(lignes[3]).toHaveTextContent('0 dép.')
    expect(lignes[4]).toHaveTextContent("Aucune session pour l'instant")
  })

  it('un rassemblement jamais tenu (?session=autre) : son titre, sa phrase et ses liens', () => {
    const donnees: DonneesCetteSemaine = {
      ...exempleCetteSemaine('admin_eglise'),
      session: {
        etat: 'aucune_session_du_type',
        type: 'autre',
        titre: 'Autre rassemblement',
        autres: [{ libelle: "Voir Bâtir l'Église", href: '/?session=batir' }],
      },
    }
    afficher('admin_eglise', donnees)
    const region = screen.getByRole('region', { name: 'Autre rassemblement' })
    expect(region).toHaveTextContent("Aucun autre rassemblement pour l'instant.")
    expect(within(region).getByRole('link', { name: "Voir Bâtir l'Église" })).toBeInTheDocument()
  })

  describe('ministère sous 600 px', () => {
    it('trois chiffres, puis « Tout voir » déplie sur place les chiffres, la session, la carte et les ministères', async () => {
      simulerLargeur(390)
      const { titres } = afficher('ministere')
      expect(titres).toEqual(["L'église cette semaine"])
      const region = screen.getByRole('region', { name: "L'église cette semaine" })
      expect(
        within(region)
          .getAllByRole('listitem')
          .map((ligne) => ligne.firstElementChild?.firstElementChild?.textContent),
      ).toEqual(['STARs au service', 'STARs présents en FIJ', "Présents à Bâtir l'Église"])
      expect(within(region).queryByRole('img')).not.toBeInTheDocument()

      const bouton = screen.getByRole('button', { name: 'Tout voir' })
      expect(bouton).toHaveAttribute('aria-expanded', 'false')
      const controle = bouton.getAttribute('aria-controls') ?? ''
      expect(document.getElementById(controle)).toBeInTheDocument()

      await userEvent.click(bouton)
      expect(bouton).toHaveAttribute('aria-expanded', 'true')
      expect(bouton).toHaveAccessibleName('Voir moins')
      expect(
        screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent),
      ).toEqual([
        "L'église cette semaine",
        "Bâtir l'Église, samedi 26 septembre",
        'FIJ en Île-de-France',
        'Les ministères',
      ])
      expect(document.getElementById(controle)).toHaveTextContent('Présents à Anti-Dispersion')
      const liens = within(screen.getByRole('region', { name: 'Les ministères' })).getAllByRole(
        'link',
      )
      expect(liens).toHaveLength(1)
      expect(liens[0]).toHaveAccessibleName('Communication')
      expect(liens[0]).toHaveAttribute('href', '/ma-fiche')

      await userEvent.click(bouton)
      expect(bouton).toHaveAttribute('aria-expanded', 'false')
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    })

    it('premier dimanche : les trois chiffres disent ce qui manque', () => {
      simulerLargeur(390)
      afficher('ministere', exemplePremierDimanche('ministere'))
      const region = screen.getByRole('region', { name: "L'église cette semaine" })
      const lignes = within(region).getAllByRole('listitem')
      expect(lignes).toHaveLength(3)
      for (const ligne of lignes) expect(ligne).toHaveTextContent('Pas encore de saisie')
      // Même libellé qu'avec des données : seule la ligne secondaire dit ce qui manque.
      expect(lignes[2]).toHaveTextContent("Présents à Bâtir l'ÉgliseAucune session pour l'instant")
    })

    it('à partir de 600 px, les blocs sans « Tout voir »', () => {
      simulerLargeur(600)
      afficher('ministere')
      expect(screen.queryByRole('button', { name: 'Tout voir' })).not.toBeInTheDocument()
      expect(screen.getByRole('table', { name: "L'église cette semaine" })).toBeInTheDocument()
    })
  })
})
