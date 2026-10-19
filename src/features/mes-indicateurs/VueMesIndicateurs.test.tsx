import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { lecturesNormales } from '@/features/mes-indicateurs/apercu/exemples'
import { construireMesIndicateurs } from '@/features/mes-indicateurs/construire'
import type { DonneesMesIndicateurs } from '@/features/mes-indicateurs/construire'
import { nomBoutonChoisir } from '@/features/mes-indicateurs/textes'
import { VueMesIndicateurs } from '@/features/mes-indicateurs/VueMesIndicateurs'
import { simulerLargeur } from '@/test/largeur'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VueMesIndicateurs : passage du palier de 600 px pendant une saisie', () => {
  it.each([
    [390, 834],
    [834, 390],
  ])(
    'de %s à %s px : le panneau reste le même, la saisie et le focus sont gardés',
    async (avant, apres) => {
      simulerLargeur(avant)
      const donnees: EtatBloc<DonneesMesIndicateurs> = {
        etat: 'donnees',
        donnees: construireMesIndicateurs(lecturesNormales()),
      }
      const envoyer = vi.fn(() => Promise.resolve())
      const retirer = vi.fn(() => Promise.resolve())
      const ecran = () => (
        <MemoryRouter>
          <VueMesIndicateurs
            titre="Mes indicateurs"
            donnees={donnees}
            envoyer={envoyer}
            retirer={retirer}
          />
        </MemoryRouter>
      )
      const { rerender } = render(ecran())
      const utilisateur = userEvent.setup()
      await utilisateur.click(screen.getByRole('button', { name: 'Ajouter un indicateur' }))
      await utilisateur.click(
        screen.getByRole('button', { name: nomBoutonChoisir('Demandes traitées') }),
      )
      const champ = screen.getByRole('textbox', { name: 'Pourquoi cet indicateur ?' })
      await utilisateur.type(champ, 'Voir les demandes menées à terme.')
      // Téléphone tourné ou fenêtre redimensionnée : le panneau change de forme, pas de contenu.
      simulerLargeur(apres)
      rerender(ecran())
      expect(screen.queryByRole('dialog') !== null).toBe(apres >= 600)
      expect(screen.getByRole('textbox', { name: 'Pourquoi cet indicateur ?' })).toBe(champ)
      expect(champ).toHaveValue('Voir les demandes menées à terme.')
      expect(champ).toHaveFocus()
      await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
      expect(screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })).toBeVisible()
    },
  )
})
