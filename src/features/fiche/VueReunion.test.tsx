import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { construireReunion } from '@/features/fiche/construireReunion'
import { VueReunion } from '@/features/fiche/VueReunion'
import type { EtatReunion } from '@/features/fiche/VueReunion'

function afficher(etat: EtatReunion, peutSaisir: boolean) {
  return render(
    <MemoryRouter>
      <VueReunion etat={etat} peutSaisir={peutSaisir} />
    </MemoryRouter>,
  )
}

const declaree: EtatReunion = {
  etat: 'donnees',
  reunion: construireReunion({
    date: '2026-10-12',
    heure: '20:00:00',
    objet: 'Préparer la soirée',
    decision_attendue: 'Valider la salle',
  }),
}

describe('VueReunion', () => {
  it('déclarée : « Prochaine réunion : lundi 12 oct., 20 h », l’objet et la décision attendue', () => {
    afficher(declaree, false)
    expect(screen.getByText(/Prochaine réunion :/)).toHaveTextContent(
      'Prochaine réunion : lundi 12 oct., 20 h',
    )
    expect(screen.getByText('Préparer la soirée')).toBeInTheDocument()
    expect(screen.getByText('Décision attendue : Valider la salle')).toBeInTheDocument()
  })

  it('le ministère a « Modifier », les autres profils aucun bouton', () => {
    const { unmount } = afficher(declaree, true)
    expect(screen.getByRole('link', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/saisir/reunion',
    )
    unmount()
    afficher(declaree, false)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('non renseignée : « Renseigner » pour le ministère', () => {
    afficher({ etat: 'donnees', reunion: null }, true)
    expect(screen.getByText('Non renseignée.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Renseigner' })).toHaveAttribute(
      'href',
      '/saisir/reunion',
    )
  })

  it('non renseignée : « Non renseignée. » sans aucun bouton pour le berger', () => {
    afficher({ etat: 'donnees', reunion: null }, false)
    expect(screen.getByText('Non renseignée.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('pendant le chargement : rien', () => {
    const { container } = afficher({ etat: 'chargement' }, true)
    expect(container).toBeEmptyDOMElement()
  })

  it('problème passager : le dit, avec « Réessayer »', () => {
    let appels = 0
    afficher({ etat: 'erreur', reessayer: () => (appels += 1) }, false)
    expect(screen.getByText(/La connexion a échoué/)).toBeInTheDocument()
    screen.getByRole('button', { name: 'Réessayer' }).click()
    expect(appels).toBe(1)
  })
})
