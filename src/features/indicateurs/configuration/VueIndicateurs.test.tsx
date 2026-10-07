import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ID_JEUNESSE,
  ID_KUMI,
  lecturesExemple,
} from '@/features/indicateurs/configuration/apercu/exemples'
import { construireConfiguration } from '@/features/indicateurs/configuration/construire'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import { VueIndicateurs } from '@/features/indicateurs/configuration/VueIndicateurs'
import type { TypeCompte } from '@/lib/base'
import { simulerLargeur } from '@/test/largeur'

function creationDe(surcharge: Partial<CreationPrevus> = {}): CreationPrevus {
  return {
    creer: vi.fn(() => Promise.resolve()),
    enCours: null,
    dernier: null,
    reussite: null,
    envoi: 0,
    refus: null,
    ...surcharge,
  }
}

function afficher(
  profil: TypeCompte = 'admin_eglise',
  creation: CreationPrevus = creationDe(),
  lectures = lecturesExemple(),
) {
  render(
    <MemoryRouter>
      <VueIndicateurs
        titre="Indicateurs"
        profil={profil}
        configuration={{ etat: 'donnees', donnees: construireConfiguration(lectures, profil) }}
        creation={creation}
        blocAValider={<p>Bloc à valider de L4</p>}
      />
    </MemoryRouter>,
  )
  return creation
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VueIndicateurs : tableau des ministères (7.1)', () => {
  it('titre, phrases de l’église et bloc « À valider » sous la phrase', () => {
    afficher('admin_eglise')
    expect(screen.getByRole('heading', { level: 1, name: 'Indicateurs' })).toBeInTheDocument()
    expect(screen.getByText('8 indicateurs actifs pour 5 ministères.')).toBeInTheDocument()
    expect(
      screen.getByText(
        "1 ajout attend la validation d'EJP Tech, depuis plus de 7 jours. Prévenez EJP Tech.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Bloc à valider de L4')).toBeInTheDocument()
  })

  it('EJP Tech ne lit pas le rappel « Prévenez EJP Tech »', () => {
    afficher('admin_plateforme')
    expect(screen.queryByText(/Prévenez EJP Tech/)).toBeNull()
    expect(screen.getByText(/1 ajout attend la validation d'EJP Tech\./)).toBeInTheDocument()
  })

  it('cinq colonnes, une ligne par ministère actif, chaque nom ouvre son écran', () => {
    afficher()
    const tableau = screen.getByRole('table', { name: 'Indicateurs' })
    expect(
      within(tableau)
        .getAllByRole('columnheader')
        .map((entete) => entete.textContent?.replace(/\?$/, '').trim()),
    ).toEqual(['Ministère', 'Indicateurs', 'Prévus', 'Saisie', 'Dernier changement'])
    const lignes = within(tableau).getAllByRole('row').slice(1)
    expect(lignes).toHaveLength(5)
    expect(within(lignes[3]!).getByRole('link', { name: 'Kumi' })).toHaveAttribute(
      'href',
      `/indicateurs/${ID_KUMI}`,
    )
    expect(within(tableau).queryByText('Ancien ministère')).toBeNull()
  })

  it('colonne « Prévus » : « 6 à créer » et « Créer », « Créés », « À choisir » et « Choisir », « Aucun prévu »', () => {
    afficher()
    const ligne = (nom: string) => screen.getByRole('link', { name: nom }).closest('tr')!
    expect(within(ligne('Kumi')).getByText('6 à créer')).toBeInTheDocument()
    expect(
      within(ligne('Kumi')).getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' }),
    ).toHaveTextContent('Créer')
    expect(within(ligne('Communication')).getByText('Créés')).toBeInTheDocument()
    expect(within(ligne('Communication')).queryByRole('button')).toBeNull()
    expect(within(ligne('Jeunesse')).getByText('À choisir')).toBeInTheDocument()
    expect(
      within(ligne('Jeunesse')).getByRole('link', { name: 'Choisir pour Jeunesse' }),
    ).toHaveAttribute('href', `/indicateurs/${ID_JEUNESSE}`)
    expect(within(ligne('Protocole')).getByText('Aucun prévu')).toBeInTheDocument()
  })

  it('« Créer » lance la création du modèle du ministère', async () => {
    const creation = afficher()
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' }),
    )
    expect(creation.creer).toHaveBeenCalledWith({ id: ID_KUMI, nom: 'Kumi' }, 'kumi')
  })

  it('pendant la création, le bouton reste actif pour le clavier mais dit qu’il travaille', () => {
    afficher('admin_eglise', creationDe({ enCours: ID_KUMI }))
    const bouton = screen.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' })
    expect(bouton).not.toBeDisabled()
    expect(bouton).toHaveAttribute('aria-disabled', 'true')
    expect(bouton).toHaveAttribute('aria-busy', 'true')
  })

  it('colonne « Saisie » : « 2 peu saisis » avec le mot, « Régulière » sinon', () => {
    afficher()
    const ligne = (nom: string) => screen.getByRole('link', { name: nom }).closest('tr')!
    expect(within(ligne('Communication')).getByText('2 peu saisis')).toBeInTheDocument()
    expect(within(ligne('Jeunesse')).getByText('Régulière')).toBeInTheDocument()
    expect(within(ligne('Kumi')).getByText('Rien à suivre')).toBeInTheDocument()
  })

  it('colonnes « Indicateurs » et « Dernier changement »', () => {
    afficher()
    const ligne = (nom: string) => screen.getByRole('link', { name: nom }).closest('tr')!
    expect(
      within(ligne('Communication')).getByText('5 sur 30, dont 1 ajouté par Communication'),
    ).toBeInTheDocument()
    expect(within(ligne('Communication')).getByText('5 oct.')).toBeInTheDocument()
    expect(within(ligne('Jeunesse')).getByText('Aucun')).toBeInTheDocument()
  })

  it('deux aides sur les en-têtes : « Indicateurs » (30 au plus) et « Prévus »', async () => {
    afficher()
    await userEvent.click(screen.getByRole('button', { name: 'Aide : Indicateurs' }))
    expect(screen.getByText(/« 8 sur 30 » : 8 suivis, 30 au plus par fiche\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aide : Prévus' })).toBeInTheDocument()
  })

  it('aucune valeur d’indicateur nulle part', () => {
    afficher()
    expect(screen.queryByText(/valeur/i)).toBeNull()
  })

  it('le message de réussite est annoncé, le refus de la base s’affiche tel quel', () => {
    afficher('admin_eglise', creationDe({ reussite: '6 indicateurs prévus créés.', envoi: 1 }))
    expect(
      screen.getByText('6 indicateurs prévus créés.', { selector: '[role="status"] p' }),
    ).toBeInTheDocument()
  })

  const REFUS =
    'La fiche a déjà « Activités réalisées » : retirez-le avant de créer les indicateurs prévus.'

  it('refus de la base : annoncé, avec son texte, dans la ligne du ministère concerné', () => {
    afficher('admin_eglise', creationDe({ dernier: ID_KUMI, refus: REFUS }))
    const alerte = screen.getByRole('alert')
    expect(alerte).toHaveTextContent('La fiche a déjà « Activités réalisées »')
    // Sous la ligne de Kumi : le bouton « Créer » précède le refus, et le ministère suivant le suit.
    const bouton = screen.getByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' })
    expect(bouton.compareDocumentPosition(alerte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const ligneKumi = screen.getByRole('link', { name: 'Kumi' }).closest('tr')!
    expect(ligneKumi.nextElementSibling).toContainElement(alerte)
    const protocole = screen.getByRole('link', { name: 'Protocole' })
    expect(
      alerte.compareDocumentPosition(protocole) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('refus de la base, sous 600 px : sous le ministère concerné dans la liste', () => {
    simulerLargeur(390)
    afficher('admin_eglise', creationDe({ dernier: ID_KUMI, refus: REFUS }))
    const kumi = screen.getByRole('link', { name: 'Kumi' }).closest('li')!
    expect(within(kumi).getByRole('alert')).toHaveTextContent(REFUS)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('refus pour un ministère absent de la liste : affiché au-dessus, jamais perdu', () => {
    afficher(
      'admin_eglise',
      creationDe({ dernier: '10000000-0000-4000-8000-0000000000ff', refus: REFUS }),
    )
    expect(screen.getByRole('alert')).toHaveTextContent(REFUS)
    expect(screen.queryByRole('table')?.contains(screen.getByRole('alert'))).toBe(false)
  })
})

describe('VueIndicateurs : téléphone', () => {
  it('sous 600 px, une liste à la place du tableau, avec les mêmes colonnes', async () => {
    simulerLargeur(390)
    const creation = afficher()
    expect(screen.queryByRole('table')).toBeNull()
    const kumi = screen.getByRole('link', { name: 'Kumi' }).closest('li')!
    expect(within(kumi).getByText('Prévus')).toBeInTheDocument()
    expect(within(kumi).getByText('6 à créer')).toBeInTheDocument()
    expect(within(kumi).getByText('Dernier changement')).toBeInTheDocument()
    await userEvent.click(within(kumi).getByRole('button', { name: /^Créer/ }))
    expect(creation.creer).toHaveBeenCalledTimes(1)
  })
})

describe('VueIndicateurs : états', () => {
  function afficherEtat(
    configuration: Parameters<typeof VueIndicateurs>[0]['configuration'],
    profil: TypeCompte = 'admin_eglise',
  ) {
    render(
      <MemoryRouter>
        <VueIndicateurs
          titre="Indicateurs"
          profil={profil}
          configuration={configuration}
          creation={creationDe()}
        />
      </MemoryRouter>,
    )
  }

  it('chargement : le titre reste, la zone est occupée', () => {
    afficherEtat({ etat: 'chargement' })
    expect(screen.getByRole('heading', { level: 1, name: 'Indicateurs' })).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('problème passager : bandeau et « Réessayer »', async () => {
    const reessayer = vi.fn()
    afficherEtat({ etat: 'erreur', reessayer })
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })

  it('aucun ministère : l’état vide dit où les créer, avec l’action pour l’administration seulement', () => {
    afficherEtat({ etat: 'donnees', donnees: { phrases: [], lignes: [] } }, 'admin_eglise')
    expect(
      screen.getByText("Aucun ministère. Créez d'abord les ministères dans Ministères et comptes."),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir Ministères et comptes' })).toHaveAttribute(
      'href',
      '/comptes',
    )
  })

  it('aucun ministère, vu par EJP Tech : la phrase, sans l’action qu’il ne peut pas faire', () => {
    afficherEtat({ etat: 'donnees', donnees: { phrases: [], lignes: [] } }, 'admin_plateforme')
    expect(screen.getByText(/^Aucun ministère\./)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ouvrir Ministères et comptes' })).toBeNull()
  })
})
