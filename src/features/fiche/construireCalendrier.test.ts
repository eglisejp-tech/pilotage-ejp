import { describe, expect, it } from 'vitest'
import type { EvenementLu } from '@/data/evenements'
import type { MinistereListe } from '@/data/ministeres'
import { construireCalendrier, phrasesBandeau } from '@/features/fiche/construireCalendrier'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'

const COMMUNICATION = 'm-com'
const COORDINATION = 'm-coo'
const SOCIAL = 'm-soc'

const ministeres: MinistereListe[] = [
  { id: COMMUNICATION, code: 'communication', nom: 'Communication', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: SOCIAL, code: 'social', nom: 'Social', desactive_le: '2026-09-01T10:00:00Z' },
]

function evenement(surcharge: Partial<EvenementLu> & { id: string }): EvenementLu {
  return {
    ministere_id: COMMUNICATION,
    titre: 'Soirée de louange',
    date: '2026-10-10',
    statut: 'preparation',
    jours: 4,
    a_confirmer: false,
    reporte_du: null,
    ...surcharge,
  }
}

const lectures = (
  evenements: EvenementLu[],
  mentions: { evenement_id: string; ministere_id: string }[] = [],
) => ({
  evenements,
  mentions,
  ministeres,
})

describe('construireCalendrier', () => {
  it('trie par date puis par nom, statut en mots, jour abrégé', () => {
    const lignes = construireCalendrier(
      lectures([
        evenement({ id: 'c', titre: 'Tournage', date: '2026-11-07', statut: 'brouillon' }),
        evenement({ id: 'b', titre: 'Soirée', date: '2026-10-10', statut: 'valide' }),
        evenement({ id: 'a', titre: 'Accueil', date: '2026-10-10', statut: 'annule' }),
      ]),
      { ministereId: COMMUNICATION, profil: 'berger' },
    )
    expect(lignes.map((l) => [l.titre.texte, l.jour, l.libelleStatut, l.ton])).toEqual([
      ['Accueil', 'Sam. 10 oct.', 'Annulé', 'alerte'],
      ['Soirée', 'Sam. 10 oct.', 'Validé', 'bien'],
      ['Tournage', 'Sam. 7 nov.', 'Brouillon', null],
    ])
  })

  it('un événement à confirmer reçoit le texte de sa date, une date passée en alerte', () => {
    const [avenir, passe] = construireCalendrier(
      lectures([
        evenement({ id: 'a', statut: 'attente_validation', a_confirmer: true, jours: 2 }),
        evenement({
          id: 'b',
          date: '2026-10-12',
          statut: 'attente_validation',
          a_confirmer: true,
          jours: -3,
        }),
      ]),
      { ministereId: COMMUNICATION, profil: 'ministere' },
    )
    expect(avenir?.texteDate).toEqual({ texte: 'dans 2 jours', ton: 'attention' })
    expect(passe?.texteDate).toEqual({ texte: 'date passée depuis 3 jours', ton: 'alerte' })
  })

  it('un événement en attente encore lointain n’est pas à confirmer : aucun texte de date', () => {
    const [ligne] = construireCalendrier(
      lectures([evenement({ id: 'a', statut: 'attente_validation', jours: 9 })]),
      { ministereId: COMMUNICATION, profil: 'ministere' },
    )
    expect(ligne?.aConfirmer).toBe(false)
    expect(ligne?.texteDate).toBeNull()
  })

  it('garde un événement à confirmer plus ancien que 7 jours, retire un événement passé sans alerte', () => {
    const lignes = construireCalendrier(
      lectures([
        evenement({ id: 'vieux', jours: -30, statut: 'attente_validation', a_confirmer: true }),
        evenement({ id: 'ancien', jours: -8, statut: 'termine' }),
        evenement({ id: 'recent', jours: -7, statut: 'termine' }),
      ]),
      { ministereId: COMMUNICATION, profil: 'berger' },
    )
    expect(lignes.map((l) => l.id).sort()).toEqual(['recent', 'vieux'])
  })

  it('« Mettre à jour » : le ministère porteur seulement', () => {
    const evenements = [
      evenement({ id: 'propre', titre: 'Soirée' }),
      evenement({ id: 'mentionne', titre: 'Accueil', ministere_id: COORDINATION }),
    ]
    const mentions = [{ evenement_id: 'mentionne', ministere_id: COMMUNICATION }]
    const parProfil = (profil: 'ministere' | 'berger' | 'conseil' | 'admin_plateforme') =>
      construireCalendrier(lectures(evenements, mentions), {
        ministereId: COMMUNICATION,
        profil,
      }).map((l) => [l.id, l.versMiseAJour])
    expect(parProfil('ministere')).toEqual([
      ['mentionne', null],
      ['propre', '/saisir/evenement/propre'],
    ])
    for (const profil of ['berger', 'conseil', 'admin_plateforme'] as const) {
      expect(parProfil(profil).every(([, vers]) => vers === null)).toBe(true)
    }
  })

  it('un événement qui mentionne le ministère : « Mentionné par Coordination », lecture seule', () => {
    const [ligne] = construireCalendrier(
      lectures([evenement({ id: 'm', ministere_id: COORDINATION })]),
      { ministereId: COMMUNICATION, profil: 'ministere' },
    )
    expect(ligne?.mentionnePar).toBe('Mentionné par Coordination')
    expect(ligne?.lectureSeule).toBe('Seul Coordination met à jour cet événement.')
    expect(ligne?.duMinistere).toBe(false)
    expect(ligne?.versMiseAJour).toBeNull()
  })

  it('les ministères mentionnés par un événement du ministère, désactivés signalés', () => {
    const [ligne] = construireCalendrier(
      lectures(
        [evenement({ id: 'p' })],
        [
          { evenement_id: 'p', ministere_id: COORDINATION },
          { evenement_id: 'p', ministere_id: SOCIAL },
        ],
      ),
      { ministereId: COMMUNICATION, profil: 'ministere' },
    )
    expect(ligne?.mentions).toEqual(['Coordination', 'Social (désactivé)'])
    expect(ligne?.mentionnePar).toBeNull()
  })

  it('le report se lit dans l’historique : « Reporté du sam. 3 oct. »', () => {
    const [ligne] = construireCalendrier(
      lectures([evenement({ id: 'r', reporte_du: '2026-10-03' })]),
      {
        ministereId: COMMUNICATION,
        profil: 'berger',
      },
    )
    expect(ligne?.report).toBe('Reporté du sam. 3 oct.')
  })

  it('un titre masqué par EJP Tech est marqué', () => {
    const [ligne] = construireCalendrier(lectures([evenement({ id: 'x', titre: TEXTE_MASQUE })]), {
      ministereId: COMMUNICATION,
      profil: 'berger',
    })
    expect(ligne?.titre.masque).toBe(true)
  })

  it('aucun événement : liste vide', () => {
    expect(
      construireCalendrier(lectures([]), { ministereId: COMMUNICATION, profil: 'berger' }),
    ).toEqual([])
  })
})

