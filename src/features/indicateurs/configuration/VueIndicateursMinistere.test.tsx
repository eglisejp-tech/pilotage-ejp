import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  ID_COMMUNICATION,
  ID_JEUNESSE,
  ID_KUMI,
  ID_PROTOCOLE,
  lecturesExemple,
} from '@/features/indicateurs/configuration/apercu/exemples'
import { construireMinistere } from '@/features/indicateurs/configuration/construire'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import type { ResultatConfigurationMinistere } from '@/features/indicateurs/configuration/useLecturesConfiguration'
import { VueIndicateursMinistere } from '@/features/indicateurs/configuration/VueIndicateursMinistere'
import type { TypeCompte } from '@/lib/base'

function creationDe(surcharge: Partial<CreationPrevus> = {}): CreationPrevus {
  return {
    creer: vi.fn(() => Promise.resolve()),
    enCours: null,
    reussite: null,
    envoi: 0,
    refus: null,
    ...surcharge,
  }
}

function afficherMinistere(
  id: string,
  creation = creationDe(),
  profil: TypeCompte = 'admin_eglise',
) {
  const donnees = construireMinistere(id, lecturesExemple())
  if (donnees === null) throw new Error('ministère d’exemple absent')
  return afficherEtat({ etat: 'pret', donnees }, creation, profil)
}

function afficherEtat(
  ministere: ResultatConfigurationMinistere,
  creation = creationDe(),
  profil: TypeCompte = 'admin_eglise',
) {
  render(
    <MemoryRouter>
      <VueIndicateursMinistere
        titre="Indicateurs d'un ministère"
        profil={profil}
        ministere={ministere}
        creation={creation}
      />
    </MemoryRouter>,
  )
  return creation
}

describe('VueIndicateursMinistere : un ministère qui suit des indicateurs (7.2)', () => {
  it('titre avec le nom du ministère, titre de l’onglet, retour à la liste, phrase', () => {
    afficherMinistere(ID_COMMUNICATION)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Indicateurs de Communication' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('Indicateurs de Communication, Pilotage EJP')
    expect(screen.getByRole('link', { name: 'Tous les indicateurs' })).toHaveAttribute(
      'href',
      '/indicateurs',
    )
    expect(
      screen.getByText(
        'Communication suit 5 indicateurs sur 30 au plus : 4 prévus par la coordination et 1 ajouté par Communication.',
      ),
    ).toBeInTheDocument()
  })

  it('sections « Chaque mois », « À ce jour » et « Calculs », rangées', () => {
    afficherMinistere(ID_COMMUNICATION)
    const titres = screen.getAllByRole('heading', { level: 2 }).map((titre) => titre.textContent)
    expect(titres).toEqual(['Chaque mois', 'À ce jour', 'Calculs'])
    const mois = screen.getByRole('region', { name: 'Chaque mois' })
    expect(
      within(mois)
        .getAllByRole('listitem')
        .map((ligne) => ligne.querySelector('span')?.textContent),
    ).toEqual(['Demandes reçues', 'Publications', 'Visuels livrés'])
  })

  it('une ligne : définition, mentions, usage', () => {
    afficherMinistere(ID_COMMUNICATION)
    const ligne = screen
      .getByText('Publications', { selector: 'span.font-semibold' })
      .closest('li')!
    expect(
      within(ligne).getByText("Publications : ce qu'on compte, dans l'exemple."),
    ).toBeInTheDocument()
    expect(within(ligne).getByText('Saisi 4 mois sur 5, dernier le 2 oct.')).toBeInTheDocument()
    const corrigee = screen
      .getByText('Demandes reçues', { selector: 'span.font-semibold' })
      .closest('li')!
    expect(within(corrigee).getByText('libellé corrigé le 5 oct.')).toBeInTheDocument()
    expect(within(corrigee).getByText('Jamais saisi')).toHaveClass('text-attention')
  })

  it('un ajout à valider : mentions, durée, lien « Voir dans À valider » vers le bloc', () => {
    afficherMinistere(ID_COMMUNICATION)
    const ligne = screen
      .getByText('Projets en cours', { selector: 'span.font-semibold' })
      .closest('li')!
    expect(
      within(ligne).getByText(/suggestion · ajouté par Communication le 28 sept\./),
    ).toBeInTheDocument()
    expect(within(ligne).getByText(/à valider par EJP Tech depuis 9 jours/)).toBeInTheDocument()
    expect(within(ligne).getByRole('link', { name: 'Voir dans À valider' })).toHaveAttribute(
      'href',
      '/indicateurs#a-valider',
    )
  })

  it('un calcul : « Se calcule tout seul », jamais d’usage', () => {
    afficherMinistere(ID_COMMUNICATION)
    const calculs = screen.getByRole('region', { name: 'Calculs' })
    expect(within(calculs).getByText('Se calcule tout seul')).toBeInTheDocument()
    expect(within(calculs).getByText('calcul : taux')).toBeInTheDocument()
  })

  it('« Retirés (2) », replié, avec la date et le motif', async () => {
    afficherMinistere(ID_COMMUNICATION)
    const resume = screen.getByText('Retirés (2)')
    expect(resume.closest('details')).not.toHaveAttribute('open')
    await userEvent.click(resume)
    expect(screen.getByText('Retiré le 3 oct. : doublon.')).toBeVisible()
    expect(screen.getByText('Refusé le 1 oct.')).toBeVisible()
  })

  it('une seule aide d’usage pour tout l’écran', () => {
    afficherMinistere(ID_COMMUNICATION)
    expect(screen.getAllByRole('button', { name: 'Aide : Usage' })).toHaveLength(1)
  })

  it('prévus créés : aucun bloc « Prévus par la coordination »', () => {
    afficherMinistere(ID_COMMUNICATION)
    expect(screen.queryByRole('heading', { name: 'Prévus par la coordination' })).toBeNull()
  })

  it('aucune action tant que le lot L3b ne les pose pas, jamais une valeur', () => {
    afficherMinistere(ID_COMMUNICATION)
    expect(screen.queryByRole('button', { name: /Ajouter|Corriger|Remplacer|Retirer/ })).toBeNull()
    expect(screen.queryByText(/valeur/i)).toBeNull()
  })
})

