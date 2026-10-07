import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { EvenementLu } from '@/data/evenements'
import { construireAlerte } from '@/features/cette-semaine/construireAlerte'
import { EvenementsAConfirmer } from '@/features/cette-semaine/EvenementsAConfirmer'
import type { EtatAConfirmer } from '@/features/cette-semaine/EvenementsAConfirmer'

const ministeres = [
  { id: 'm-com', code: 'communication', nom: 'Communication', desactive_le: null },
  { id: 'm-coo', code: 'coordination', nom: 'Coordination', desactive_le: null },
]

function evenement(i: number, surcharge: Partial<EvenementLu> = {}): EvenementLu {
  return {
    id: `e${i}`,
    ministere_id: i % 2 === 0 ? 'm-com' : 'm-coo',
    titre: `Événement ${i}`,
    date: `2026-10-${String(10 + i).padStart(2, '0')}`,
    statut: 'attente_validation',
    jours: 4 + i,
    a_confirmer: true,
    reporte_du: null,
    ...surcharge,
  }
}

const donnees = (evenements: EvenementLu[]): EtatAConfirmer => ({
  etat: 'donnees',
  lignes: construireAlerte(evenements, ministeres),
})

function afficher(etat: EtatAConfirmer) {
  return render(
    <MemoryRouter>
      <EvenementsAConfirmer etat={etat} />
    </MemoryRouter>,
  )
}

describe('EvenementsAConfirmer', () => {
  it('une ligne : titre, ministère (vers sa fiche), date et texte des jours, sans aucun bouton d’action', () => {
    afficher(donnees([evenement(0, { titre: 'Soirée de louange', date: '2026-10-10', jours: 3 })]))
    expect(
      screen.getByRole('heading', { level: 2, name: 'Événements à confirmer' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Ces événements attendent encore leur validation/)).toBeInTheDocument()
    const ligne = screen.getByRole('listitem')
    expect(ligne).toHaveTextContent(
      '« Soirée de louange », Communication : samedi 10 oct., dans 3 jours',
    )
    expect(within(ligne).getByRole('link', { name: 'Communication' })).toHaveAttribute(
      'href',
      '/ministeres/m-com',
    )
    // Seuls l'aide du titre et le lien du ministère : jamais « Mettre à jour » ni « Marquer traité ».
    expect(screen.queryByRole('button', { name: /Mettre à jour|Marquer traité/ })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Aide : Événements à confirmer' }),
    ).toBeInTheDocument()
  })

  it('une date passée s’écrit avec les mots, la plus ancienne en tête', () => {
    afficher(
      donnees([
        evenement(2, { date: '2026-10-12', jours: 1 }),
        evenement(1, { titre: 'Passé', date: '2026-09-26', jours: -10 }),
      ]),
    )
    const lignes = screen.getAllByRole('listitem')
    expect(lignes[0]).toHaveTextContent('Passé')
    expect(lignes[0]).toHaveTextContent('date passée depuis 10 jours')
    expect(lignes[1]).toHaveTextContent('demain')
  })

  it('5 lignes, puis « Voir les 8 événements à confirmer » qui déplie la suite sur place', async () => {
    const utilisateur = userEvent.setup()
    afficher(donnees(Array.from({ length: 8 }, (_, i) => evenement(i))))
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    const bouton = screen.getByRole('button', { name: 'Voir les 8 événements à confirmer' })
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await utilisateur.click(bouton)
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Voir moins' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('5 événements ou moins : aucun bouton de dépliage', () => {
    afficher(donnees(Array.from({ length: 5 }, (_, i) => evenement(i))))
    expect(screen.queryByRole('button', { name: /Voir les/ })).toBeNull()
  })

  it('rien à confirmer : le bloc n’existe pas, ni titre ni cadre', () => {
    const { container } = afficher(donnees([]))
    expect(container).toBeEmptyDOMElement()
  })

  it('un événement qui n’est pas à confirmer n’entre jamais dans le bloc', () => {
    const { container } = afficher(donnees([evenement(1, { a_confirmer: false })]))
    expect(container).toBeEmptyDOMElement()
  })

  it('pendant le chargement : rien', () => {
    const { container } = afficher({ etat: 'chargement' })
    expect(container).toBeEmptyDOMElement()
  })

  it('problème passager : le dit sous le titre, avec « Réessayer »', async () => {
    let appels = 0
    afficher({ etat: 'erreur', reessayer: () => (appels += 1) })
    expect(screen.getByRole('heading', { name: 'Événements à confirmer' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(appels).toBe(1)
  })
})
