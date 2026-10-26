import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { afficherIncident } from '@/features/moderation/construireIncidents'
import { ListeIncidents } from '@/features/moderation/ListeIncidents'
import type { LigneIncident } from '@/lib/base'

// Liste « Incidents d'envoi » de la Modération (T76, lot C ; conception 3, S13, et 8.3) : le cas
// réel d'abord, l'incident de Coordination du 26 octobre 2026.

const COORDINATION: LigneIncident = {
  reference: 'K7Q4MX',
  survenu_le: '2026-10-26T11:37:00Z',
  recu_le: '2026-10-26T11:37:05Z',
  profil: 'ministere',
  ministere_id: '10000000-0000-4000-8000-000000000003',
  ministere_nom: 'Coordination',
  ecran: '/saisir/evenement',
  operation: 'ajouter_evenement',
  genre: 'sans_reponse',
  issue: 'inconnue',
  rattrape: false,
  statut_http: null,
  code: null,
  nom_erreur: 'TypeError',
  duree_ms: 1234,
  en_ligne: true,
  visible: true,
  version: '3f2a1c9',
  navigateur: 'safari',
  version_navigateur: 26,
  systeme: 'ios',
  total: 1,
}

describe('afficherIncident', () => {
  it('S13 : la ligne de Coordination, à l’heure de Paris, puis le navigateur, la version et la référence', () => {
    expect(afficherIncident(COORDINATION)).toEqual({
      reference: 'K7Q4MX',
      titre:
        'Lun. 26 oct., 12 h 37 : Coordination, Ajouter un événement. Pas de réponse, issue inconnue.',
      detail: 'Safari 26, iOS. Version 3f2a1c9. Référence K7Q4MX.',
    })
  })

  it('genres avec leur statut ou leur code, rattrapé, profil hors ministère, ministère supprimé', () => {
    expect(
      afficherIncident({ ...COORDINATION, genre: 'reponse_illisible', statut_http: 502 }).titre,
    ).toContain('Réponse illisible (502), issue inconnue.')
    expect(
      afficherIncident({
        ...COORDINATION,
        genre: 'refus_inconnu',
        code: '23505',
        issue: 'rien_enregistre',
      }).titre,
    ).toContain("Refus inattendu (23505), rien d'enregistré.")
    expect(afficherIncident({ ...COORDINATION, rattrape: true }).titre).toContain(
      'Pas de réponse, rattrapé par un nouvel essai.',
    )
    expect(
      afficherIncident({
        ...COORDINATION,
        profil: 'berger',
        ministere_id: null,
        ministere_nom: null,
        operation: 'marquer_traite',
        genre: 'delai',
      }).titre,
    ).toContain(': Berger, Marquer traité. Délai de 10 s dépassé, issue inconnue.')
    expect(afficherIncident({ ...COORDINATION, ministere_nom: null }).titre).toContain(
      ': Ministère supprimé, Ajouter un événement.',
    )
    expect(
      afficherIncident({ ...COORDINATION, navigateur: null, systeme: null, version: 'local' })
        .detail,
    ).toBe('Version locale. Référence K7Q4MX.')
  })
})

describe('ListeIncidents', () => {
  it('repliée sous son titre, avec le nombre ; ouverte : la présentation et les deux phrases', async () => {
    render(
      <ListeIncidents
        contenu={{
          etat: 'liste',
          lignes: [COORDINATION],
          total: 1,
          plus: null,
          plusEnCours: false,
        }}
      />,
    )
    const titre = screen.getByText("Incidents d'envoi des 90 derniers jours (1)")
    expect(screen.getByText(/Lun\. 26 oct\./)).not.toBeVisible()
    await userEvent.click(titre)
    expect(
      screen.getByText(
        'Les envois qui ont échoué sur les appareils, sans rien de ce qui a été saisi.',
      ),
    ).toBeVisible()
    expect(
      screen.getByText(
        'Lun. 26 oct., 12 h 37 : Coordination, Ajouter un événement. Pas de réponse, issue inconnue.',
      ),
    ).toBeVisible()
    expect(screen.getByText('Safari 26, iOS. Version 3f2a1c9. Référence K7Q4MX.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Afficher 50 de plus' })).toBeNull()
  })

  it('vide : « Aucun incident ces 90 derniers jours. »', () => {
    render(
      <ListeIncidents
        contenu={{ etat: 'liste', lignes: [], total: 0, plus: null, plusEnCours: false }}
      />,
    )
    expect(screen.getByText("Incidents d'envoi des 90 derniers jours (0)")).toBeInTheDocument()
    expect(screen.getByText('Aucun incident ces 90 derniers jours.')).toBeInTheDocument()
  })

  it('plus de 50 : « Afficher 50 de plus »', async () => {
    const plus = vi.fn()
    render(
      <ListeIncidents
        contenu={{ etat: 'liste', lignes: [COORDINATION], total: 73, plus, plusEnCours: false }}
      />,
    )
    await userEvent.click(screen.getByText("Incidents d'envoi des 90 derniers jours (73)"))
    await userEvent.click(screen.getByRole('button', { name: 'Afficher 50 de plus' }))
    expect(plus).toHaveBeenCalledTimes(1)
  })

  it('lecture impossible : « La connexion a échoué. Réessayez. » et « Réessayer »', async () => {
    const reessayer = vi.fn()
    render(<ListeIncidents contenu={{ etat: 'probleme', reessayer }} />)
    await userEvent.click(screen.getByText("Incidents d'envoi des 90 derniers jours"))
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })
})
