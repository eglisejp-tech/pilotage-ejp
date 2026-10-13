import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { EmplacementGererIndicateurs } from '@/features/fiche/EmplacementGererIndicateurs'
import type { TypeCompte } from '@/lib/base'

function afficher(profil: TypeCompte) {
  render(
    <MemoryRouter>
      <EmplacementGererIndicateurs ministereId="m-1" ministereCode={null} profil={profil} />
    </MemoryRouter>,
  )
}

describe('emplacement « Gérer mes indicateurs » de « Ma fiche »', () => {
  it('le ministère a un lien vers « Mes indicateurs »', () => {
    afficher('ministere')
    expect(screen.getByRole('link', { name: 'Gérer mes indicateurs' })).toHaveAttribute(
      'href',
      '/ma-fiche/indicateurs',
    )
  })

  it.each<TypeCompte>(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'])(
    '%s : rien, même si la fiche pose l’emplacement',
    (profil) => {
      afficher(profil)
      expect(screen.queryByRole('link')).toBeNull()
    },
  )
})
