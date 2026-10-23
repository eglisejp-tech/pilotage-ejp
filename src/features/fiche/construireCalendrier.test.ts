import { describe, expect, it } from 'vitest'
import type { EvenementDuCalendrier } from '@/data/evenements'
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

function evenement(
  surcharge: Partial<EvenementDuCalendrier> & { id: string },
): EvenementDuCalendrier {
  return {
    ministere_id: COMMUNICATION,
    titre: 'Soirée de louange',
    date: '2026-10-10',
    statut: 'preparation',
    jours: 4,
    a_confirmer: false,
    reporte_du: null,
    heure_prevue: null,
    heure_debut: null,
    retard: null,
    a_l_heure: null,
    ...surcharge,
  }
}

const lectures = (
  evenements: EvenementDuCalendrier[],
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

  it('un événement qui mentionne le ministère : « Mentionné par Coordination », sans bouton', () => {
    const [ligne] = construireCalendrier(
      lectures([evenement({ id: 'm', ministere_id: COORDINATION })]),
      { ministereId: COMMUNICATION, profil: 'ministere' },
    )
    expect(ligne?.mentionnePar).toBe('Mentionné par Coordination')
    expect(ligne).not.toHaveProperty('lectureSeule')
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

describe('construireCalendrier : heures (T68)', () => {
  const termine = (surcharge: Partial<EvenementDuCalendrier> & { id: string }) =>
    evenement({
      statut: 'termine',
      date: '2026-10-03',
      jours: -1,
      heure_prevue: 1140,
      ...surcharge,
    })

  it('l’heure prévue suit la date : « Sam. 10 oct., 19 h », « Sam. 10 oct., 19 h 30 »', () => {
    const lignes = construireCalendrier(
      lectures([
        evenement({ id: 'a', titre: 'A', heure_prevue: 1140 }),
        evenement({ id: 'b', titre: 'B', heure_prevue: 1170 }),
        evenement({ id: 'c', titre: 'C' }),
      ]),
      { ministereId: COMMUNICATION, profil: 'berger' },
    )
    expect(lignes.map((l) => [l.jour, l.heure])).toEqual([
      ['Sam. 10 oct.', '19 h'],
      ['Sam. 10 oct.', '19 h 30'],
      ['Sam. 10 oct.', null],
    ])
  })

  it('sous un Terminé : le retard et « à l’heure » lus dans la vue, jamais recalculés', () => {
    const lignes = construireCalendrier(
      lectures([
        termine({ id: 'a', titre: 'A', heure_debut: 1152, retard: 12, a_l_heure: false }),
        termine({ id: 'b', titre: 'B', heure_debut: 1143, retard: 3, a_l_heure: true }),
        // Avance : à l'heure.
        termine({ id: 'c', titre: 'C', heure_debut: 1135, retard: -5, a_l_heure: true }),
        // Sans heure prévue : l'heure de début seule.
        termine({ id: 'd', titre: 'D', heure_prevue: null, heure_debut: 1152 }),
        // La vue décide : un retard de 12 dit « à l'heure » s'affiche tel quel.
        termine({ id: 'e', titre: 'E', heure_debut: 1152, retard: 12, a_l_heure: true }),
      ]),
      { ministereId: COMMUNICATION, profil: 'berger' },
    )
    expect(lignes.map((l) => l.debut)).toEqual([
      'Commencé à 19 h 12, 12 min de retard',
      "Commencé à 19 h 03, à l'heure",
      "Commencé à 18 h 55, à l'heure",
      'Commencé à 19 h 12',
      "Commencé à 19 h 12, à l'heure",
    ])
    expect(lignes.every((l) => !l.heureDebutAIndiquer)).toBe(true)
  })

  it('« Heure de début à indiquer » : le porteur seul, Terminé du jour ou passé, sans heure de début', () => {
    const evenements = [
      termine({ id: 'propre', titre: 'A' }),
      termine({ id: 'jour', titre: 'B', jours: 0 }),
      // Terminé à une date à venir : la base refuserait l'heure de début (E1).
      termine({ id: 'avenir', titre: 'C', jours: 2, date: '2026-10-12' }),
      termine({ id: 'autre', titre: 'D', ministere_id: COORDINATION }),
      evenement({ id: 'pas-termine', titre: 'E', jours: -1, date: '2026-10-03' }),
    ]
    const indiquer = (profil: 'ministere' | 'berger') =>
      construireCalendrier(lectures(evenements), { ministereId: COMMUNICATION, profil })
        .filter((l) => l.heureDebutAIndiquer)
        .map((l) => l.id)
    expect(indiquer('ministere')).toEqual(['propre', 'jour'])
    expect(indiquer('berger')).toEqual([])
    const lignes = construireCalendrier(lectures(evenements), {
      ministereId: COMMUNICATION,
      profil: 'ministere',
    })
    expect(lignes.every((l) => l.debut === null)).toBe(true)
  })
})

describe('phrasesBandeau', () => {
  const lignesAlerte = (profil: 'ministere' | 'berger', evenements: EvenementDuCalendrier[]) =>
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
      'Un événement proche ou passé attend toujours sa validation. Mettez à jour son statut.',
    ])
    expect(phrases.join(' ')).not.toContain('Soirée')
  })

  it('plusieurs événements : le nombre en chiffres (T66)', () => {
    const phrases = phrasesBandeau(
      lignesAlerte('ministere', [aConfirmer('a'), aConfirmer('b')]),
      'ministere',
    )
    expect(phrases[0]).toBe(
      '2 événements proches ou passés attendent toujours leur validation. Mettez à jour leur statut.',
    )
  })

  it('le ministère mentionné : il lit, sans droits décrits', () => {
    const phrases = phrasesBandeau(
      lignesAlerte('ministere', [aConfirmer('a', COORDINATION)]),
      'ministere',
    )
    expect(phrases).toEqual(['Un événement qui vous mentionne attend toujours sa validation.'])
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
    expect(phrases).toEqual(['Un événement proche ou passé attend toujours sa validation.'])
  })
})
