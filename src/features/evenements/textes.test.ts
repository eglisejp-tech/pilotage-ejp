import { describe, expect, it } from 'vitest'
import {
  libelleStatut,
  ligneMentions,
  ligneReport,
  MESSAGES_BASE,
  seulPorteur,
  STATUTS_EVENEMENT,
  TEXTES_EVENEMENT,
  TEXTES_REUNION,
} from '@/features/evenements/textes'

describe('textes des saisies d’événement et de réunion', () => {
  it('les six statuts dans l’ordre de la maquette 11', () => {
    expect(STATUTS_EVENEMENT.map((statut) => statut.libelle)).toEqual([
      'Brouillon',
      'En attente de validation',
      'Validé',
      'En préparation',
      'Terminé',
      'Annulé',
    ])
    expect(libelleStatut('attente_validation')).toBe('En attente de validation')
  })

  it('« Report : du sam. 10 oct. au sam. 17 oct. »', () => {
    expect(ligneReport('2026-10-10', '2026-10-17')).toBe('Report : du sam. 10 oct. au sam. 17 oct.')
  })

  it('mentions en lecture seule et ministère porteur', () => {
    expect(ligneMentions([])).toBe('Aucun ministère mentionné.')
    expect(ligneMentions(['Coordination'])).toBe('Ministères mentionnés : Coordination.')
    expect(ligneMentions(['Coordination', 'Intégration', 'Social'])).toBe(
      'Ministères mentionnés : Coordination, Intégration et Social.',
    )
    expect(seulPorteur('Communication')).toBe(
      'Seul Communication peut mettre à jour cet événement.',
    )
  })

  it('textes de la base, clés de la table de traduction (contrat, section 7)', () => {
    expect(MESSAGES_BASE).toEqual({
      datePasseeAjout: 'La date ne peut pas être passée.',
      datePasseeMiseAJour: "La nouvelle date doit être aujourd'hui ou plus tard.",
      ligneIdentique: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
      // Heures (T68, contrat de la ponctualité, E1 à E3).
      heureDebutAVenir: "L'heure de début se saisit le jour de l'événement ou après.",
      heureDebutSansTermine: "L'heure de début se saisit pour un événement terminé.",
      heurePrevueInvalide: "L'heure prévue est invalide.",
    })
  })

  it('heures (T68) : libellés « (facultatif) », indications et consignes du guide', () => {
    expect(TEXTES_EVENEMENT.libelleHeurePrevue).toBe('Heure prévue (facultatif)')
    expect(TEXTES_EVENEMENT.libelleHeureDebut).toBe('Heure de début (facultatif)')
    expect(TEXTES_EVENEMENT.noteHeurePrevue).toBe('Les cultes du dimanche ne se déclarent pas ici.')
    expect(TEXTES_EVENEMENT.noteHeureDebut).toBe(
      "Une heure enregistrée se corrige, elle ne s'efface pas.",
    )
    // Une indication sous un champ : 80 caractères au plus (guide, section 4).
    for (const note of [TEXTES_EVENEMENT.noteHeurePrevue, TEXTES_EVENEMENT.noteHeureDebut]) {
      expect(note.length).toBeLessThanOrEqual(80)
    }
    // Consignes qui commencent par le verbe, sans « invalide » (guide, 2 et 10.8).
    expect(TEXTES_EVENEMENT.erreurHeure).toBe('Choisissez une heure valide.')
    expect(TEXTES_EVENEMENT.erreurHeureDebutSansTermine).toBe(
      "Choisissez « Terminé » pour indiquer l'heure de début.",
    )
  })

  it('aucun tiret cadratin ni demi-cadratin, aucun point d’exclamation', () => {
    const textes = [
      ...Object.values(TEXTES_EVENEMENT),
      ...Object.values(TEXTES_REUNION),
      ...Object.values(MESSAGES_BASE),
    ]
    // Les deux tirets par leur code (U+2013, U+2014), jamais écrits dans le code.
    const interdits = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}!]`)
    for (const texte of textes) {
      expect(texte, texte).not.toMatch(interdits)
    }
  })
})