describe('phrasesBandeau', () => {
  const lignesAlerte = (profil: 'ministere' | 'berger', evenements: EvenementLu[]) =>
    construireCalendrier(lectures(evenements), { ministereId: COMMUNICATION, profil })
  const aConfirmer = (id: string, ministere = COMMUNICATION) =>
    evenement({
      id,
      ministere_id: ministere,
      statut: 'attente_validation',
      a_confirmer: true,
      jours: 1,
    })

  it('rien à signaler : aucune phrase, le bandeau disparaît', () => {
    expect(
      phrasesBandeau(lignesAlerte('ministere', [evenement({ id: 'a' })]), 'ministere'),
    ).toEqual([])
    expect(phrasesBandeau([], 'berger')).toEqual([])
  })

  it('le ministère porteur : une phrase, sans aucun titre', () => {
    const phrases = phrasesBandeau(lignesAlerte('ministere', [aConfirmer('a')]), 'ministere')
    expect(phrases).toEqual([
      'Un événement est encore en attente de validation et sa date approche ou est passée. Mettez à jour son statut.',
    ])
    expect(phrases.join(' ')).not.toContain('Soirée')
  })

  it('plusieurs événements : le nombre en lettres de un à dix', () => {
    const phrases = phrasesBandeau(
      lignesAlerte('ministere', [aConfirmer('a'), aConfirmer('b')]),
      'ministere',
    )
    expect(phrases[0]).toMatch(/^Deux événements sont encore en attente/)
  })

  it('le ministère mentionné : il lit, il ne change pas le statut', () => {
    const phrases = phrasesBandeau(
      lignesAlerte('ministere', [aConfirmer('a', COORDINATION)]),
      'ministere',
    )
    expect(phrases).toEqual([
      'Un événement qui vous mentionne est encore en attente de validation. Le ministère qui le porte met à jour son statut.',
    ])
  })

  it('porteur et mentionné : deux phrases', () => {
    const phrases = phrasesBandeau(
      lignesAlerte('ministere', [aConfirmer('a'), aConfirmer('b', COORDINATION)]),
      'ministere',
    )
    expect(phrases).toHaveLength(2)
  })

  it('le berger, le conseil et EJP Tech : une phrase, sans consigne de mise à jour', () => {
    const phrases = phrasesBandeau(lignesAlerte('berger', [aConfirmer('a')]), 'berger')
    expect(phrases).toHaveLength(1)
    expect(phrases[0]).toContain('Le ministère qui le porte met à jour son statut.')
  })
})
