import { render, screen, within, configure } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApercuJournal } from '@/features/journal/apercu/ApercuJournal'
import {
  lignesLisibles,
  LIGNES_EXEMPLE,
  lireExemple,
} from '@/features/journal/apercu/exemplesJournal'
import { debutDePeriode } from '@/features/journal/periodes'

// Sous la charge de toute la suite, une lecture simulée peut dépasser la seconde par défaut.
configure({ asyncUtilTimeout: 5000 })

function Adresse() {
  const { search } = useLocation()
  return <output data-testid="adresse">{search}</output>
}

function afficher(adresse: string) {
  return render(
    <MemoryRouter initialEntries={[adresse]}>
      <ApercuJournal />
      <Adresse />
    </MemoryRouter>,
  )
}

const lignes = () =>
  within(screen.getByRole('list', { name: 'Lignes du journal' })).getAllByRole('listitem')
const adresse = () => screen.getByTestId('adresse').textContent

describe('écran 06 lu par le berger', () => {
  it('titre, phrase, trois filtres et 50 lignes sur 30 jours', () => {
    afficher('/apercu/journal')
    expect(screen.getByRole('heading', { level: 1, name: 'Journal' })).toBeInTheDocument()
    expect(
      screen.getByText(/Personne ne peut modifier ni effacer le journal\./),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Compte' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Action' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Période' })).toHaveValue('30j')
    expect(lignes()).toHaveLength(50)
    expect(screen.getByText('50 lignes affichées.')).toBeInTheDocument()
  })

  it('« Afficher 50 lignes de plus » ajoute les lignes restantes, puis le bouton disparaît', async () => {
    const utilisateur = userEvent.setup()
    afficher('/apercu/journal')
    await utilisateur.click(screen.getByRole('button', { name: 'Afficher 50 lignes de plus' }))
    const total = lireExemple(
      {
        compte: null,
        action: null,
        ministere: null,
        depuis: debutDePeriode('30j', '2026-10-01'),
        apres: null,
        limite: 500,
      },
      'berger',
    ).lignes.length
    expect(total).toBeGreaterThan(50)
    expect(lignes()).toHaveLength(total)
    expect(screen.queryByRole('button', { name: /Afficher 50 lignes de plus/ })).toBeNull()
    expect(screen.getByText(`Toutes les lignes sont affichées (${total}).`)).toHaveFocus()
  })

  it('une relecture en échec garde les lignes et les filtres : bandeau et « Réessayer » sous la liste', () => {
    afficher('/apercu/journal?etat=relecture&action=mesure_saisie')
    expect(lignes().length).toBeGreaterThan(0)
    expect(screen.getByRole('combobox', { name: 'Action' })).toHaveValue('mesure_saisie')
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    // Le bandeau remplace « Afficher 50 lignes de plus » : un seul geste pour continuer.
    expect(screen.queryByRole('button', { name: /Afficher 50 lignes de plus/ })).toBeNull()
  })

  it('un filtre se lit dans l’adresse et revient à 50 lignes', async () => {
    const utilisateur = userEvent.setup()
    afficher('/apercu/journal')
    await utilisateur.click(screen.getByRole('button', { name: 'Afficher 50 lignes de plus' }))
    await utilisateur.selectOptions(
      screen.getByRole('combobox', { name: 'Action' }),
      'A créé un point',
    )
    expect(adresse()).toBe('?action=point_cree')
    expect(lignes()).toHaveLength(2)
    await utilisateur.selectOptions(
      screen.getByRole('combobox', { name: 'Période' }),
      'Depuis le début',
    )
    expect(adresse()).toBe('?action=point_cree&periode=tout')
    await utilisateur.selectOptions(
      screen.getByRole('combobox', { name: 'Compte' }),
      'Ministère Intégration',
    )
    expect(adresse()).toContain('compte=compte-integration')
    expect(lignes()).toHaveLength(1)
  })

  it('« Ministère : Jeunesse » avec « Retirer le filtre »', async () => {
    const utilisateur = userEvent.setup()
    afficher('/apercu/journal?ministere=min-jeunesse')
    expect(screen.getByText('Ministère : Jeunesse')).toBeInTheDocument()
    for (const ligne of lignes()) expect(ligne.textContent).toBeTruthy()
    await utilisateur.click(screen.getByRole('button', { name: 'Retirer le filtre' }))
    expect(adresse()).toBe('')
    expect(screen.queryByText('Ministère : Jeunesse')).toBeNull()
  })

  it('sans ligne : « Aucune ligne pour ces filtres. » et « Retirer les filtres »', async () => {
    const utilisateur = userEvent.setup()
    afficher('/apercu/journal?action=session_supprimee')
    expect(screen.getByText('Aucune ligne pour ces filtres.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Lignes du journal' })).toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: 'Retirer les filtres' }))
    expect(adresse()).toBe('?periode=tout')
    expect(screen.queryByText('Aucune ligne pour ces filtres.')).toBeNull()
  })

  it('un journal vide sans filtre : une phrase de premier usage, sans bouton', () => {
    afficher('/apercu/journal?periode=tout&etat=vide')
    expect(screen.getByText(/Le journal est vide pour l'instant/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retirer les filtres' })).toBeNull()
  })

  it('un texte masqué par EJP Tech s’affiche en `--encre-3`', () => {
    afficher('/apercu/journal?periode=7j&action=texte_masque')
    expect(lignes()).toHaveLength(1)
    expect(screen.getByText("Point de Social, motif : nom d'une personne")).toBeInTheDocument()
    afficher('/apercu/journal?periode=7j&action=point_traite')
    // Les deux lignes de point traité : titre actuel lisible.
    expect(screen.getAllByText("Micros pour Bâtir l'Église").length).toBeGreaterThan(0)
  })

  it('les états : chargement et erreur gardent le titre', () => {
    afficher('/apercu/journal?etat=erreur')
    expect(screen.getByRole('heading', { level: 1, name: 'Journal' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
  })
})

describe('les autres profils', () => {
  it('un ministère : « Mon journal », sans filtre Compte, ses lignes seulement', () => {
    afficher('/apercu/journal?profil=ministere&ministere=min-jeunesse&compte=compte-berger')
    expect(screen.getByRole('heading', { level: 1, name: 'Mon journal' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Compte' })).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Action' })).toBeInTheDocument()
    expect(screen.queryByText(/^Ministère : /)).toBeNull()
    expect(lignes().length).toBe(
      lignesLisibles(LIGNES_EXEMPLE, 'ministere').filter(
        (l) => Date.parse(l.le) >= Date.parse('2026-08-31T22:00:00Z'),
      ).length,
    )
    expect(screen.getByText(/de votre ministère/)).toBeInTheDocument()
  })

  it('EJP Tech : « Journal technique », tout le journal, signalements compris', () => {
    afficher('/apercu/journal?profil=admin_plateforme&periode=7j')
    expect(screen.getByRole('heading', { level: 1, name: 'Journal technique' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Compte' })).toBeInTheDocument()
    expect(screen.getByText('Écran : Chiffres du dimanche')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'A signalé une difficulté' })).toBeInTheDocument()
  })

  it('le berger ne lit aucun signalement', () => {
    afficher('/apercu/journal?profil=berger&periode=7j')
    expect(screen.queryByText('Écran : Chiffres du dimanche')).toBeNull()
    expect(screen.queryByRole('option', { name: 'A signalé une difficulté' })).toBeNull()
  })

  it('l’administration de l’église : sa liste fermée', () => {
    afficher('/apercu/journal?profil=admin_eglise&periode=tout')
    const texte = screen.getByRole('list', { name: 'Lignes du journal' }).textContent ?? ''
    expect(texte).not.toMatch(/signal|Précision|point|Point|Soirée de louange|lundi 5 oct/)
    expect(texte).toContain('A déclaré une session')
    expect(screen.queryByRole('option', { name: 'A créé un point' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'A signalé une difficulté' })).toBeNull()
    expect(screen.getByRole('option', { name: 'A saisi des chiffres' })).toBeInTheDocument()
    // Un envoi qui contient un indicateur sensible n'y figure pas (P50).
    expect(screen.queryByText("1 chiffre d'indicateurs du ministère")).toBeNull()
  })
})

describe('les règles de lecture rejouées pour l’aperçu', () => {
  it('chaque profil lit moins ou autant que EJP Tech', () => {
    const tout = LIGNES_EXEMPLE.length
    expect(lignesLisibles(LIGNES_EXEMPLE, 'admin_plateforme')).toHaveLength(tout)
    for (const profil of ['berger', 'conseil', 'admin_eglise', 'ministere'] as const) {
      expect(lignesLisibles(LIGNES_EXEMPLE, profil).length, profil).toBeLessThan(tout)
    }
  })
})
