import { render, screen } from '@testing-library/react'
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
  it.each<ProfilVue>(['berger', 'conseil'])(
    '%s : phrase surlignée, « À décider » avec « Marquer traité », colonnes du conseil',
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
      expect(screen.getAllByRole('button', { name: 'Marquer traité' })).toHaveLength(3)
      expect(screen.getByRole('columnheader', { name: 'Point ouvert' })).toBeInTheDocument()
    },
  )

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

  it.each<ProfilVue>(['berger', 'conseil', 'ministere', 'admin_eglise'])(
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
    },
  )
})
