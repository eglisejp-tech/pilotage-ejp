import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createMemoryRouter, Link, useNavigate } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import { useFermetureSaisie, useRepartirSaisie } from '@/features/saisie/fermetureSaisie'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { simulerLargeur } from '@/test/largeur'

afterEach(() => {
  vi.unstubAllGlobals()
})

function Panneau({ onFermer = () => undefined }: { onFermer?: () => void }) {
  return (
    <PanneauSaisie
      surtitre="Chiffres du dimanche"
      titre="Dimanche 27 septembre"
      onFermer={onFermer}
    >
      <label htmlFor="service">STARs au service</label>
      <input id="service" />
      <button type="submit">Enregistrer les chiffres</button>
    </PanneauSaisie>
  )
}

describe('PanneauSaisie à partir de 600 px', () => {
  it.each([600, 834, 1440])('à %s px : une fenêtre modale nommée par son titre', (largeur) => {
    simulerLargeur(largeur)
    render(<Panneau />)
    const fenetre = screen.getByRole('dialog', { name: 'Dimanche 27 septembre' })
    expect(fenetre).toHaveAttribute('aria-modal', 'true')
    expect(fenetre).toHaveClass('max-w-[460px]')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dimanche 27 septembre')
    expect(screen.getByText('Chiffres du dimanche')).toBeInTheDocument()
    expect(document.title).toBe('Dimanche 27 septembre, Pilotage EJP')
  })

  it('le focus entre dans le panneau, et Échap, « Retour » et le fond le ferment', async () => {
    simulerLargeur(834)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    const { container } = render(<Panneau onFermer={onFermer} />)
    expect(screen.getByRole('dialog')).toHaveFocus()
    await utilisateur.keyboard('{Escape}')
    expect(onFermer).toHaveBeenCalledTimes(1)
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFermer).toHaveBeenCalledTimes(2)
    await utilisateur.click(container.querySelector('[aria-hidden="true"]') as HTMLElement)
    expect(onFermer).toHaveBeenCalledTimes(3)
  })

  it('garde Tab et Maj+Tab dans le panneau', async () => {
    simulerLargeur(834)
    const utilisateur = userEvent.setup()
    render(
      <>
        <button type="button">Hors du panneau</button>
        <Panneau />
      </>,
    )
    const retour = screen.getByRole('button', { name: 'Retour' })
    const enregistrer = screen.getByRole('button', { name: 'Enregistrer les chiffres' })
    await utilisateur.tab()
    expect(retour).toHaveFocus()
    await utilisateur.tab({ shift: true })
    expect(enregistrer).toHaveFocus()
    await utilisateur.tab()
    expect(retour).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Hors du panneau' })).not.toHaveFocus()
  })

  it('rend le focus à la fermeture, là où il était', () => {
    simulerLargeur(834)
    const { rerender } = render(<button type="button">Saisir</button>)
    screen.getByRole('button', { name: 'Saisir' }).focus()
    rerender(
      <>
        <button type="button">Saisir</button>
        <Panneau />
      </>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()
    rerender(<button type="button">Saisir</button>)
    expect(screen.getByRole('button', { name: 'Saisir' })).toHaveFocus()
  })

  it('Échap ferme d’abord l’aide ouverte, puis le panneau', async () => {
    simulerLargeur(834)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(
      <PanneauSaisie titre="Chiffres du dimanche" onFermer={onFermer}>
        <LibelleAvecAide htmlFor="actifs" libelle="STARs actifs" code="dimanche.actifs" />
        <input id="actifs" />
      </PanneauSaisie>,
    )
    const aide = screen.getByRole('button', { name: 'Aide : STARs actifs' })
    await utilisateur.click(aide)
    expect(aide).toHaveAttribute('aria-expanded', 'true')
    await utilisateur.keyboard('{Escape}')
    expect(aide).toHaveAttribute('aria-expanded', 'false')
    expect(onFermer).not.toHaveBeenCalled()
    await utilisateur.keyboard('{Escape}')
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})

describe('PanneauSaisie quand la largeur passe le palier de 600 px', () => {
  it.each([
    [390, 834],
    [834, 390],
  ])(
    'de %s à %s px : le même champ, la saisie gardée, et la question avant de fermer',
    async (avant, apres) => {
      simulerLargeur(avant)
      const utilisateur = userEvent.setup()
      const onFermer = vi.fn()
      const { rerender } = render(<Panneau onFermer={onFermer} />)
      const champ = screen.getByLabelText('STARs au service')
      await utilisateur.type(champ, '12')
      // Téléphone tourné ou fenêtre redimensionnée : le cadre change de forme, pas de contenu.
      simulerLargeur(apres)
      rerender(<Panneau onFermer={onFermer} />)
      expect(screen.queryByRole('dialog') !== null).toBe(apres >= 600)
      expect(screen.getByLabelText('STARs au service')).toBe(champ)
      expect(champ).toHaveValue('12')
      // Le focus reste sur le champ : le clavier du téléphone ne se ferme pas.
      expect(champ).toHaveFocus()
      await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
      expect(onFermer).not.toHaveBeenCalled()
      expect(screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })).toBeVisible()
    },
  )
})

