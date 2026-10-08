import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LigneSignalement } from '@/data/signalements'
import type { LigneTexteARelire } from '@/data/moderation'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import { construireTextesARelire } from './construire'
import { FileARelire } from './FileARelire'
import type { ContenuFile } from './FileARelire'

const MINISTERES = [{ id: 'm-social', nom: 'Social' }]
const MASQUE = '[texte masqué par EJP Tech]'

function ligne(surcharge: Partial<LigneTexteARelire>): LigneTexteARelire {
  return {
    cible: 'point_attention',
    cible_id: 'c1',
    ministere_id: 'm-social',
    auteur_libelle: 'Ministère Social',
    ecrit_le: '2026-09-29T18:03:00+02:00',
    champs: { titre: 'Un titre', description: 'Une description' },
    etat: 'a_relire',
    decision_le: null,
    motif: null,
    indicateur_libelle: null,
    mois: null,
    ...surcharge,
  }
}

function afficher(lignes: LigneTexteARelire[]) {
  const relire = vi.fn(() => Promise.resolve())
  const masquer = vi.fn(() => Promise.resolve())
  const contenu: ContenuFile = {
    etat: 'liste',
    textes: construireTextesARelire(lignes, MINISTERES),
    relire,
    masquer,
  }
  render(<FileARelire contenu={contenu} />)
  return { relire, masquer }
}

