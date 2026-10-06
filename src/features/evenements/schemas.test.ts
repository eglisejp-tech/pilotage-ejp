import { describe, expect, it } from 'vitest'
import {
  schemaAjoutEvenement,
  schemaMiseAJourEvenement,
  schemaReunion,
} from '@/features/evenements/schemas'
import { TEXTES_EVENEMENT, TEXTES_REUNION } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

const AUJOURDHUI = '2026-10-06'
const MOI = 'm-communication'

/** Premier message d'erreur de chaque champ, ou null si les valeurs passent. */
function erreurs(resultat: {
  success: boolean
  error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
  if (resultat.success) return null
  const parChamp: Record<string, string> = {}
  for (const probleme of resultat.error?.issues ?? []) {
    const champ = String(probleme.path[0])
    parChamp[champ] ??= probleme.message
  }
  return parChamp
}

describe("ajout d'un événement", () => {
  const schema = schemaAjoutEvenement({ aujourdhui: AUJOURDHUI, ministereId: MOI })
  const valide = {
    date: '2026-10-10',
    titre: 'Soirée de louange',
    statut: 'brouillon',
    mentions: [],
  }

  it('accepte un événement complet, nom sans espaces autour', () => {
    expect(schema.parse({ ...valide, titre: '  Soirée de louange  ' })).toEqual({
      ...valide,
      titre: 'Soirée de louange',
    })
  })

  it('date : vide refusée, passée refusée avec le texte de la section 7, aujourd’hui acceptée', () => {
    expect(erreurs(schema.safeParse({ ...valide, date: '' }))).toEqual({
      date: TEXTES_EVENEMENT.erreurDateVide,
    })
    expect(erreurs(schema.safeParse({ ...valide, date: '2026-10-05' }))).toEqual({
      date: TEXTES_SIGNALEMENT.dateRefuseeAjout,
    })
    expect(schema.safeParse({ ...valide, date: AUJOURDHUI }).success).toBe(true)
  })

  it('nom : de 1 à 80 caractères après les espaces', () => {
    expect(erreurs(schema.safeParse({ ...valide, titre: '   ' }))).toEqual({
      titre: TEXTES_EVENEMENT.erreurNomVide,
    })
    expect(schema.safeParse({ ...valide, titre: 'a'.repeat(80) }).success).toBe(true)
    expect(erreurs(schema.safeParse({ ...valide, titre: 'a'.repeat(81) }))).toEqual({
      titre: TEXTES_EVENEMENT.erreurNomLong,
    })
  })

  it('statut : un des six, sinon « Choisissez un statut. »', () => {
    expect(erreurs(schema.safeParse({ ...valide, statut: '' }))).toEqual({
      statut: TEXTES_EVENEMENT.erreurStatut,
    })
    expect(erreurs(schema.safeParse({ ...valide, statut: 'reporte' }))).toEqual({
      statut: TEXTES_EVENEMENT.erreurStatut,
    })
    for (const statut of [
      'brouillon',
      'attente_validation',
      'valide',
      'preparation',
      'termine',
      'annule',
    ]) {
      expect(schema.safeParse({ ...valide, statut }).success, statut).toBe(true)
    }
  })

  it('mentions : sans doublon, jamais le ministère lui-même', () => {
    expect(
      schema.parse({ ...valide, mentions: ['m-coordination', 'm-coordination', 'm-social'] })
        .mentions,
    ).toEqual(['m-coordination', 'm-social'])
    expect(erreurs(schema.safeParse({ ...valide, mentions: ['m-coordination', MOI] }))).toEqual({
      mentions: TEXTES_EVENEMENT.erreurMention,
    })
  })
})

describe("mise à jour d'un événement (T37)", () => {
  it('une date inchangée reste permise, même passée', () => {
    const schema = schemaMiseAJourEvenement({ aujourdhui: AUJOURDHUI, dateActuelle: '2026-10-01' })
    expect(schema.safeParse({ date: '2026-10-01', statut: 'termine' }).success).toBe(true)
  })

  it('une nouvelle date passée est refusée, avec le texte de la mise à jour', () => {
    const schema = schemaMiseAJourEvenement({ aujourdhui: AUJOURDHUI, dateActuelle: '2026-10-10' })
    expect(erreurs(schema.safeParse({ date: '2026-10-05', statut: 'valide' }))).toEqual({
      date: TEXTES_SIGNALEMENT.dateRefuseeMiseAJour,
    })
    expect(schema.safeParse({ date: AUJOURDHUI, statut: 'valide' }).success).toBe(true)
    expect(schema.safeParse({ date: '2026-10-17', statut: 'valide' }).success).toBe(true)
  })

  it('une ligne identique passe le formulaire : la base la refuse avec son message', () => {
    const schema = schemaMiseAJourEvenement({ aujourdhui: AUJOURDHUI, dateActuelle: '2026-10-10' })
    expect(schema.safeParse({ date: '2026-10-10', statut: 'valide' }).success).toBe(true)
  })
})

describe('prochaine réunion', () => {
  const schema = schemaReunion({ aujourdhui: AUJOURDHUI })

  it('date obligatoire, du jour ou à venir ; le reste facultatif devient null', () => {
    expect(schema.parse({ date: AUJOURDHUI, heure: '', objet: '  ', decision: '' })).toEqual({
      date: AUJOURDHUI,
      heure: null,
      objet: null,
      decision: null,
    })
    expect(erreurs(schema.safeParse({ date: '', heure: '', objet: '', decision: '' }))).toEqual({
      date: TEXTES_REUNION.erreurDateVide,
    })
    expect(
      erreurs(schema.safeParse({ date: '2026-10-05', heure: '', objet: '', decision: '' })),
    ).toEqual({ date: TEXTES_REUNION.erreurDatePassee })
  })

  it('heure au format HH:MM, objet et décision de 80 caractères au plus', () => {
    expect(
      schema.parse({ date: '2026-10-12', heure: '20:00', objet: ' Bilan ', decision: 'Salle' }),
    ).toEqual({ date: '2026-10-12', heure: '20:00', objet: 'Bilan', decision: 'Salle' })
    expect(
      erreurs(schema.safeParse({ date: '2026-10-12', heure: '25:00', objet: '', decision: '' })),
    ).toEqual({ heure: TEXTES_REUNION.erreurHeure })
    expect(
      erreurs(
        schema.safeParse({
          date: '2026-10-12',
          heure: '',
          objet: 'a'.repeat(81),
          decision: 'b'.repeat(81),
        }),
      ),
    ).toEqual({
      objet: TEXTES_REUNION.erreurObjetLong,
      decision: TEXTES_REUNION.erreurDecisionLongue,
    })
    expect(
      schema.safeParse({ date: '2026-10-12', heure: '', objet: 'a'.repeat(80), decision: '' })
        .success,
    ).toBe(true)
  })
})
