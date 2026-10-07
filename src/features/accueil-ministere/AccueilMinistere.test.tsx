import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BlocVosPoints } from '@/features/accueil-ministere/BlocVosPoints'
import { BlocVosSaisies } from '@/features/accueil-ministere/BlocVosSaisies'
import { etatAffiche } from '@/features/accueil-ministere/etatLigne'
import {
  exempleAccueil,
  LIGNE_BATIR_FAITE,
  LIGNE_DIMANCHE_A_FAIRE,
  LIGNE_DIMANCHE_FAIT,
  LIGNE_EVENEMENT_A_CONFIRMER,
  LIGNE_EVENEMENT_MENTIONNE,
  LIGNE_REUNION_A_FAIRE,
  LIGNE_REUNION_FAITE,
  MINISTERE_EXEMPLE,
  POINTS_EXEMPLE,
} from '@/features/accueil-ministere/exempleAccueil'
import { OuvertureMinistere } from '@/features/accueil-ministere/OuvertureMinistere'
import { VueCetteSemaine } from '@/features/cette-semaine/VueCetteSemaine'
import { exempleCetteSemaine } from '@/features/cette-semaine/exemple'
import type { EtatBloc, PointFiche } from '@/features/fiche/modeleFiche'
import { AvecRequetes } from '@/test/AvecRequetes'
import { simulerLargeur } from '@/test/largeur'

const semaine = { numero: 39, periode: 'du 21 au 27 sept.' }

function dans(enfant: ReactNode) {
  return render(
    <AvecRequetes>
      <MemoryRouter>{enfant}</MemoryRouter>
    </AvecRequetes>,
  )
}