describe('file « Champs libres à relire »', () => {
  it('titre, phrase de présentation et « 2 textes en attente »', () => {
    afficher([ligne({}), ligne({ cible_id: 'c2' })])
    expect(
      screen.getByRole('heading', { level: 2, name: 'Champs libres à relire' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/^EJP Tech relit les textes libres/)).toBeInTheDocument()
    expect(screen.getByText('2 textes en attente')).toBeInTheDocument()
  })

  it('sans texte : « Aucun texte à relire. »', () => {
    afficher([])
    expect(screen.getByText('Aucun texte à relire.')).toBeInTheDocument()
    expect(screen.getByText('Aucun texte en attente')).toBeInTheDocument()
  })

  it('chargement et problème passager (« Réessayer »)', async () => {
    const reessayer = vi.fn()
    const { rerender } = render(<FileARelire contenu={{ etat: 'chargement' }} />)
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    rerender(<FileARelire contenu={{ etat: 'probleme', reessayer }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledOnce()
  })

  it('« Rien à signaler » appelle la relecture du texte, annonce le message et rend le focus au titre', async () => {
    const { relire } = afficher([ligne({})])
    await userEvent.click(screen.getByRole('button', { name: 'Rien à signaler' }))
    expect(relire).toHaveBeenCalledOnce()
    expect(await screen.findByText('Texte marqué comme relu.')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 2, name: 'Champs libres à relire' }),
      ).toHaveFocus(),
    )
  })

  it('un refus de la base se dit sous les boutons de la ligne', async () => {
    const relire = vi.fn(() =>
      Promise.reject({ code: 'P0001', message: 'Ce texte a déjà été relu.' }),
    )
    render(
      <FileARelire
        contenu={{
          etat: 'liste',
          textes: construireTextesARelire([ligne({})], MINISTERES),
          relire,
          masquer: vi.fn(),
        }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Rien à signaler' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce texte a déjà été relu.')
    expect(screen.getByRole('button', { name: 'Masquer le texte' })).toBeInTheDocument()
  })

  it('« Masquer le texte » : choix du champ et du motif obligatoires, puis l’appel porte la ligne, le champ et le motif', async () => {
    const { masquer } = afficher([ligne({})])
    await userEvent.click(screen.getByRole('button', { name: 'Masquer le texte' }))
    const fenetre = screen.getByRole('dialog', { name: 'Masquer le texte' })
    const valider = within(fenetre).getByRole('button', { name: 'Masquer définitivement' })
    await userEvent.click(valider)
    expect(within(fenetre).getByText('Choisissez le champ à masquer.')).toBeInTheDocument()
    expect(within(fenetre).getByText('Choisissez un motif dans la liste.')).toBeInTheDocument()
    expect(masquer).not.toHaveBeenCalled()

    await userEvent.click(within(fenetre).getByRole('radio', { name: /Ce qui se passe/ }))
    await userEvent.click(within(fenetre).getByRole('radio', { name: "Nom d'une personne" }))
    await userEvent.click(valider)
    await waitFor(() => expect(masquer).toHaveBeenCalledOnce())
    expect(masquer).toHaveBeenCalledWith(expect.objectContaining({ cibleId: 'c1' }), {
      champ: 'description',
      motif: 'nom_personne',
    })
    expect(await screen.findByText('Texte masqué.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('un seul champ : il est déjà choisi, seul le motif reste à choisir', async () => {
    const { masquer } = afficher([ligne({ champs: { titre: 'Un titre seul' } })])
    await userEvent.click(screen.getByRole('button', { name: 'Masquer le texte' }))
    const fenetre = screen.getByRole('dialog')
    expect(within(fenetre).getAllByRole('radio')).toHaveLength(4)
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Autre information personnelle' }),
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer définitivement' }))
    await waitFor(() =>
      expect(masquer).toHaveBeenCalledWith(expect.anything(), { champ: 'titre', motif: 'autre' }),
    )
  })

  it('un refus à l’envoi garde la fenêtre ouverte et le choix', async () => {
    const masquer = vi.fn(() =>
      Promise.reject({ code: 'P0001', message: 'Texte introuvable, vide ou déjà masqué.' }),
    )
    render(
      <FileARelire
        contenu={{
          etat: 'liste',
          textes: construireTextesARelire([ligne({ champs: { titre: 'Un titre' } })], MINISTERES),
          relire: vi.fn(),
          masquer,
        }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Masquer le texte' }))
    await userEvent.click(
      screen.getByRole('radio', { name: 'Coordonnées (téléphone, adresse, email)' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Masquer définitivement' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Texte introuvable, vide ou déjà masqué.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: 'Coordonnées (téléphone, adresse, email)' }),
    ).toBeChecked()
  })

  it('Échap ferme la fenêtre sans appeler la base, le focus revient au bouton', async () => {
    const { masquer } = afficher([ligne({})])
    const bouton = screen.getByRole('button', { name: 'Masquer le texte' })
    await userEvent.click(bouton)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(masquer).not.toHaveBeenCalled()
    expect(bouton).toHaveFocus()
  })

  it('un texte relu n’a plus de bouton ; un texte masqué n’en garde un que s’il lui reste un champ', () => {
    afficher([
      ligne({ cible_id: 'r', etat: 'relu', decision_le: '2026-09-29T08:50:00+02:00' }),
      ligne({
        cible_id: 'm1',
        etat: 'masque',
        decision_le: '2026-09-30T09:00:00+02:00',
        motif: 'nom_personne',
        champs: { titre: MASQUE },
      }),
      ligne({
        cible_id: 'm2',
        etat: 'masque',
        decision_le: '2026-09-30T09:00:00+02:00',
        motif: 'autre',
        champs: { titre: MASQUE, description: 'Reste à lire' },
      }),
    ])
    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(3)
    const avecBoutons = articles.filter((article) => within(article).queryByRole('button'))
    expect(avecBoutons).toHaveLength(1)
    expect(within(avecBoutons[0]!).queryByRole('button', { name: 'Rien à signaler' })).toBeNull()
    expect(within(avecBoutons[0]!).getByRole('button', { name: 'Masquer le texte' })).toBeVisible()
    expect(screen.getAllByText(MASQUE, { exact: false })).not.toHaveLength(0)
  })
})

describe('bloc « Signalements » : « Masquer le texte »', () => {
  const OUVERT: LigneSignalement = {
    id: '43000000-0000-4000-8000-000000000001',
    ministere_id: 'm-social',
    ministere_nom: 'Social',
    ecran: 'saisie_evenement',
    texte: 'Un texte de signalement.',
    saisi_le: '2026-10-02T18:40:00+02:00',
    suivi_id: null,
    commentaire: null,
    clos_le: null,
    ouvert: true,
    clos_recent: false,
  }
  const CLOS: LigneSignalement = {
    ...OUVERT,
    id: '43000000-0000-4000-8000-000000000002',
    ministere_nom: 'Jeunesse',
    suivi_id: '43000000-0000-4000-8000-000000000011',
    commentaire: 'Un commentaire de clôture.',
    clos_le: '2026-10-03T10:00:00+02:00',
    ouvert: false,
    clos_recent: true,
  }

  function bloc(signalements: LigneSignalement[], avecMasquer = true) {
    const masquer = vi.fn(() => Promise.resolve())
    render(
      <ContenuBlocSignalements
        contenu={{
          etat: 'liste',
          signalements,
          cloturer: vi.fn(() => Promise.resolve()),
          relire: vi.fn(),
          ...(avecMasquer ? { masquer } : {}),
        }}
      />,
    )
    return masquer
  }

  it('le texte d’un signalement ouvert se masque par la cible « signalement »', async () => {
    const masquer = bloc([OUVERT])
    await userEvent.click(screen.getByRole('button', { name: 'Masquer le texte' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Santé ou situation personnelle' }))
    await userEvent.click(screen.getByRole('button', { name: 'Masquer définitivement' }))
    await waitFor(() =>
      expect(masquer).toHaveBeenCalledWith({
        cible: 'signalement',
        cibleId: OUVERT.id,
        champ: 'texte',
        motif: 'situation_personnelle',
      }),
    )
    expect(await screen.findByText('Texte masqué.')).toBeInTheDocument()
  })

  it('le commentaire d’un signalement clos se masque par la cible « signalement_suivi »', async () => {
    const masquer = bloc([CLOS])
    await userEvent.click(screen.getByRole('button', { name: 'Masquer le texte' }))
    const fenetre = screen.getByRole('dialog')
    expect(
      within(fenetre).getAllByRole('radio', { name: /Signalement|Commentaire de clôture/ }),
    ).toHaveLength(2)
    await userEvent.click(within(fenetre).getByRole('radio', { name: /Commentaire de clôture/ }))
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Autre information personnelle' }),
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer définitivement' }))
    await waitFor(() =>
      expect(masquer).toHaveBeenCalledWith({
        cible: 'signalement_suivi',
        cibleId: CLOS.suivi_id,
        champ: 'commentaire',
        motif: 'autre',
      }),
    )
  })

  it('un signalement dont tout est masqué n’a plus le bouton ; sans fonction, il n’existe pas', () => {
    bloc([{ ...OUVERT, texte: MASQUE }])
    expect(screen.queryByRole('button', { name: 'Masquer le texte' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clore le signalement' })).toBeInTheDocument()
  })

  it('sans fonction « masquer », aucun bouton (aperçus et tests existants)', () => {
    bloc([OUVERT, CLOS], false)
    expect(screen.queryByRole('button', { name: 'Masquer le texte' })).not.toBeInTheDocument()
  })
})
