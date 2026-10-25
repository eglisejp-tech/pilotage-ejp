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
    dernier: null,
    reussite: null,
    envoi: 0,
    refus: null,
    ...surcharge,
  }
}

// EJP Tech configure seul (T60) : il est le profil par défaut ; l'administration lit (plus bas).
function afficherMinistere(
  id: string,
  creation = creationDe(),
  profil: TypeCompte = 'admin_plateforme',
) {
  const donnees = construireMinistere(id, lecturesExemple())
  if (donnees === null) throw new Error('ministère d’exemple absent')
  return afficherEtat({ etat: 'pret', donnees }, creation, profil)
}

function afficherEtat(
  ministere: ResultatConfigurationMinistere,
  creation = creationDe(),
  profil: TypeCompte = 'admin_plateforme',
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
    expect(screen.getByText('5 indicateurs suivis.')).toBeInTheDocument()
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
    expect(within(corrigee).getByText('Nom corrigé le 5 oct.')).toBeInTheDocument()
    expect(within(corrigee).getByText('Jamais saisi')).toHaveClass('text-attention')
  })

  it('« Jamais saisi » a la même mise en forme dans toutes les sections, « À ce jour » compris', () => {
    afficherMinistere(ID_COMMUNICATION)
    const ligne = screen
      .getByText('Projets en cours', { selector: 'span.font-semibold' })
      .closest('li')!
    expect(within(ligne).getByText('Jamais saisi')).toHaveClass('text-attention', 'font-semibold')
  })

  it('les mentions et l’état « À valider » commencent par une majuscule et se lisent à 14 px', () => {
    afficherMinistere(ID_COMMUNICATION)
    const ligne = screen
      .getByText('Projets en cours', { selector: 'span.font-semibold' })
      .closest('li')!
    const mentions = within(ligne).getByText(/^Indicateur prévu/)
    expect(mentions).toHaveClass('text-[14px]')
    expect(within(ligne).getByText(/^À valider depuis/)).toHaveClass('text-[14px]')
  })

  it('un ajout à valider : mentions, durée, lien « Ouvrir les indicateurs à valider » vers le bloc', () => {
    afficherMinistere(ID_COMMUNICATION)
    const ligne = screen
      .getByText('Projets en cours', { selector: 'span.font-semibold' })
      .closest('li')!
    expect(
      within(ligne).getByText(/Indicateur prévu · Ajouté par Communication le 28 sept\./),
    ).toBeInTheDocument()
    expect(within(ligne).getByText(/À valider depuis 9 jours/)).toBeInTheDocument()
    expect(
      within(ligne).getByRole('link', { name: 'Ouvrir les indicateurs à valider' }),
    ).toHaveAttribute('href', '/indicateurs#a-valider')
  })

  it('un calcul : « Se calcule tout seul », jamais d’usage', () => {
    afficherMinistere(ID_COMMUNICATION)
    const calculs = screen.getByRole('region', { name: 'Calculs' })
    expect(within(calculs).getByText('Se calcule tout seul')).toBeInTheDocument()
    expect(within(calculs).queryByText(/^calcul : /i)).toBeNull()
  })

  it('« Retirés (2) », replié, avec la date et le motif', async () => {
    afficherMinistere(ID_COMMUNICATION)
    const resume = screen.getByText('Retirés (2)')
    expect(resume.closest('details')).not.toHaveAttribute('open')
    await userEvent.click(resume)
    expect(screen.getByText('Retiré le 3 oct. : doublon.')).toBeVisible()
    expect(screen.getByText('Refusé le 1er oct.')).toBeVisible()
  })

  it('une seule aide d’usage pour tout l’écran', () => {
    afficherMinistere(ID_COMMUNICATION)
    expect(screen.getAllByRole('button', { name: 'Aide : Usage' })).toHaveLength(1)
  })

  it('prévus créés : aucun bloc « Indicateurs prévus »', () => {
    afficherMinistere(ID_COMMUNICATION)
    expect(screen.queryByRole('heading', { name: 'Indicateurs prévus' })).toBeNull()
  })

  it('aucune action tant que le lot L3b ne les pose pas, jamais une valeur', () => {
    afficherMinistere(ID_COMMUNICATION)
    expect(screen.queryByRole('button', { name: /Ajouter|Corriger|Remplacer|Retirer/ })).toBeNull()
    expect(screen.queryByText(/valeur/i)).toBeNull()
  })
})

