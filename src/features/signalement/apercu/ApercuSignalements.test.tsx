import { render, screen, within } from '@testing-library/react'
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
  it('par défaut : le formulaire du ministère et le lien « Voir mes signalements » (T77)', () => {
    afficher('?ecran=saisie_reunion')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Signaler une difficulté')
    expect(screen.getByText('Écran concerné : Prochaine réunion')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir mes signalements' })).toHaveAttribute(
      'href',
      '/signalements',
    )
    expect(screen.queryByRole('heading', { name: 'Vos derniers signalements' })).toBeNull()
  })

  it('« Mes signalements » de Coordination : « À vérifier », « En cours », puis les clos', async () => {
    afficher('?profil=ministere&vue=suivi')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mes signalements')
    const groupes = await screen.findAllByRole('heading', { level: 2 })
    expect(groupes.map((titre) => titre.textContent)).toEqual([
      'À vérifier',
      'En cours',
      'Clos ces 30 derniers jours',
    ])
    const aVerifier = screen.getByRole('region', { name: 'À vérifier' })
    expect(within(aVerifier).getByRole('group', { name: 'Est-ce réglé ?' })).toBeInTheDocument()
  })

  it('seulement des clos : « Aucun signalement ouvert. »', async () => {
    afficher('?profil=ministere&vue=suivi-clos')
    expect(await screen.findByText('Aucun signalement ouvert.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'À vérifier' })).toBeNull()
  })

  it('EJP Tech : l’écran Modération, le bloc en tête, ses trois groupes', async () => {
    afficher('?profil=admin_plateforme')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Modération')
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'À traiter' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'En attente du ministère' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Clos ces 30 derniers jours' })).toBeInTheDocument()
    expect(screen.getByText(/^\d+ signalements à traiter$/)).toBeInTheDocument()
  })

  it.each(['berger', 'conseil', 'admin_eglise'])(
    'profil %s : « Page non disponible », aucun signalement',
    (profil) => {
      afficher(`?profil=${profil}`)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Page non disponible',
        }),
      ).toBeInTheDocument()
      expect(screen.queryByText(/signalement/i)).toBeNull()
    },
  )
})
