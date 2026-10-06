import { describe, expect, it } from 'vitest'
import { appelleUnSignalement, lireRefus } from '@/features/evenements/refus'
import { MESSAGES_BASE } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

const erreurBase = (message: string, code = 'P0001') => ({
  code,
  message,
  details: null,
  hint: null,
})

describe('refus de la base (contrat de l’étape 4, section 7 ; T37)', () => {
  it('une date passée à l’ajout va sous le champ date, avec le texte de la section 7', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.datePasseeAjout))).toEqual({
      ou: 'date',
      message: TEXTES_SIGNALEMENT.dateRefuseeAjout,
    })
  })

  it('une nouvelle date passée à la mise à jour va sous le champ date', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.datePasseeMiseAJour))).toEqual({
      ou: 'date',
      message: TEXTES_SIGNALEMENT.dateRefuseeMiseAJour,
    })
  })

  it('une ligne identique va sous le bouton, telle quelle', () => {
    expect(lireRefus(erreurBase(MESSAGES_BASE.ligneIdentique))).toEqual({
      ou: 'bouton',
      message: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
    })
  })

  it('une autre erreur de saisie s’affiche telle quelle sous le bouton', () => {
    expect(lireRefus(erreurBase('Ce ministère ne peut pas être mentionné.'))).toEqual({
      ou: 'bouton',
      message: 'Ce ministère ne peut pas être mentionné.',
    })
  })

  it('un refus de droit dit seulement que l’élément n’est pas accessible', () => {
    expect(lireRefus(erreurBase('new row violates row-level security policy', '42501'))).toEqual({
      ou: 'bouton',
      message: "Cet élément n'existe pas ou vous n'y avez pas accès.",
    })
  })

  it('réunion : un refus de droit est une date devenue passée, dite sous le champ date', () => {
    expect(
      lireRefus(erreurBase('new row violates row-level security policy', '42501'), 'reunion'),
    ).toEqual({
      ou: 'date',
      message: "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
    })
  })

  it('tout le reste est un problème de connexion', () => {
    expect(lireRefus(new TypeError('Failed to fetch'))).toEqual({ ou: 'connexion' })
    expect(lireRefus({ code: '', message: 'TypeError: Failed to fetch' })).toEqual({
      ou: 'connexion',
    })
    expect(lireRefus(null)).toEqual({ ou: 'connexion' })
  })

  it('seuls les deux messages de date refusée appellent le lien « Signaler une difficulté »', () => {
    expect(appelleUnSignalement(TEXTES_SIGNALEMENT.dateRefuseeAjout)).toBe(true)
    expect(appelleUnSignalement(TEXTES_SIGNALEMENT.dateRefuseeMiseAJour)).toBe(true)
    expect(appelleUnSignalement(TEXTES_SIGNALEMENT.ligneIdentique)).toBe(false)
    expect(appelleUnSignalement('Choisissez une date.')).toBe(false)
    expect(appelleUnSignalement(undefined)).toBe(false)
  })
})
