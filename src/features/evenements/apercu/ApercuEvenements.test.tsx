import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApercuEvenements } from '@/features/evenements/apercu/ApercuEvenements'

function afficher(requete: string) {
  return render(
    <MemoryRouter initialEntries={[`/apercu/evenements${requete}`]}>
      <ApercuEvenements />
    </MemoryRouter>,
  )
}

describe('aperçu des saisies d’événement et de réunion', () => {
  it('par défaut : le panneau d’ajout, avec le compte du ministère au-dessus du titre', () => {
    afficher('')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ajouter un événement')
    expect(screen.getByText('Ministère Communication')).toBeInTheDocument()
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
      expect(screen.queryByRole('button', { name: /Ajouter|Enregistrer/ })).toBeNull()
    },
  )

  it('profil ministère : le panneau, comme sans profil', () => {
    afficher('?profil=ministere&ecran=reunion')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Prochaine réunion')
  })
})
