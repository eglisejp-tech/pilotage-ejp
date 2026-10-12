import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApercuNouveauPoint } from '@/features/nouveau-point/apercu/ApercuNouveauPoint'

function afficher(requete: string) {
  return render(
    <MemoryRouter initialEntries={[`/apercu/nouveau-point${requete}`]}>
      <ApercuNouveauPoint />
    </MemoryRouter>,
  )
}

describe('aperçu de « Nouveau point d’attention »', () => {
  it('par défaut : le formulaire, avec le compte du ministère au-dessus du titre', () => {
    afficher('')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Nouveau point d'attention")
    expect(screen.getByText('Ministère Communication')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer le point' })).toBeInTheDocument()
  })

  it('« sans-mention » : une phrase à la place des cases', () => {
    afficher('?ecran=sans-mention')
    expect(screen.getByText('Aucun autre ministère actif à mentionner.')).toBeInTheDocument()
  })

  it('« probleme » : « Réessayer » à la place du formulaire', () => {
    afficher('?ecran=probleme')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Créer le point' })).toBeNull()
  })

  it.each(['berger', 'conseil', 'admin_eglise', 'ejp_tech'])(
    'profil %s : « Page non disponible », aucun bouton de saisie',
    (profil) => {
      afficher(`?profil=${profil}`)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Créer le point' })).toBeNull()
    },
  )
})