beforeEach(() => {
  simulerLargeur(1440)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('etatAffiche', () => {
  it('sépare le mot d’état du détail écrit par le lot', () => {
    expect(etatAffiche(LIGNE_DIMANCHE_FAIT)).toEqual({ mot: 'fait', texte: '10 au service' })
    expect(etatAffiche(LIGNE_REUNION_A_FAIRE)).toEqual({
      mot: 'a_faire',
      texte: 'Date non confirmée',
    })
    expect(etatAffiche(LIGNE_EVENEMENT_A_CONFIRMER)).toEqual({
      mot: 'a_faire',
      texte: 'En attente de validation, dans 3 jours',
    })
    expect(etatAffiche(LIGNE_DIMANCHE_A_FAIRE)).toEqual({ mot: 'a_faire', texte: null })
  })

  it('une ligne sans bouton (mentionné) n’a pas de mot d’état', () => {
    expect(etatAffiche(LIGNE_EVENEMENT_MENTIONNE)).toEqual({
      mot: null,
      texte: 'Mentionné par Intégration : en attente de validation, dans 2 jours',
    })
  })
})

describe('BlocVosSaisies', () => {
  it('une ligne par saisie : libellé, mot d’état écrit, détail et bouton nommé avec la ligne', () => {
    dans(
      <BlocVosSaisies
        lignes={[
          LIGNE_DIMANCHE_FAIT,
          LIGNE_BATIR_FAITE,
          LIGNE_REUNION_A_FAIRE,
          LIGNE_EVENEMENT_A_CONFIRMER,
          LIGNE_EVENEMENT_MENTIONNE,
        ]}
      />,
    )
    const bloc = screen.getByRole('region', { name: 'Vos saisies' })
    const lignes = within(bloc).getAllByRole('listitem')
    expect(lignes).toHaveLength(5)
    expect(lignes[0]).toHaveTextContent('Chiffres du dimanche 27 sept.Fait10 au service')
    expect(lignes[2]).toHaveTextContent('Prochaine réunionÀ faireDate non confirmée')

    const corriger = within(lignes[0] as HTMLElement).getByRole('link')
    expect(corriger).toHaveTextContent('Corriger')
    expect(corriger).toHaveAccessibleName('Corriger : Chiffres du dimanche 27 sept.')
    expect(corriger).toHaveAttribute('href', '/saisir/dimanche?date=2026-09-27')
    expect(
      within(lignes[2] as HTMLElement).getByRole('link', {
        name: 'Renseigner : Prochaine réunion',
      }),
    ).toHaveAttribute('href', '/saisir/reunion')
    expect(
      within(lignes[3] as HTMLElement).getByRole('link', { name: /^Mettre à jour : / }),
    ).toHaveAttribute('href', '/saisir/evenement/louange')

    // Un événement qui mentionne seulement le ministère : une ligne sans bouton ni mot d'état.
    const mentionne = lignes[4] as HTMLElement
    expect(within(mentionne).queryByRole('link')).not.toBeInTheDocument()
    expect(mentionne).toHaveTextContent('Mentionné par Intégration')
    expect(mentionne).not.toHaveTextContent(/Fait|À faire/)
  })
})

describe('BlocVosPoints', () => {
  const afficher = (bloc: EtatBloc<PointFiche[]>) =>
    dans(
      <BlocVosPoints bloc={bloc} compte={{ type: 'ministere', ministereId: MINISTERE_EXEMPLE }} />,
    )

  it('titre, « Créés ou mentionnés », aide `accueil.points` hors du titre, puis les points', async () => {
    afficher({ etat: 'donnees', donnees: POINTS_EXEMPLE })
    const bloc = screen.getByRole('region', { name: 'Vos points' })
    expect(within(bloc).getByRole('heading', { level: 2 })).toHaveTextContent(/^Vos points$/)
    expect(bloc).toHaveTextContent('Créés ou mentionnés')
    expect(
      within(bloc)
        .getAllByRole('heading', { level: 3 })
        .map((t) => t.textContent),
    ).toEqual(['Salle pour la soirée de louange', 'Visuels pour Welcome Prodiges'])
    expect(bloc).toHaveTextContent('Mentionné par Intégration.')

    const aide = within(bloc).getByRole('button', { name: 'Aide : Vos points' })
    await userEvent.click(aide)
    expect(aide).toHaveAttribute('aria-expanded', 'true')
    expect(bloc).toHaveTextContent(
      'Les points créés par votre ministère ou qui le mentionnent. Un point traité reste affiché 7 jours.',
    )
    // Les boutons de chaque point sont ceux d'`ActionsPoint` (étape 5) : leur pose est vérifiée
    // par `PoseActionsPoint.test.tsx`, avec les propriétés qu'elle lui donne.
  })

  it('tout est fait : « Aucun point ouvert pour votre ministère. »', () => {
    afficher({ etat: 'donnees', donnees: [] })
    expect(screen.getByRole('region', { name: 'Vos points' })).toHaveTextContent(
      'Aucun point ouvert pour votre ministère.',
    )
  })

  it('problème passager : le titre reste, « Réessayer » relance la lecture', async () => {
    const reessayer = vi.fn()
    afficher({ etat: 'erreur', reessayer })
    expect(screen.getByRole('heading', { name: 'Vos points' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })
})

describe('OuvertureMinistere', () => {
  it('surtitre, phrase surlignée, bouton jaune et secondaires', () => {
    const { container } = dans(
      <OuvertureMinistere semaine={semaine} ouverture={exempleAccueil().ouverture} />,
    )
    expect(screen.getByText('Semaine 39, du 21 au 27 sept.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Vos chiffres sont à jour. Il reste la date de la prochaine réunion.',
    )
    expect(container.querySelector('h1 mark')).toHaveTextContent(
      'Il reste la date de la prochaine réunion',
    )
    const actions = screen.getByRole('navigation', { name: 'Saisies à faire' })
    expect(
      within(actions)
        .getAllByRole('link')
        .map((lien) => lien.textContent),
    ).toEqual(['Renseigner la prochaine réunion', 'Saisir une session', 'Nouveau point'])
    expect(within(actions).getByRole('link', { name: 'Nouveau point' })).toHaveAttribute(
      'href',
      '/saisir/point',
    )
    expect(
      within(actions).getByRole('link', { name: 'Renseigner la prochaine réunion' }),
    ).toHaveClass('bg-lumiere')
    // La note de conception de 07 ne s'affiche pas.
    expect(screen.queryByText(/Le dimanche midi/)).not.toBeInTheDocument()
  })

  it('tout est à jour : ni surligneur ni bouton jaune', () => {
    const { container } = dans(
      <OuvertureMinistere
        semaine={semaine}
        ouverture={
          exempleAccueil([LIGNE_DIMANCHE_FAIT, LIGNE_BATIR_FAITE, LIGNE_REUNION_FAITE]).ouverture
        }
      />,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Tout est à jour pour la semaine 39.',
    )
    expect(container.querySelector('mark')).toBeNull()
    expect(container.querySelector('.bg-lumiere')).toBeNull()
    expect(screen.getAllByRole('link').map((lien) => lien.textContent)).toEqual([
      'Saisir une session',
      'Nouveau point',
    ])
  })
})

describe('VueCetteSemaine avec l’accueil du ministère', () => {
  const titres = () =>
    screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent ?? '')

  it('ordinateur : ouverture, « Vos saisies », « Vos points », puis les blocs de l’église', () => {
    dans(<VueCetteSemaine donnees={exempleCetteSemaine('ministere')} accueil={exempleAccueil()} />)
    expect(titres()).toEqual([
      'Vos saisies',
      'Vos points',
      "L'église cette semaine",
      "Bâtir l'Église, samedi 26 septembre",
      'FIJ en Île-de-France',
      'Les ministères',
    ])
    expect(screen.queryByRole('region', { name: 'À décider' })).not.toBeInTheDocument()
  })

  it('téléphone : « Vos saisies » et « Vos points » avant « L’église cette semaine » et « Tout voir »', () => {
    simulerLargeur(390)
    dans(<VueCetteSemaine donnees={exempleCetteSemaine('ministere')} accueil={exempleAccueil()} />)
    expect(titres()).toEqual(['Vos saisies', 'Vos points', "L'église cette semaine"])
    expect(screen.getByRole('button', { name: 'Tout voir' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('les autres profils ne reçoivent ni l’ouverture de 07 ni ses blocs', () => {
    dans(<VueCetteSemaine donnees={exempleCetteSemaine('admin_eglise')} />)
    expect(titres()).not.toContain('Vos saisies')
    expect(titres()).not.toContain('Vos points')
    expect(screen.queryByRole('navigation', { name: 'Saisies à faire' })).not.toBeInTheDocument()
  })
})
