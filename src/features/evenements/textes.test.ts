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
    expect(seulPorteur('Communication')).toBe('Seul Communication met à jour cet événement.')
  })

  it('messages de la base repris tels quels (contrat, section 7)', () => {
    expect(MESSAGES_BASE).toEqual({
      datePasseeAjout: 'La date ne peut pas être passée.',
      datePasseeMiseAJour: "La nouvelle date doit être aujourd'hui ou plus tard.",
      ligneIdentique: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
      acces: "Cet élément n'existe pas ou vous n'y avez pas accès.",
    })
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