describe('VueIndicateursMinistere : bloc « Indicateurs prévus »', () => {
  it('nom reconnu : la liste des 6 prévus et « Créer ces 6 indicateurs »', async () => {
    const creation = afficherMinistere(ID_KUMI)
    const bloc = screen.getByRole('region', { name: 'Indicateurs prévus' })
    expect(within(bloc).getByText('Liste « Kumi » : 6 indicateurs à créer.')).toBeInTheDocument()
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

  it('nom non reconnu : le choix « Nom du ministère dans la liste », « Aucun prévu » en dernier', async () => {
    const creation = afficherMinistere(ID_JEUNESSE)
    const choix = screen.getByRole('combobox', { name: 'Nom du ministère dans la liste' })
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
    expect(screen.getByText('Liste « Film » : 3 indicateurs à créer.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Créer ces 3 indicateurs' }))
    expect(creation.creer).toHaveBeenCalledWith({ id: ID_JEUNESSE, nom: 'Jeunesse' }, 'film')
  })

  it('« Aucun prévu » choisi : la phrase et le bouton qui l’enregistre', async () => {
    const creation = afficherMinistere(ID_JEUNESSE)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Nom du ministère dans la liste' }),
      'Aucun prévu',
    )
    expect(screen.getByText('Aucun indicateur prévu pour ce ministère.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer « Aucun prévu »' }))
    expect(creation.creer).toHaveBeenCalledWith({ id: ID_JEUNESSE, nom: 'Jeunesse' }, 'aucun')
  })

  it('une aide sur le titre du bloc ; le choix porte une indication, plus de bulle (T66, t334)', () => {
    afficherMinistere(ID_JEUNESSE)
    expect(screen.getByRole('button', { name: 'Aide : Indicateurs prévus' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Aide : Nom du ministère dans la liste' }),
    ).toBeNull()
    expect(
      screen.getByRole('combobox', { name: 'Nom du ministère dans la liste' }),
    ).toHaveAccessibleDescription('Choisissez le nom qui correspond à ce ministère.')
  })

  it('pendant la création, le bouton dit qu’il travaille et ne se grise pas', () => {
    afficherMinistere(ID_KUMI, creationDe({ enCours: ID_KUMI }))
    // Le texte visible le dit pendant l'envoi (m227).
    const bouton = screen.getByRole('button', { name: 'Création en cours' })
    expect(screen.queryByRole('button', { name: 'Créer ces 6 indicateurs' })).toBeNull()
    expect(bouton).toHaveAttribute('aria-busy', 'true')
    expect(bouton).not.toBeDisabled()
  })

  it('le message de réussite sous la phrase du ministère', () => {
    afficherMinistere(ID_KUMI, creationDe({ reussite: '6 indicateurs prévus créés.', envoi: 1 }))
    expect(
      screen.getByText('6 indicateurs prévus créés.', { selector: '[role="status"] p' }),
    ).toBeInTheDocument()
  })

  it('le refus de la base s’affiche sous le bouton qui l’a provoqué, dans le bloc', () => {
    const refus =
      'La fiche a déjà « Activités réalisées » : retirez-le avant de créer les indicateurs prévus.'
    afficherMinistere(ID_KUMI, creationDe({ dernier: ID_KUMI, refus }))
    const bloc = screen.getByRole('region', { name: 'Indicateurs prévus' })
    const alerte = within(bloc).getByRole('alert')
    expect(alerte).toHaveTextContent(refus)
    const bouton = within(bloc).getByRole('button', { name: 'Créer ces 6 indicateurs' })
    // Dans l'ordre du document, le refus suit le bouton.
    expect(bouton.compareDocumentPosition(alerte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('le refus d’un autre ministère ne s’affiche pas dans ce bloc', () => {
    afficherMinistere(ID_KUMI, creationDe({ dernier: ID_JEUNESSE, refus: 'Refus ailleurs.' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('nom non reconnu : une indication attend le choix, puis disparaît quand il est fait', async () => {
    afficherMinistere(ID_JEUNESSE)
    const phrase = 'Choisissez le nom qui correspond à ce ministère.'
    expect(screen.getByText(phrase)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Créer/ })).toBeNull()
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Nom du ministère dans la liste' }),
      'Film',
    )
    expect(screen.queryByText(phrase)).toBeNull()
  })
})

describe('VueIndicateursMinistere : états vides', () => {
  it('Protocole : « Aucun indicateur pour Protocole. », sans bloc de prévus', () => {
    afficherMinistere(ID_PROTOCOLE)
    expect(screen.getByText('Aucun indicateur pour Protocole.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Indicateurs prévus' })).toBeNull()
    expect(screen.queryByText(/Retirés/)).toBeNull()
  })

  it('ministère introuvable : la phrase et le retour aux indicateurs', () => {
    afficherEtat({ etat: 'introuvable' })
    expect(screen.getByText('Ce ministère est introuvable.')).toBeInTheDocument()
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

describe('VueIndicateursMinistere : administration de l’église, en lecture (T60)', () => {
  it('la phrase qui dit qu’EJP Tech gère, les indicateurs, aucun bouton', () => {
    afficherMinistere(ID_COMMUNICATION, creationDe(), 'admin_eglise')
    expect(
      screen.getByText(
        'EJP Tech crée, corrige et retire les indicateurs. Adressez-lui vos demandes.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Chaque mois' })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /Ajouter|Corriger|Remplacer|Retirer/ })).toEqual(
      [],
    )
    // « Voir la fiche » reste à EJP Tech (les valeurs, T29).
    expect(screen.queryByRole('link', { name: 'Voir la fiche' })).toBeNull()
  })

  it('prévus à créer : ni bloc, ni bouton, mais ce qui reste à créer, comme la liste le dit', () => {
    const creation = afficherMinistere(ID_KUMI, creationDe(), 'admin_eglise')
    expect(screen.queryByRole('region', { name: 'Indicateurs prévus' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Créer/ })).toBeNull()
    expect(screen.getByText('Liste « Kumi » : 6 indicateurs à créer.')).toBeInTheDocument()
    // L'état vide ne cache pas les prévus en attente.
    expect(screen.queryByText(/^Aucun indicateur pour Kumi/)).toBeNull()
    expect(creation.creer).not.toHaveBeenCalled()
  })

  it('nom non reconnu : aucun choix de modèle, la liste reste à choisir', () => {
    afficherMinistere(ID_JEUNESSE, creationDe(), 'admin_eglise')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(
      screen.getByText('Indicateurs prévus : la liste de ce ministère reste à choisir.'),
    ).toBeInTheDocument()
  })

  it('aucun prévu (Protocole) : l’état vide, sans phrase de prévus', () => {
    afficherMinistere(ID_PROTOCOLE, creationDe(), 'admin_eglise')
    expect(screen.getByText(/^Aucun indicateur pour Protocole/)).toBeInTheDocument()
    expect(screen.queryByText(/^Liste « /)).toBeNull()
    expect(screen.queryByText(/reste à choisir/)).toBeNull()
  })

  it('EJP Tech ne lit ni la phrase de lecture ni la phrase des prévus : il a le bloc', () => {
    afficherMinistere(ID_KUMI)
    expect(screen.queryByText(/Adressez-lui vos demandes/)).toBeNull()
    expect(screen.getByRole('region', { name: 'Indicateurs prévus' })).toBeInTheDocument()
  })
})
