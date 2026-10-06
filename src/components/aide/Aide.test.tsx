import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Aide } from '@/components/aide/Aide'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import { TEXTES_AIDE } from '@/components/aide/textesAide'

function Formulaire() {
  return (
    <form>
      <LibelleAvecAide htmlFor="actifs" libelle="STARs actifs" code="dimanche.actifs" />
      <input id="actifs" />
      <LibelleAvecAide htmlFor="en-fij" libelle="Dont en FIJ" code="dimanche.enFij" />
      <input id="en-fij" />
      <button type="button">Autre commande</button>
    </form>
  )
}

const aideActifs = () => screen.getByRole('button', { name: 'Aide : STARs actifs' })
const aideEnFij = () => screen.getByRole('button', { name: 'Aide : Dont en FIJ' })
/** Région d'annonce de l'aide, retrouvée par `aria-controls` du bouton. */
const regionDe = (bouton: HTMLElement) =>
  document.getElementById(bouton.getAttribute('aria-controls') ?? '')

describe('Aide', () => {
  it('a pour nom accessible « Aide : <libellé> », aria-expanded et aria-controls', () => {
    render(<Formulaire />)
    const bouton = aideActifs()
    expect(bouton).toHaveAttribute('type', 'button')
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    // La région d'annonce existe avant l'ouverture, vide, pour que les lecteurs d'écran l'annoncent.
    const region = regionDe(bouton)
    expect(region).not.toBeNull()
    expect(region).toHaveAttribute('role', 'status')
    expect(region).toBeEmptyDOMElement()
  })

  it('a une zone cliquable de 44 px et un disque dont la forme tient dans une classe', () => {
    render(<Formulaire />)
    const bouton = aideActifs()
    // Le CSS n'est pas chargé en test : la mesure réelle est dans e2e/aide.spec.ts.
    expect(bouton).toHaveClass('size-cible')
    expect(bouton.querySelector('.aide-forme')).not.toBeNull()
    expect(bouton.querySelector('.aide-forme')).toHaveAttribute('aria-hidden', 'true')
  })

  it('un clic ouvre : aria-expanded passe à vrai et le texte est dans la région d’annonce', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'true')
    expect(regionDe(aideActifs())).toHaveTextContent(TEXTES_AIDE['dimanche.actifs'])
    // Une région d'annonce par aide, seule celle qui est ouverte contient du texte.
    const regions = screen.getAllByRole('status')
    expect(regions).toHaveLength(2)
    expect(regions.filter((region) => region.textContent !== '')).toHaveLength(1)
  })

  it('Entrée ouvre, le focus reste sur le bouton, Échap ferme sans bouger le focus', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.tab()
    expect(aideActifs()).toHaveFocus()
    await utilisateur.keyboard('{Enter}')
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'true')
    expect(aideActifs()).toHaveFocus()
    await utilisateur.keyboard('{Escape}')
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
    expect(regionDe(aideActifs())).toBeEmptyDOMElement()
    expect(aideActifs()).toHaveFocus()
  })

  it('Espace ouvre, puis un second Espace ferme', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.tab()
    await utilisateur.keyboard(' ')
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'true')
    await utilisateur.keyboard(' ')
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('un clic en dehors ferme', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    await utilisateur.click(document.body)
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('un second clic sur le bouton ferme', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    await utilisateur.click(aideActifs())
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('un clic sur la bulle ne la ferme pas', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    await utilisateur.click(screen.getByText(TEXTES_AIDE['dimanche.actifs']))
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'true')
  })

  it('le focus qui passe sur une autre commande ferme', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.tab()
    await utilisateur.keyboard('{Enter}')
    await utilisateur.tab()
    expect(screen.getByLabelText('STARs actifs')).toHaveFocus()
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('le survol seul n’ouvre pas', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.hover(aideActifs())
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('ouvrir une seconde aide ferme la première', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    await utilisateur.click(aideEnFij())
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
    expect(aideEnFij()).toHaveAttribute('aria-expanded', 'true')
    expect(regionDe(aideEnFij())).toHaveTextContent(TEXTES_AIDE['dimanche.enFij'])
  })

  it('le bouton est hors du <label> : un clic sur le bouton n’ouvre pas le champ', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    expect(aideActifs().closest('label')).toBeNull()
    await utilisateur.click(aideActifs())
    expect(screen.getByLabelText('STARs actifs')).not.toHaveFocus()
    // Le libellé reste relié à son champ.
    await utilisateur.click(screen.getByText('STARs actifs'))
    expect(screen.getByLabelText('STARs actifs')).toHaveFocus()
  })

  it('n’ajoute ni title, ni aria-describedby sur le champ, ni tabindex positif', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    expect(aideActifs()).not.toHaveAttribute('title')
    expect(aideActifs()).not.toHaveAttribute('tabindex')
    expect(screen.getByLabelText('STARs actifs')).not.toHaveAttribute('aria-describedby')
  })

  it('Échap ferme l’aide avant le conteneur qui l’écoute (le panneau de saisie)', async () => {
    const utilisateur = userEvent.setup()
    const surTouche = vi.fn()
    render(
      <div onKeyDown={surTouche}>
        <Formulaire />
      </div>,
    )
    await utilisateur.tab()
    await utilisateur.keyboard('{Enter}')
    await utilisateur.keyboard('{Escape}')
    expect(surTouche).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
    // Aide fermée : Échap arrive de nouveau au conteneur.
    await utilisateur.keyboard('{Escape}')
    expect(surTouche).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
  })

  it('ne garde aucun écouteur de document quand elle est fermée', async () => {
    const utilisateur = userEvent.setup()
    const ajout = vi.spyOn(document, 'addEventListener')
    const retrait = vi.spyOn(document, 'removeEventListener')
    render(<Formulaire />)
    const types = ['pointerdown', 'pointercancel', 'click', 'focusin', 'keydown']
    const compter = (appels: readonly (readonly unknown[])[]) =>
      appels.filter(([type]) => types.includes(String(type))).length
    const avant = compter(ajout.mock.calls)
    await utilisateur.click(aideActifs())
    expect(compter(ajout.mock.calls) - avant).toBe(types.length)
    const retiresAvant = compter(retrait.mock.calls)
    await utilisateur.keyboard('{Escape}')
    expect(compter(retrait.mock.calls) - retiresAvant).toBe(types.length)
    ajout.mockRestore()
    retrait.mockRestore()
  })

  it('un appui hors de la bulle ne la ferme pas, son clic la ferme (la page ne bouge pas avant le clic)', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    await utilisateur.pointer({ keys: '[MouseLeft>]', target: screen.getByText('Autre commande') })
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'true')
    await utilisateur.pointer({ keys: '[/MouseLeft]' })
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('au toucher, le focus donné après le relâchement ne ferme pas avant le clic', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    // Ordre d'un toucher : pointerdown, pointerup, puis le focus, puis le clic.
    const autre = screen.getByText('Autre commande')
    fireEvent.pointerDown(autre)
    fireEvent.pointerUp(autre)
    act(() => {
      autre.focus()
    })
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(autre)
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('après un geste annulé (défilement au doigt), le focus sur une autre commande ferme', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    const autre = screen.getByText('Autre commande')
    fireEvent.pointerDown(autre)
    fireEvent.pointerCancel(autre)
    act(() => {
      autre.focus()
    })
    expect(aideActifs()).toHaveAttribute('aria-expanded', 'false')
  })

  it('en placement flottant, l’aide enveloppe son bouton et sa bulle sans <label>', async () => {
    const utilisateur = userEvent.setup()
    render(
      <p>
        Somme de l'année{' '}
        <Aide code="fiche.sommeAnnee" libelle="Somme de l'année" placement="flottante" />
      </p>,
    )
    const bouton = screen.getByRole('button', { name: "Aide : Somme de l'année" })
    await utilisateur.click(bouton)
    const region = regionDe(bouton)
    expect(region).toHaveTextContent(TEXTES_AIDE['fiche.sommeAnnee'])
    expect(region?.firstElementChild).toHaveAttribute('data-cote')
    expect(region?.firstElementChild).toHaveClass('absolute')
  })

  it('en placement flux, la bulle prend la largeur de la ligne, sous le libellé', async () => {
    const utilisateur = userEvent.setup()
    render(<Formulaire />)
    await utilisateur.click(aideActifs())
    expect(regionDe(aideActifs())).toHaveClass('basis-full')
    expect(regionDe(aideActifs())?.firstElementChild).not.toHaveClass('absolute')
  })
})