describe('PanneauSaisie sous 600 px', () => {
  it.each([360, 390, 599])('à %s px : une page entière, pas une fenêtre modale', (largeur) => {
    simulerLargeur(largeur)
    render(<Panneau />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('region', { name: 'Dimanche 27 septembre' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dimanche 27 septembre')
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('« Retour » ferme ; Échap ne ferme rien (aucun piège de focus en page entière)', async () => {
    simulerLargeur(390)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(<Panneau onFermer={onFermer} />)
    await utilisateur.keyboard('{Escape}')
    expect(onFermer).not.toHaveBeenCalled()
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('un champ changé : « Retour » demande confirmation avant de fermer (m265)', async () => {
    simulerLargeur(390)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(<Panneau onFermer={onFermer} />)
    await utilisateur.type(screen.getByLabelText('STARs au service'), '12')
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onFermer).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })).toHaveFocus()
    await utilisateur.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})

/** Un formulaire de panneau avec son « Annuler » et une réussite simulée. */
function FormulaireDeTest({ onAnnuler }: { onAnnuler: () => void }) {
  const annuler = useFermetureSaisie(onAnnuler)
  const [reussite, setReussite] = useState<string | null>(null)
  return (
    <>
      <label htmlFor="objet">Objet</label>
      <input id="objet" defaultValue="Bilan" />
      <label>
        <input type="checkbox" /> Urgent
      </label>
      <button type="button" onClick={() => setReussite('Réunion enregistrée.')}>
        Enregistrer
      </button>
      <button type="button" onClick={annuler}>
        Annuler
      </button>
      <MessageReussite message={reussite} />
    </>
  )
}

describe('PanneauSaisie : fermer une saisie modifiée (m265)', () => {
  function ouvrir(largeur = 834) {
    simulerLargeur(largeur)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    const { container } = render(
      <PanneauSaisie titre="Prochaine réunion" onFermer={onFermer}>
        <FormulaireDeTest onAnnuler={onFermer} />
      </PanneauSaisie>,
    )
    const fond = container.querySelector('[aria-hidden="true"]') as HTMLElement
    return { utilisateur, onFermer, fond }
  }
  const question = () => screen.queryByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })

  it('sans changement, Échap, « Retour », le fond et « Annuler » ferment directement', async () => {
    const { utilisateur, onFermer, fond } = ouvrir()
    await utilisateur.click(screen.getByLabelText('Objet'))
    await utilisateur.keyboard('{Escape}')
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    await utilisateur.click(fond)
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onFermer).toHaveBeenCalledTimes(4)
    expect(question()).toBeNull()
  })

  it('un texte changé : la question s’ouvre, le focus y entre, « Continuer la saisie » rend le focus', async () => {
    const { utilisateur, onFermer } = ouvrir()
    const objet = screen.getByLabelText('Objet')
    await utilisateur.type(objet, ' de septembre')
    const retour = screen.getByRole('button', { name: 'Retour' })
    await utilisateur.click(retour)
    expect(onFermer).not.toHaveBeenCalled()
    const fenetre = question()
    expect(fenetre).toHaveFocus()
    expect(fenetre).toHaveAccessibleDescription('Ce que vous avez saisi sera perdu.')
    // Le panneau derrière est inerte : ni le clavier ni un lecteur d'écran n'y vont.
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('inert')
    // Tab et Maj+Tab restent dans la question.
    await utilisateur.tab()
    expect(screen.getByRole('button', { name: 'Continuer la saisie' })).toHaveFocus()
    await utilisateur.tab()
    expect(screen.getByRole('button', { name: 'Fermer sans enregistrer' })).toHaveFocus()
    await utilisateur.tab()
    expect(screen.getByRole('button', { name: 'Continuer la saisie' })).toHaveFocus()
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
    expect(question()).toBeNull()
    expect(retour).toHaveFocus()
    expect(objet).toHaveValue('Bilan de septembre')
    expect(onFermer).not.toHaveBeenCalled()
  })

  it('Échap ouvre la question, un second Échap vaut « Continuer la saisie »', async () => {
    const { utilisateur, onFermer } = ouvrir()
    await utilisateur.click(screen.getByRole('checkbox'))
    await utilisateur.keyboard('{Escape}')
    expect(question()).not.toBeNull()
    await utilisateur.keyboard('{Escape}')
    expect(question()).toBeNull()
    expect(onFermer).not.toHaveBeenCalled()
  })

  it('le fond et « Annuler » posent la même question ; « Fermer sans enregistrer » ferme', async () => {
    const { utilisateur, onFermer, fond } = ouvrir()
    await utilisateur.type(screen.getByLabelText('Objet'), 'x')
    await utilisateur.click(fond)
    expect(question()).not.toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(question()).not.toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('un champ remis à sa valeur de départ ne compte pas comme changé', async () => {
    const { utilisateur, onFermer } = ouvrir()
    const objet = screen.getByLabelText('Objet')
    await utilisateur.type(objet, 'x')
    await utilisateur.type(objet, '{Backspace}')
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(question()).toBeNull()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('après une réussite, la saisie est enregistrée : fermer ne demande plus rien', async () => {
    const { utilisateur, onFermer } = ouvrir()
    await utilisateur.type(screen.getByLabelText('Objet'), ' de septembre')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Réunion enregistrée.')
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(question()).toBeNull()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})

/** Un choix qui arrive après l'ouverture, comme une lecture lente (les termes d'un calcul). */
function ChoixTardif({ onAnnuler }: { onAnnuler: () => void }) {
  const annuler = useFermetureSaisie(onAnnuler)
  const [pret, setPret] = useState(false)
  useEffect(() => {
    const minuterie = window.setTimeout(() => setPret(true), 10)
    return () => window.clearTimeout(minuterie)
  }, [])
  return (
    <>
      {pret ? (
        <>
          <label htmlFor="haut">Chiffre du haut</label>
          <select id="haut" defaultValue="">
            <option value="">Choisir</option>
            <option value="publications">Publications</option>
          </select>
        </>
      ) : null}
      <button type="button" onClick={annuler}>
        Annuler
      </button>
    </>
  )
}

/** Un champ que le formulaire remplit seul, une fois sa lecture arrivée. */
function RemplissageTardif({ onAnnuler }: { onAnnuler: () => void }) {
  const annuler = useFermetureSaisie(onAnnuler)
  const [valeur, setValeur] = useState('')
  const [lire, setLire] = useState(false)
  useEffect(() => {
    if (!lire) return
    const minuterie = window.setTimeout(() => setValeur('Bilan de septembre'), 20)
    return () => window.clearTimeout(minuterie)
  }, [lire])
  return (
    <>
      <label htmlFor="objet">Objet</label>
      <input id="objet" value={valeur} onChange={(e) => setValeur(e.target.value)} />
      <button type="button" onClick={() => setLire(true)}>
        Lire la dernière réunion
      </button>
      <button type="button" onClick={annuler}>
        Annuler
      </button>
    </>
  )
}

/** Un nombre changé par ses boutons, sans événement `input` sur le champ. */
function Compteur({ onAnnuler }: { onAnnuler: () => void }) {
  const annuler = useFermetureSaisie(onAnnuler)
  const [valeur, setValeur] = useState('3')
  return (
    <>
      <label htmlFor="presents">Présents</label>
      <input id="presents" value={valeur} onChange={(e) => setValeur(e.target.value)} />
      <button type="button" onClick={() => setValeur(String(Number(valeur) + 1))}>
        Ajouter un
      </button>
      <button type="button" onClick={() => setValeur(String(Number(valeur) - 1))}>
        Retirer un
      </button>
      <button type="button" onClick={annuler}>
        Annuler
      </button>
    </>
  )
}

/** Un choix qui remplit tout le formulaire, comme « Semaine » des chiffres FIJ. */
function ChoixSemaine({ onAnnuler }: { onAnnuler: () => void }) {
  const annuler = useFermetureSaisie(onAnnuler)
  const repartir = useRepartirSaisie()
  const [semaine, setSemaine] = useState('11')
  const [valeur, setValeur] = useState('7')
  return (
    <>
      <label htmlFor="semaine">Semaine</label>
      <select
        id="semaine"
        value={semaine}
        onChange={(evenement) => {
          repartir()
          setSemaine(evenement.target.value)
          setValeur(evenement.target.value === '4' ? '9' : '7')
        }}
      >
        <option value="11">Semaine du 11 oct.</option>
        <option value="4">Semaine du 4 oct.</option>
      </select>
      <label htmlFor="baptemes">Baptêmes</label>
      <input id="baptemes" value={valeur} onChange={(e) => setValeur(e.target.value)} />
      <button type="button" onClick={annuler}>
        Annuler
      </button>
    </>
  )
}

describe('PanneauSaisie : ce qui compte comme une saisie changée (m265)', () => {
  function ouvrir(Formulaire: (props: { onAnnuler: () => void }) => ReactNode, largeur = 834) {
    simulerLargeur(largeur)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(
      <PanneauSaisie titre="Ajouter un calcul" onFermer={onFermer}>
        <Formulaire onAnnuler={onFermer} />
      </PanneauSaisie>,
    )
    return { utilisateur, onFermer }
  }
  const question = () => screen.queryByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })

  it.each([834, 390])(
    'à %s px, un choix arrivé après l’ouverture puis changé sans geste (outil, assistant) : la question',
    async (largeur) => {
      const { utilisateur, onFermer } = ouvrir(ChoixTardif, largeur)
      const choix = await screen.findByLabelText<HTMLSelectElement>('Chiffre du haut')
      // Comme Playwright selectOption : la valeur change, puis `input` et `change`, sans geste.
      choix.value = 'publications'
      fireEvent.input(choix)
      fireEvent.change(choix)
      await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
      expect(question()).not.toBeNull()
      expect(onFermer).not.toHaveBeenCalled()
    },
  )

  it('un champ que le formulaire remplit seul après un geste ne compte pas', async () => {
    const { utilisateur, onFermer } = ouvrir(RemplissageTardif)
    await utilisateur.click(screen.getByLabelText('Objet'))
    await utilisateur.click(screen.getByRole('button', { name: 'Lire la dernière réunion' }))
    await waitFor(() => expect(screen.getByLabelText('Objet')).toHaveValue('Bilan de septembre'))
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(question()).toBeNull()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('« Ajouter un » change le nombre sans `input` : la question ; revenu au départ : rien', async () => {
    const { utilisateur, onFermer } = ouvrir(Compteur)
    await utilisateur.click(screen.getByRole('button', { name: 'Ajouter un' }))
    expect(screen.getByLabelText('Présents')).toHaveValue('4')
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(question()).not.toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Retirer un' }))
    expect(screen.getByLabelText('Présents')).toHaveValue('3')
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(question()).toBeNull()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('un bouton radio changé puis remis sur le premier choix ne compte pas', async () => {
    simulerLargeur(834)
    const utilisateur = userEvent.setup()
    const onFermer = vi.fn()
    render(
      <PanneauSaisie titre="Ajouter un indicateur" onFermer={onFermer}>
        <label>
          <input type="radio" name="rythme" defaultChecked /> Chaque mois
        </label>
        <label>
          <input type="radio" name="rythme" /> À ce jour
        </label>
      </PanneauSaisie>,
    )
    await utilisateur.click(screen.getByRole('radio', { name: 'À ce jour' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(question()).not.toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
    await utilisateur.click(screen.getByRole('radio', { name: 'Chaque mois' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(question()).toBeNull()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('une autre semaine remplit les champs : rien n’est saisi ; un chiffre tapé ensuite compte', async () => {
    const { utilisateur, onFermer } = ouvrir(ChoixSemaine)
    await utilisateur.selectOptions(screen.getByLabelText('Semaine'), '4')
    expect(screen.getByLabelText('Baptêmes')).toHaveValue('9')
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(question()).toBeNull()
    expect(onFermer).toHaveBeenCalledTimes(1)
    await utilisateur.type(screen.getByLabelText('Baptêmes'), '0')
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(question()).not.toBeNull()
  })
})

/** Une saisie ouverte à son adresse, fermée par un retour dans l'historique (`useRetourSaisie`). */
function SaisieAvecAdresse() {
  const naviguer = useNavigate()
  return (
    <PanneauSaisie titre="Prochaine réunion" onFermer={() => void naviguer(-1)}>
      <label htmlFor="objet">Objet</label>
      <input id="objet" defaultValue="" />
      <Link to="/signaler">Signaler une difficulté</Link>
    </PanneauSaisie>
  )
}

describe('PanneauSaisie : le bouton Précédent et les liens (m265)', () => {
  function ouvrir(largeur = 834) {
    simulerLargeur(largeur)
    const utilisateur = userEvent.setup()
    const routeur = createMemoryRouter(
      [
        { path: '/', element: <p>Ma fiche</p> },
        { path: '/saisir/reunion', element: <SaisieAvecAdresse /> },
        { path: '/signaler', element: <p>Signaler</p> },
      ],
      { initialEntries: ['/', '/saisir/reunion'], initialIndex: 1 },
    )
    render(<RouterProvider router={routeur} />)
    const precedent = () => act(() => routeur.navigate(-1))
    const adresse = () => routeur.state.location.pathname
    return { utilisateur, precedent, adresse }
  }
  const question = () => screen.queryByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })

  it.each([834, 390])(
    'à %s px, sans changement, Précédent quitte la saisie sans question',
    async (largeur) => {
      const { utilisateur, precedent, adresse } = ouvrir(largeur)
      await utilisateur.click(screen.getByLabelText('Objet'))
      await precedent()
      expect(question()).toBeNull()
      expect(adresse()).toBe('/')
    },
  )

  it.each([834, 390])(
    'à %s px, une saisie changée : Précédent pose la question, « Continuer la saisie » reste',
    async (largeur) => {
      const { utilisateur, precedent, adresse } = ouvrir(largeur)
      await utilisateur.type(screen.getByLabelText('Objet'), 'Bilan')
      await precedent()
      expect(question()).not.toBeNull()
      expect(question()).toHaveFocus()
      await utilisateur.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
      expect(question()).toBeNull()
      expect(adresse()).toBe('/saisir/reunion')
      expect(screen.getByLabelText('Objet')).toHaveValue('Bilan')
      // Une seconde fois : « Fermer sans enregistrer » laisse partir la navigation.
      await precedent()
      await utilisateur.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
      expect(adresse()).toBe('/')
      expect(screen.getByText('Ma fiche')).toBeInTheDocument()
    },
  )

  it('un lien qui quitte une saisie changée pose la même question', async () => {
    const { utilisateur, adresse } = ouvrir()
    await utilisateur.type(screen.getByLabelText('Objet'), 'Bilan')
    await utilisateur.click(screen.getByRole('link', { name: 'Signaler une difficulté' }))
    expect(question()).not.toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
    expect(adresse()).toBe('/signaler')
  })

  it('« Retour » puis « Fermer sans enregistrer » : une seule question, puis la page d’origine', async () => {
    const { utilisateur, adresse } = ouvrir()
    await utilisateur.type(screen.getByLabelText('Objet'), 'Bilan')
    await utilisateur.click(screen.getByRole('button', { name: 'Retour' }))
    expect(question()).not.toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
    expect(question()).toBeNull()
    expect(adresse()).toBe('/')
  })
})
