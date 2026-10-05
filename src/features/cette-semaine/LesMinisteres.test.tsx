import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { simulerLargeur } from '@/test/largeur'
import { exempleCetteSemaine } from './exemple'
import { LesMinisteres } from './LesMinisteres'
import type { ProfilVue } from './types'

function afficher(profil: ProfilVue) {
  render(
    <MemoryRouter>
      <LesMinisteres
        ministeres={exempleCetteSemaine(profil).ministeres}
        avecColonnesConseil={profil === 'berger' || profil === 'conseil'}
      />
    </MemoryRouter>,
  )
  return screen.getByRole('region', { name: 'Les ministères' })
}

const ordre = [
  'Social',
  'Communication',
  'EJP Formation',
  'FIJ',
  'Jeunesse',
  'Prodiges Junior',
  'Coordination',
  'Intégration',
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LesMinisteres', () => {
  it('berger : tableau complet, du moins récent au plus récent, chaque nom ouvre la fiche', () => {
    const region = afficher('berger')
    const tableau = within(region).getByRole('table', { name: 'Les ministères' })
    expect(
      within(tableau)
        .getAllByRole('columnheader')
        .map((entete) => entete.textContent),
    ).toEqual([
      'Ministère',
      'Mise à jour',
      'Prochain événement',
      'Prochaine réunion',
      'Point ouvert',
    ])
    expect(
      within(tableau)
        .getAllByRole('rowheader')
        .map((nom) => nom.textContent),
    ).toEqual(ordre)

    const social = within(tableau).getByRole('row', { name: /^Social/ })
    expect(within(social).getByText('Il y a 24 jours')).toHaveClass('text-attention')
    expect(social).toHaveTextContent("14 nov., Collecte d'hiver")
    expect(social).toHaveTextContent('Non renseignée')
    expect(social).toHaveTextContent('Aucun')
    expect(within(social).getByRole('link', { name: 'Social' })).toHaveAttribute(
      'href',
      '/ministeres/soc',
    )
    const integration = within(tableau).getByRole('row', { name: /^Intégration/ })
    expect(within(integration).getByText('Urgente')).toHaveClass('text-alerte')
  })

  it('ministère : sans réunion ni point ouvert, seul son nom ouvre « Ma fiche »', () => {
    const region = afficher('ministere')
    expect(
      within(region)
        .getAllByRole('columnheader')
        .map((entete) => entete.textContent),
    ).toEqual(['Ministère', 'Mise à jour', 'Prochain événement'])
    const liens = within(region).getAllByRole('link')
    expect(liens).toHaveLength(1)
    expect(liens[0]).toHaveTextContent('Communication')
    expect(liens[0]).toHaveAttribute('href', '/ma-fiche')
  })

  it('administration : aucun nom cliquable', () => {
    const region = afficher('admin_eglise')
    expect(within(region).queryByRole('link')).not.toBeInTheDocument()
    expect(within(region).getAllByRole('columnheader')).toHaveLength(3)
  })

  it('berger sur tablette : les colonnes du conseil attendent 1024 px', () => {
    simulerLargeur(834)
    const region = afficher('berger')
    expect(within(region).getAllByRole('columnheader')).toHaveLength(3)
  })

  it('téléphone : une liste du nom et de la fraîcheur, toujours avec son libellé', () => {
    simulerLargeur(390)
    const region = afficher('berger')
    expect(within(region).queryByRole('table')).not.toBeInTheDocument()
    const lignes = within(region).getAllByRole('listitem')
    expect(lignes).toHaveLength(8)
    expect(lignes[0]).toHaveTextContent('SocialIl y a 24 jours')
    expect(lignes[7]).toHaveTextContent('IntégrationHier')
  })

  it('sans ministère actif : la phrase, ni tableau ni en-têtes vides', () => {
    render(<LesMinisteres ministeres={[]} avecColonnesConseil />)
    const region = screen.getByRole('region', { name: 'Les ministères' })
    expect(within(region).getByText("Aucun ministère actif pour l'instant.")).toBeInTheDocument()
    expect(within(region).queryByRole('table')).not.toBeInTheDocument()
    expect(within(region).queryByText('Du moins récent au plus récent')).not.toBeInTheDocument()
  })

  it("cellules vides : « Aucun événement prévu », « Non renseignée », « Aucun » ; nom d'événement masqué en encre-3", () => {
    const [premier] = exempleCetteSemaine('berger').ministeres
    render(
      <MemoryRouter>
        <LesMinisteres
          ministeres={[
            {
              ...premier!,
              prochainEvenement: { etat: 'aucun' },
              conseil: { prochaineReunion: null, pointOuvert: null },
            },
            {
              ...premier!,
              id: 'autre',
              nom: 'Autre',
              prochainEvenement: {
                etat: 'prevu',
                date: '14 nov.',
                nom: { texte: '[texte masqué par EJP Tech]', masque: true },
              },
            },
          ]}
          avecColonnesConseil
        />
      </MemoryRouter>,
    )
    const [vide, masque] = screen.getAllByRole('row').slice(1)
    expect(vide).toHaveTextContent('Aucun événement prévu')
    expect(vide).toHaveTextContent('Non renseignée')
    expect(within(vide!).getByText('Aucun')).toHaveClass('text-encre-3')
    expect(within(masque!).getByText('[texte masqué par EJP Tech]')).toHaveClass('text-encre-3')
  })
})
