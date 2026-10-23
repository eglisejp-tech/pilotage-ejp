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
          name: 'Page non disponible',
        }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Ajouter|Enregistrer/ })).toBeNull()
    },
  )

  it('termine : la mise à jour d’un événement passé, avec « Heure de début (facultatif) » (T68)', () => {
    afficher('?ecran=termine')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Mettre à jour l'événement")
    expect(screen.getByLabelText('Heure prévue (facultatif)')).toHaveValue('19:00')
    expect(screen.getByLabelText('Heure de début (facultatif)')).toHaveValue('')
  })

  it('profil ministère : le panneau, comme sans profil', () => {
    afficher('?profil=ministere&ecran=reunion')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Prochaine réunion')
  })
})
