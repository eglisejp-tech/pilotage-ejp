import { describe, expect, it } from 'vitest'
import type { SessionDeclaree } from '@/data/sessionsAdmin'
import { construireLignesSessions, designationDeclaration } from '@/features/sessions/construire'
import { lireRefusSession } from '@/features/sessions/refus'
import { schemaDeclaration, schemaMinisteresAttendus } from '@/features/sessions/schemas'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import {
  phraseCoches,
  phraseManquants,
  phraseSaisies,
  prochainSamedi,
} from '@/features/sessions/textes'

const A = '10000000-0000-4000-8000-000000000001'
const B = '10000000-0000-4000-8000-000000000002'

describe('phraseManquants', () => {
  it('dit « Manquent : A, B et C » dans l’ordre alphabétique', () => {
    expect(phraseManquants(['Social', 'Intégration', 'Coordination'])).toBe(
      'Manquent : Coordination, Intégration et Social',
    )
  })
  it('accorde au singulier et au pluriel de deux', () => {
    expect(phraseManquants(['Social'])).toBe('Manque : Social')
    expect(phraseManquants(['Social', 'FIJ'])).toBe('Manquent : FIJ et Social')
  })
  it('ne dit rien quand personne ne manque', () => {
    expect(phraseManquants([])).toBeNull()
  })
})

describe('compteurs et date proposée', () => {
  it('écrit « 6 sur 8 »', () => {
    expect(phraseSaisies(6, 8)).toBe('6 sur 8')
    expect(phraseCoches(8, 8)).toBe('8 sur 8')
  })
  it('propose le prochain samedi, le jour même si c’est un samedi (heure de Paris)', () => {
    expect(prochainSamedi('2026-10-07')).toBe('2026-10-10')
    expect(prochainSamedi('2026-10-10')).toBe('2026-10-10')
    expect(prochainSamedi('2026-10-11')).toBe('2026-10-17')
  })
})

describe('schemaDeclaration', () => {
  const valide = {
    type: 'batir',
    date: '2026-10-10',
    nom: '',
    ministeres: [A, B],
  } satisfies ValeursDeclaration

  it('accepte Bâtir l’Église et rend un nom nul', () => {
    expect(schemaDeclaration.parse(valide)).toEqual({
      type: 'batir',
      date: '2026-10-10',
      intitule: null,
      ministeres: [A, B],
    })
  })
  it('ignore un nom resté dans le formulaire pour un type sans nom', () => {
    expect(schemaDeclaration.parse({ ...valide, nom: 'Soirée' }).intitule).toBeNull()
  })
  it('exige un nom pour un autre rassemblement, de 80 caractères au plus, sans espaces autour', () => {
    const autre = { ...valide, type: 'autre' } as const
    expect(schemaDeclaration.safeParse(autre).error?.issues[0]?.message).toBe(
      'Donnez un nom au rassemblement.',
    )
    expect(schemaDeclaration.safeParse({ ...autre, nom: '   ' }).success).toBe(false)
    expect(schemaDeclaration.safeParse({ ...autre, nom: 'a'.repeat(81) }).success).toBe(false)
    expect(schemaDeclaration.parse({ ...autre, nom: '  Soirée de louange ' }).intitule).toBe(
      'Soirée de louange',
    )
  })
  it('refuse une date absente ou impossible', () => {
    expect(schemaDeclaration.safeParse({ ...valide, date: '' }).success).toBe(false)
    expect(schemaDeclaration.safeParse({ ...valide, date: '2026-02-30' }).success).toBe(false)
  })
  it('accepte une date passée : une session peut se déclarer après coup', () => {
    expect(schemaDeclaration.safeParse({ ...valide, date: '2026-09-26' }).success).toBe(true)
  })
  it('exige au moins un ministère et retire les doublons', () => {
    expect(
      schemaDeclaration.safeParse({ ...valide, ministeres: [] }).error?.issues[0]?.message,
    ).toBe('Cochez au moins un ministère.')
    expect(schemaMinisteresAttendus.parse([A, A, B])).toEqual([A, B])
    expect(schemaMinisteresAttendus.safeParse(['pas-un-identifiant']).success).toBe(false)
  })
  it('nomme la session déclarée pour le message de réussite', () => {
    expect(designationDeclaration(valide)).toBe("Bâtir l'Église du 10 oct.")
    expect(designationDeclaration({ ...valide, type: 'autre', nom: ' Soirée ' })).toBe(
      'Soirée du 10 oct.',
    )
  })
})

describe('construireLignesSessions', () => {
  const base: SessionDeclaree = {
    session_id: 's1',
    type: 'batir',
    date: '2026-10-03',
    intitule: null,
    a_eu_lieu: true,
    nb_attendus: 8,
    nb_saisis: 6,
    manquants: ['Social', 'Intégration'],
  }

  it('affiche la complétude et les manquants d’une session passée, sans la proposer à la suppression', () => {
    const [ligne] = construireLignesSessions([base])
    expect(ligne).toMatchObject({
      dateCourte: 'Sam. 3 oct.',
      nom: "Bâtir l'Église",
      attendus: '8',
      supprimable: false,
      saisies: { genre: 'saisies', libelle: '6 sur 8', complet: false },
    })
    expect(ligne?.saisies).toMatchObject({ manquants: 'Manquent : Intégration et Social' })
  })
  it('marque complète une session où tous ont saisi', () => {
    const [ligne] = construireLignesSessions([{ ...base, nb_saisis: 8, manquants: [] }])
    expect(ligne?.saisies).toEqual({
      genre: 'saisies',
      libelle: '8 sur 8',
      complet: true,
      manquants: null,
    })
  })
  it('dit « pas encore eu lieu » d’une session à venir, que l’on peut supprimer', () => {
    const [ligne] = construireLignesSessions([
      { ...base, a_eu_lieu: false, nb_saisis: 0, manquants: [] },
    ])
    expect(ligne?.saisies).toEqual({ genre: 'a_venir' })
    expect(ligne?.supprimable).toBe(true)
  })
  it('nomme un autre rassemblement par son nom', () => {
    const [ligne] = construireLignesSessions([
      { ...base, type: 'autre', intitule: 'Soirée de louange' },
    ])
    expect(ligne?.nom).toBe('Soirée de louange')
    expect(ligne?.designation).toBe('Soirée de louange du 3 oct.')
  })
})

describe('lireRefusSession', () => {
  const connexion = 'La connexion a échoué.'
  it('dit tel quel un message de saisie de la base', () => {
    const refus = { code: 'P0001', message: 'Cochez au moins un ministère.' }
    expect(lireRefusSession(refus, connexion)).toBe('Cochez au moins un ministère.')
  })
  it('dit que la session n’est pas accessible pour un refus de droit', () => {
    expect(lireRefusSession({ code: '42501', message: 'x' }, connexion)).toBe(
      "Cette session n'existe pas ou vous n'y avez pas accès.",
    )
  })
  it('dit la connexion pour tout le reste', () => {
    expect(lireRefusSession(new Error('réseau'), connexion)).toBe(connexion)
    expect(lireRefusSession({ code: '500', message: 'x' }, connexion)).toBe(connexion)
  })
})
