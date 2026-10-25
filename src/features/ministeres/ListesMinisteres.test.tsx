import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { LigneListeMinistere } from '@/features/ministeres/construireListe'
import { ListeMinisteresTelephone } from '@/features/ministeres/ListeMinisteresTelephone'
import { TableauListeMinisteres } from '@/features/ministeres/TableauListeMinisteres'

// Audit d'accessibilité (faute A-04) : le lien d'un nom très court (« FIJ ») doit faire 44 px de
// large au moins, pas seulement 44 px de haut. jsdom ne mesure rien : on contrôle la classe, la
// mesure réelle est faite par l'audit avec la base (e2e/base/accessibilite.spec.ts).
const LIGNES: LigneListeMinistere[] = [
  {
    id: 'm1',
    nom: 'FIJ',
    description: null,
    href: '/ministeres/m1',
    fraicheur: { libelle: 'Aucune saisie', etat: 'alerte' },
    prochainEvenement: null,
    prochaineReunion: null,
    pointOuvert: null,
    prevusAChoisir: null,
  },
]

// T72 : le repère d'EJP Tech « Prévus : à choisir » sous le nom d'un ministère sans liste choisie.
const SANS_LISTE: LigneListeMinistere[] = [
  { ...LIGNES[0]!, id: 'm2', nom: 'Ministère Santé', prevusAChoisir: { href: '/indicateurs/m2' } },
  { ...LIGNES[0]!, id: 'm3', nom: 'Kumi' },
]

describe('repère « Prévus : à choisir » (T72)', () => {
  for (const [nom, Composant] of [
    ['le tableau', TableauListeMinisteres],
    ['la liste du téléphone', ListeMinisteresTelephone],
  ] as const) {
    it(`${nom} : un lien vers le choix pour le seul ministère sans liste`, () => {
      render(
        <MemoryRouter>
          <Composant ministeres={SANS_LISTE} idTitre="titre" />
        </MemoryRouter>,
      )
      const repere = screen.getByRole('link', { name: 'Prévus : à choisir pour Ministère Santé' })
      expect(repere).toHaveAttribute('href', '/indicateurs/m2')
      expect(screen.getAllByRole('link', { name: /^Prévus : à choisir/ })).toHaveLength(1)
    })
  }
})

describe('liens du nom dans la liste des ministères', () => {
  it('le tableau donne au lien une largeur minimale de 44 px', () => {
    render(
      <MemoryRouter>
        <TableauListeMinisteres ministeres={LIGNES} idTitre="titre" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'FIJ' })).toHaveClass('min-h-cible', 'min-w-cible')
  })

  it('la liste du téléphone donne au lien une largeur minimale de 44 px', () => {
    render(
      <MemoryRouter>
        <ListeMinisteresTelephone ministeres={LIGNES} idTitre="titre" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'FIJ' })).toHaveClass('min-h-cible', 'min-w-cible')
  })
})
