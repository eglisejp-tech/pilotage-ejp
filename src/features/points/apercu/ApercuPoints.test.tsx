import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApercuPoints } from '@/features/points/apercu/ApercuPoints'

function afficher(requete: string) {
  return render(
    <MemoryRouter initialEntries={[`/apercu/points${requete}`]}>
      <ApercuPoints />
    </MemoryRouter>,
  )
}

describe('aperçu des points', () => {
  it('par défaut : l’écran 05 du berger, avec ses cinq points ouverts', () => {
    afficher('')
    expect(screen.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
    expect(screen.getByRole('combobox', { name: 'Filtrer par ministère' })).toBeVisible()
  })

  it.each(['berger', 'conseil', 'admin_plateforme'])(
    'profil %s : le filtre et le tableau',
    (profil) => {
      afficher(`?profil=${profil}`)
      expect(screen.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
      expect(screen.getByRole('combobox')).toBeVisible()
    },
  )

  it('profil ministere : « Mes points » de Communication, sans filtre', () => {
    afficher('?profil=ministere')
    expect(screen.getByRole('heading', { level: 1, name: 'Mes points' })).toBeVisible()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('profil admin_eglise : « Page non disponible », aucun point', () => {
    afficher('?profil=admin_eglise')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeVisible()
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('etat=vide : premier usage', () => {
    afficher('?etat=vide')
    expect(screen.getByText('Aucun point ouvert.')).toBeVisible()
  })

  it('etat=chargement : le titre tout de suite, aria-busy', () => {
    const { container } = afficher('?etat=chargement')
    expect(screen.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('etat=erreur : « La connexion a échoué. Réessayez. » et « Réessayer »', () => {
    afficher('?etat=erreur')
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })

  it('vue=traites et ministere : comme l’adresse réelle', () => {
    afficher('?vue=traites&ministere=min-coordination')
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Traités (2)' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
