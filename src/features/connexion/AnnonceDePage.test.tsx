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

/** Une page qui reste montée, et le panneau ou la fenêtre qui s'ouvre au-dessus d'elle. */
function PageEtPanneau({
  page,
  panneau,
  fenetre = false,
}: {
  page: string
  panneau?: string
  fenetre?: boolean
}) {
  return (
    <>
      <Ecran nom={page} />
      {panneau !== undefined ? <Ecran nom={panneau} fenetre={fenetre} /> : null}
    </>
  )
}

describe('AnnonceDePage : retour sur l’écran d’origine resté monté (m254)', () => {
  it('une fenêtre fermée au-dessus de sa page : la page se redit, même titre que la dernière annonce', () => {
    const { region, changer } = afficher(<Ecran key="connexion" nom="Connexion" />)
    changer(<PageEtPanneau key="fiche" page="Ma fiche" />)
    expect(region()).toHaveTextContent(/^Ma fiche$/)
    const premiere = region().firstElementChild
    // La saisie s'ouvre en fenêtre au-dessus de « Ma fiche », qui reste montée.
    changer(<PageEtPanneau key="fiche" page="Ma fiche" panneau="Chiffres du dimanche" fenetre />)
    expect(region().firstElementChild).toBe(premiere)
    expect(document.title).toBe('Chiffres du dimanche, Pilotage EJP')
    // « Retour » : la fenêtre se ferme, « Ma fiche » est dite de nouveau, dans un nouveau nœud.
    changer(<PageEtPanneau key="fiche" page="Ma fiche" />)
    expect(region()).toHaveTextContent(/^Ma fiche$/)
    expect(region().firstElementChild).not.toBe(premiere)
    expect(document.title).toBe('Ma fiche, Pilotage EJP')
  })

  it('un panneau en page entière fermé : l’écran d’origine s’annonce', () => {
    const { region, changer } = afficher(<Ecran key="connexion" nom="Connexion" />)
    changer(<PageEtPanneau key="comptes" page="Ministères et comptes" />)
    changer(
      <PageEtPanneau key="comptes" page="Ministères et comptes" panneau="Ajouter un ministère" />,
    )
    expect(region()).toHaveTextContent(/^Ajouter un ministère$/)
    changer(<PageEtPanneau key="comptes" page="Ministères et comptes" />)
    expect(region()).toHaveTextContent(/^Ministères et comptes$/)
  })

  it('une page couverte qui change de nom ne s’annonce qu’à son retour', () => {
    const { region, changer } = afficher(<Ecran key="connexion" nom="Connexion" />)
    changer(
      <PageEtPanneau
        key="page"
        page="Indicateurs d'un ministère"
        panneau="Ajouter un indicateur"
      />,
    )
    changer(
      <PageEtPanneau
        key="page"
        page="Indicateurs de Communication"
        panneau="Ajouter un indicateur"
      />,
    )
    expect(region()).toHaveTextContent(/^Ajouter un indicateur$/)
    changer(<PageEtPanneau key="page" page="Indicateurs de Communication" />)
    expect(region()).toHaveTextContent(/^Indicateurs de Communication$/)
  })
})
