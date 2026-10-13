import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AnnonceDePage } from '@/features/connexion/AnnonceDePage'
import { reinitialiserAnnonceDePage } from '@/features/connexion/changementEcran'
import { useTitrePage } from '@/features/connexion/useTitrePage'

function Ecran({ nom, fenetre = false }: { nom: string; fenetre?: boolean }) {
  useTitrePage(nom, { annoncer: !fenetre })
  return <h1>{nom}</h1>
}

function afficher(ecran: React.ReactElement) {
  const rendu = render(
    <>
      <AnnonceDePage />
      {ecran}
    </>,
  )
  const region = () => document.querySelector('[data-annonce-page]')!
  const changer = (suivant: React.ReactElement) =>
    rendu.rerender(
      <>
        <AnnonceDePage />
        {suivant}
      </>,
    )
  return { region, changer }
}

beforeEach(() => {
  act(() => reinitialiserAnnonceDePage())
})

afterEach(() => {
  act(() => reinitialiserAnnonceDePage())
})

describe('AnnonceDePage (m254)', () => {
  it('une région annoncée, vide au premier écran : le lecteur d’écran lit déjà le titre', () => {
    const { region } = afficher(<Ecran nom="Connexion" />)
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(region()).toHaveAttribute('aria-atomic', 'true')
    expect(region()).toBeEmptyDOMElement()
    expect(document.title).toBe('Connexion, Pilotage EJP')
  })

  it('un nouvel écran dit son nom dans la même région', () => {
    const { region, changer } = afficher(<Ecran nom="Code de vérification" />)
    const avant = region()
    changer(<Ecran key="fiche" nom="Ma fiche" />)
    expect(region()).toBe(avant)
    expect(region()).toHaveTextContent(/^Ma fiche$/)
    changer(<Ecran key="points" nom="Points" />)
    expect(region()).toHaveTextContent(/^Points$/)
  })

  it('une fenêtre ne s’annonce pas ; l’écran d’origine s’annonce s’il revient après elle', () => {
    const { region, changer } = afficher(<Ecran nom="Cette semaine" />)
    changer(<Ecran key="saisie" nom="Chiffres du dimanche" fenetre />)
    expect(region()).toBeEmptyDOMElement()
    changer(<Ecran key="retour" nom="Cette semaine" />)
    expect(region()).toHaveTextContent(/^Cette semaine$/)
  })
})
