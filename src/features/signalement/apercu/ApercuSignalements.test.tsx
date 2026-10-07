import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApercuSignalements } from '@/features/signalement/apercu/ApercuSignalements'

function afficher(requete: string) {
  return render(
    <MemoryRouter initialEntries={[`/apercu/signalements${requete}`]}>
      <ApercuSignalements />
    </MemoryRouter>,
  )
}

describe('aperçu des signalements', () => {
  it('par défaut : le formulaire du ministère et « Vos derniers signalements »', () => {
    afficher('?ecran=saisie_reunion')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Signaler une difficulté')
    expect(screen.getByText('Écran concerné : Prochaine réunion')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vos derniers signalements' })).toBeInTheDocument()
  })

  it('premier usage : rien sous le formulaire', () => {
    afficher('?profil=ministere&vue=premier-usage')
    expect(screen.queryByRole('heading', { name: 'Vos derniers signalements' })).toBeNull()
  })

  it('EJP Tech : l’écran Modération, le bloc en tête, avec « Clore le signalement »', () => {
    afficher('?profil=admin_plateforme')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Modération')
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toBeInTheDocument()
    expect(screen.getByText('2 signalements ouverts')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Clore le signalement' })).toHaveLength(2)
  })

  it.each(['berger', 'conseil', 'admin_eglise'])(
    'profil %s : « Page non disponible », aucun signalement',
    (profil) => {
      afficher(`?profil=${profil}`)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeInTheDocument()
      expect(screen.queryByText(/signalement/i)).toBeNull()
    },
  )
})