describe('VueIndicateursMinistere : bloc « Prévus par la coordination »', () => {
  it('nom reconnu : la liste des 6 prévus et « Créer ces 6 indicateurs »', async () => {
    const creation = afficherMinistere(ID_KUMI)
    const bloc = screen.getByRole('region', { name: 'Prévus par la coordination' })
    expect(
      within(bloc).getByText('Liste « Kumi » de la coordination : 6 indicateurs à créer.'),
    ).toBeInTheDocument()
    expect(within(bloc).getAllByRole('listitem')).toHaveLength(6)
    expect(within(bloc).getByText('Taux de participation').parentElement).toHaveTextContent(
      'Chaque mois, calcul',
    )
    expect(within(bloc).queryByRole('combobox')).toBeNull()
    await userEvent.click(within(bloc).getByRole('button', { name: 'Créer ces 6 indicateurs' }))
    expect(creation.creer).toHaveBeenCalledWith({ id: ID_KUMI, nom: 'Kumi' }, 'kumi')
  })

  it('Kumi sans indicateur : le bloc remplace l’état vide', () => {
    afficherMinistere(ID_KUMI)
    expect(screen.queryByText(/^Aucun indicateur pour Kumi/)).toBeNull()
  })

  it('nom non reconnu : le choix « Choisir dans la liste de la coordination », « Aucun prévu » en dernier', async () => {
    const creation = afficherMinistere(ID_JEUNESSE)
    const choix = screen.getByRole('combobox', { name: 'Choisir dans la liste de la coordination' })
    expect(
      within(choix)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Choisissez un ministère de la liste',
      'Communication',
      'Eagles',
      'Film',
      'Kumi',
      'Aucun prévu',
    ])
    // Rien à créer tant que rien n'est choisi.
    expect(screen.queryByRole('button', { name: /^Créer/ })).toBeNull()
    await userEvent.selectOptions(choix, 'Film')
    expect(
      screen.getByText('Liste « Film » de la coordination : 3 indicateurs à créer.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Créer ces 3 indicateurs' }))
    expect(creation.creer).toHaveBeenCalledWith({ id: ID_JEUNESSE, nom: 'Jeunesse' }, 'film')
  })

  it('« Aucun prévu » choisi : la phrase et le bouton qui l’enregistre', async () => {
    const creation = afficherMinistere(ID_JEUNESSE)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Choisir dans la liste de la coordination' }),
      'Aucun prévu',
    )
    expect(
      screen.getByText('Aucun indicateur prévu pour ce ministère. Il saisit les chiffres communs.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer : aucun prévu' }))
    expect(creation.creer).toHaveBeenCalledWith({ id: ID_JEUNESSE, nom: 'Jeunesse' }, 'aucun')
  })

  it('deux aides : le titre du bloc et le choix du modèle', () => {
    afficherMinistere(ID_JEUNESSE)
    expect(
      screen.getByRole('button', { name: 'Aide : Prévus par la coordination' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Aide : Choisir dans la liste de la coordination' }),
    ).toBeInTheDocument()
  })

  it('pendant la création, le bouton dit qu’il travaille et ne se grise pas', () => {
    afficherMinistere(ID_KUMI, creationDe({ enCours: ID_KUMI }))
    const bouton = screen.getByRole('button', { name: 'Créer ces 6 indicateurs' })
    expect(bouton).toHaveAttribute('aria-busy', 'true')
    expect(bouton).not.toBeDisabled()
  })

  it('le message de réussite et le refus de la base sous le titre', () => {
    afficherMinistere(ID_KUMI, creationDe({ reussite: '6 indicateurs prévus créés.', envoi: 1 }))
    expect(
      screen.getByText('6 indicateurs prévus créés.', { selector: '[role="status"] p' }),
    ).toBeInTheDocument()
  })
})

describe('VueIndicateursMinistere : états vides', () => {
  it('Protocole : « Aucun indicateur pour Protocole. Il saisit les chiffres communs. », sans bloc de prévus', () => {
    afficherMinistere(ID_PROTOCOLE)
    expect(
      screen.getByText('Aucun indicateur pour Protocole. Il saisit les chiffres communs.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Prévus par la coordination' })).toBeNull()
    expect(screen.queryByText(/Retirés/)).toBeNull()
  })

  it('ministère introuvable : la phrase et le retour aux indicateurs', () => {
    afficherEtat({ etat: 'introuvable' })
    expect(screen.getByText("Ce ministère n'existe pas ou n'est plus actif.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir aux indicateurs' })).toHaveAttribute(
      'href',
      '/indicateurs',
    )
    expect(
      screen.getByRole('heading', { level: 1, name: "Indicateurs d'un ministère" }),
    ).toBeInTheDocument()
  })

  it('chargement : la zone est occupée, le titre reste', () => {
    afficherEtat({ etat: 'chargement' })
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('problème passager : « Réessayer » relance la lecture', async () => {
    const reessayer = vi.fn()
    afficherEtat({ etat: 'erreur', reessayer })
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })
})
