import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MiseEnPage } from '@/app/MiseEnPage'
import { ONGLETS } from '@/features/navigation/profils'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { simulerLargeur } from '@/test/largeur'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Une page de ministère qui ouvre la saisie du dimanche, comme `/saisir/dimanche`. */
function Page({ onFermer, personne = true }: { onFermer: () => void; personne?: boolean }) {
  const [ouverte, setOuverte] = useState(true)
  return (
    <MemoryRouter>
      <MiseEnPage
        libelleCompte="Ministère Communication"
        onglets={ONGLETS.ministere}
        accueil="/"
        onSignOut={() => undefined}
        personne={personne ? { prenom: 'Marie D.', lienChangement: '/qui-utilise' } : undefined}
      >
        {ouverte ? (
          <PanneauSaisie
            surtitre="Chiffres du dimanche"
            titre="Dimanche 27 septembre"
            onFermer={() => {
              onFermer()
              setOuverte(false)
            }}
          >
            <label htmlFor="service">STARs au service</label>
            <input id="service" />
          </PanneauSaisie>
        ) : (
          <p>Accueil</p>
        )}
      </MiseEnPage>
    </MemoryRouter>
  )
}

describe('MiseEnPage : en-tête simplifié d’une saisie au téléphone (proposition 4, T69)', () => {
  it.each([360, 390, 599])(
    'à %s px : « Retour » et le compte sur une ligne, sans menu ni nom de l’outil',
    (largeur) => {
      simulerLargeur(largeur)
      render(<Page onFermer={() => undefined} />)
      const entete = screen.getByRole('banner')
      expect(within(entete).getByRole('button', { name: 'Retour' })).toBeVisible()
      expect(entete).toHaveTextContent('Compte connecté : Ministère Communication')
      // Un compte partagé : la personne déclarée reste visible (T56).
      expect(entete).toHaveTextContent('Vous : Marie D.')
      expect(screen.queryByRole('button', { name: 'Ouvrir le menu' })).toBeNull()
      expect(screen.queryByRole('link', { name: 'Pilotage EJP' })).toBeNull()
      // Un seul « Retour » : celui du panneau passe dans l'en-tête.
      expect(screen.getAllByRole('button', { name: 'Retour' })).toHaveLength(1)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dimanche 27 septembre')
    },
  )

  it('sans personne déclarée, le compte seul', () => {
    simulerLargeur(390)
    render(<Page onFermer={() => undefined} personne={false} />)
    const entete = screen.getByRole('banner')
    expect(entete).toHaveTextContent('Ministère Communication')
    expect(entete).not.toHaveTextContent('Vous :')
  })

  it('« Retour » ferme la saisie, puis l’en-tête complet revient', async () => {
    simulerLargeur(390)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(<Page onFermer={onFermer} />)
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toBeInTheDocument()
  })

  it('un champ changé : « Retour » de l’en-tête demande « Fermer sans enregistrer ? »', async () => {
    simulerLargeur(390)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(<Page onFermer={onFermer} />)
    await utilisateur.type(screen.getByLabelText('STARs au service'), '12')
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFermer).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })).toBeVisible()
  })

  it('à partir de 600 px : l’en-tête complet reste, « Retour » est dans le panneau', () => {
    simulerLargeur(834)
    render(<Page onFermer={() => undefined} />)
    // L'en-tête complet, en ses deux formats (le CSS choisit selon la largeur).
    expect(screen.getAllByRole('link', { name: 'Pilotage EJP' })).toHaveLength(2)
    const panneau = screen.getByRole('dialog', { name: 'Dimanche 27 septembre' })
    expect(within(panneau).getByRole('button', { name: 'Retour' })).toBeInTheDocument()
  })
})
