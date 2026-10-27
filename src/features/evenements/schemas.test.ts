import { describe, expect, it } from 'vitest'
import {
  heureDebutPossible,
  schemaAjoutEvenement,
  schemaBaseAjoutEvenement,
  schemaBaseMiseAJourEvenement,
  schemaBaseReunion,
  schemaMiseAJourEvenement,
  schemaReunion,
  valeurChampHeure,
} from '@/features/evenements/schemas'
import { TEXTES_EVENEMENT, TEXTES_REUNION } from '@/features/evenements/textes'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

const AUJOURDHUI = '2026-10-06'
const MOI = '10000000-0000-4000-8000-000000000001'

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
    heure_prevue: '',
    titre: 'Soirée de louange',
    statut: 'brouillon',
    mentions: [],
  }

  it('accepte un événement complet, nom sans espaces autour, sans heure prévue', () => {
    expect(schema.parse({ ...valide, titre: '  Soirée de louange  ' })).toEqual({
      ...valide,
      titre: 'Soirée de louange',
      heure_prevue: null,
      // « Un jour » par défaut (T78, lot 2) : un événement, sans dernier jour ni heure de fin.
      forme: 'evenement',
      date_fin: null,
      heure_fin: null,
    })
  })

  it('heure prévue (T68) : « 19:05 » devient 1145 minutes, « 00:00 » 0, « 23:59 » 1439', () => {
    expect(schema.parse({ ...valide, heure_prevue: '19:05' }).heure_prevue).toBe(1145)
    expect(schema.parse({ ...valide, heure_prevue: '00:00' }).heure_prevue).toBe(0)
    expect(schema.parse({ ...valide, heure_prevue: '23:59' }).heure_prevue).toBe(1439)
    expect(schema.parse({ ...valide, heure_prevue: ' ' }).heure_prevue).toBeNull()
  })

  it('heure prévue illisible : « Choisissez une heure valide. », la phrase du refus de la base', () => {
    for (const heure of ['24:00', '19h05', '7:05', '19:60']) {
      expect(erreurs(schema.safeParse({ ...valide, heure_prevue: heure })), heure).toEqual({
        heure_prevue: TEXTES_EVENEMENT.erreurHeure,
      })
    }
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
      schema.parse({
        ...valide,
        mentions: [
          '10000000-0000-4000-8000-000000000002',
          '10000000-0000-4000-8000-000000000002',
          '10000000-0000-4000-8000-000000000008',
        ],
      }).mentions,
    ).toEqual(['10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000008'])
    expect(
      erreurs(
        schema.safeParse({ ...valide, mentions: ['10000000-0000-4000-8000-000000000002', MOI] }),
      ),
    ).toEqual({
      mentions: TEXTES_EVENEMENT.erreurMention,
    })
  })
})

describe('mentions : identifiants de la base', () => {
  const schema = schemaAjoutEvenement({ aujourdhui: AUJOURDHUI, ministereId: MOI })
  it('un identifiant qui n’est pas un uuid est refusé avec le message des mentions', () => {
    const resultat = schema.safeParse({
      date: '2026-10-10',
      heure_prevue: '',
      titre: 'Soirée',
      statut: 'brouillon',
      mentions: ['pas-un-uuid'],
    })
    expect(erreurs(resultat)).toEqual({ mentions: TEXTES_EVENEMENT.erreurMention })
  })
})

describe('schémas de base, appliqués par src/data à chaque appel', () => {
  it('ajout : date, titre de 1 à 80 caractères, statut de la liste, mentions uuid', () => {
    const valide = {
      date: '2026-10-10',
      titre: 'Soirée',
      statut: 'valide',
      mentions: [],
      heure_prevue: null,
    }
    expect(schemaBaseAjoutEvenement.safeParse(valide).success).toBe(true)
    expect(schemaBaseAjoutEvenement.safeParse({ ...valide, heure_prevue: 0 }).success).toBe(true)
    expect(schemaBaseAjoutEvenement.safeParse({ ...valide, heure_prevue: 1439 }).success).toBe(true)
    for (const heure of [-1, 1440, 19.5, '19:00', undefined]) {
      expect(
        schemaBaseAjoutEvenement.safeParse({ ...valide, heure_prevue: heure }).success,
        String(heure),
      ).toBe(false)
    }
    expect(schemaBaseAjoutEvenement.safeParse({ ...valide, titre: 'a'.repeat(81) }).success).toBe(
      false,
    )
    expect(schemaBaseAjoutEvenement.safeParse({ ...valide, titre: '  ' }).success).toBe(false)
    expect(schemaBaseAjoutEvenement.safeParse({ ...valide, statut: 'reporte' }).success).toBe(false)
    expect(schemaBaseAjoutEvenement.safeParse({ ...valide, date: '10/10/2026' }).success).toBe(
      false,
    )
    expect(schemaBaseAjoutEvenement.safeParse({ ...valide, mentions: ['x'] }).success).toBe(false)
  })

  it('mise à jour : date, statut et heures ; réunion : heure HH:MM, textes de 80 caractères au plus', () => {
    const sansHeure = { heure_prevue: null, heure_debut: null }
    expect(
      schemaBaseMiseAJourEvenement.safeParse({ date: '2026-10-10', statut: 'annule', ...sansHeure })
        .success,
    ).toBe(true)
    expect(
      schemaBaseMiseAJourEvenement.safeParse({ date: '2026-10-10', statut: '', ...sansHeure })
        .success,
    ).toBe(false)
    expect(
      schemaBaseMiseAJourEvenement.safeParse({
        date: '2026-10-03',
        statut: 'termine',
        heure_prevue: 1140,
        heure_debut: 1152,
      }).success,
    ).toBe(true)
    const reunion = { date: '2026-10-12', heure: null, objet: null, decision: null }
    expect(schemaBaseReunion.safeParse(reunion).success).toBe(true)
    expect(schemaBaseReunion.safeParse({ ...reunion, heure: '25:00' }).success).toBe(false)
    expect(schemaBaseReunion.safeParse({ ...reunion, objet: 'a'.repeat(81) }).success).toBe(false)
    expect(schemaBaseReunion.safeParse({ ...reunion, decision: '' }).success).toBe(false)
  })
})

describe("mise à jour d'un événement (T37)", () => {
  const vides = { heure_prevue: '', heure_debut: '' }

  it('une date inchangée reste permise, même passée', () => {
    const schema = schemaMiseAJourEvenement({ aujourdhui: AUJOURDHUI, dateActuelle: '2026-10-01' })
    expect(schema.safeParse({ date: '2026-10-01', statut: 'termine', ...vides }).success).toBe(true)
  })

  it('une nouvelle date passée est refusée, avec le texte de la mise à jour', () => {
    const schema = schemaMiseAJourEvenement({ aujourdhui: AUJOURDHUI, dateActuelle: '2026-10-10' })
    expect(erreurs(schema.safeParse({ date: '2026-10-05', statut: 'valide', ...vides }))).toEqual({
      date: TEXTES_SIGNALEMENT.dateRefuseeMiseAJour,
    })
    expect(schema.safeParse({ date: AUJOURDHUI, statut: 'valide', ...vides }).success).toBe(true)
    expect(schema.safeParse({ date: '2026-10-17', statut: 'valide', ...vides }).success).toBe(true)
  })

  it('une ligne identique passe le schéma : le formulaire, puis la base, l’arrêtent', () => {
    const schema = schemaMiseAJourEvenement({ aujourdhui: AUJOURDHUI, dateActuelle: '2026-10-10' })
    expect(schema.safeParse({ date: '2026-10-10', statut: 'valide', ...vides }).success).toBe(true)
  })
})

describe("mise à jour d'un événement : heures (T68)", () => {
  const schema = schemaMiseAJourEvenement({ aujourdhui: AUJOURDHUI, dateActuelle: '2026-10-03' })

  it('vides : null, la base reprend les heures enregistrées', () => {
    expect(
      schema.parse({ date: '2026-10-03', statut: 'termine', heure_prevue: '', heure_debut: '' }),
    ).toEqual({
      date: '2026-10-03',
      statut: 'termine',
      heure_prevue: null,
      heure_debut: null,
      // Un seul jour (T78, lot 2) : pas de dernier jour ; heure de fin vide, la base la reprend.
      date_fin: null,
      heure_fin: null,
    })
  })

  it('Terminé daté au plus aujourd’hui : l’heure de début part en minutes', () => {
    for (const date of ['2026-10-03', AUJOURDHUI]) {
      expect(
        schema.parse({ date, statut: 'termine', heure_prevue: '19:00', heure_debut: '19:12' }),
      ).toEqual({
        date,
        statut: 'termine',
        heure_prevue: 1140,
        heure_debut: 1152,
        date_fin: null,
        heure_fin: null,
      })
    }
  })

  it('plusieurs jours (T78, lot 2) : le dernier jour part ; égal au premier, un seul jour ; vide ou avant : refusé', () => {
    const camp = schemaMiseAJourEvenement({
      aujourdhui: AUJOURDHUI,
      dateActuelle: '2026-10-31',
      plusieursJours: true,
    })
    const valeurs = { date: '2026-10-31', statut: 'valide', heure_prevue: '', heure_debut: '' }
    expect(camp.parse({ ...valeurs, date_fin: '2026-11-02', heure_fin: '17:00' })).toMatchObject({
      date_fin: '2026-11-02',
      heure_fin: 1020,
    })
    expect(camp.parse({ ...valeurs, date_fin: '2026-10-31' }).date_fin).toBe('2026-10-31')
    expect(erreurs(camp.safeParse({ ...valeurs, date_fin: '' }))).toEqual({
      date_fin: 'Choisissez le dernier jour.',
    })
    expect(erreurs(camp.safeParse({ ...valeurs, date_fin: '2026-10-30' }))).toEqual({
      date_fin: 'Le dernier jour doit suivre le premier.',
    })
    expect(erreurs(camp.safeParse({ ...valeurs, date_fin: '2026-12-01' }))).toEqual({
      date_fin:
        'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.',
    })
  })

  it('l’heure de début gardée d’un champ caché ne part pas : sans Terminé, ou date à venir', () => {
    expect(
      schema.parse({ date: '2026-10-03', statut: 'annule', heure_prevue: '', heure_debut: '19:12' })
        .heure_debut,
    ).toBeNull()
    expect(
      schema.parse({
        date: '2026-10-17',
        statut: 'termine',
        heure_prevue: '',
        heure_debut: '19:12',
      }).heure_debut,
    ).toBeNull()
  })

  it('heure illisible : « Choisissez une heure valide. » sous son champ', () => {
    expect(
      erreurs(
        schema.safeParse({
          date: '2026-10-03',
          statut: 'termine',
          heure_prevue: '25:00',
          heure_debut: '7h',
        }),
      ),
    ).toEqual({
      heure_prevue: TEXTES_EVENEMENT.erreurHeure,
      heure_debut: TEXTES_EVENEMENT.erreurHeure,
    })
  })

  it('heureDebutPossible : Terminé, date valide au plus aujourd’hui', () => {
    expect(
      heureDebutPossible({ statut: 'termine', date: AUJOURDHUI, aujourdhui: AUJOURDHUI }),
    ).toBe(true)
    expect(
      heureDebutPossible({ statut: 'termine', date: '2026-10-07', aujourdhui: AUJOURDHUI }),
    ).toBe(false)
    expect(
      heureDebutPossible({ statut: 'valide', date: '2026-10-01', aujourdhui: AUJOURDHUI }),
    ).toBe(false)
    expect(heureDebutPossible({ statut: 'termine', date: '', aujourdhui: AUJOURDHUI })).toBe(false)
  })

  it('valeurChampHeure : minutes en « HH:MM » pour un champ `type="time"`', () => {
    expect(valeurChampHeure(null)).toBe('')
    expect(valeurChampHeure(0)).toBe('00:00')
    expect(valeurChampHeure(1145)).toBe('19:05')
    expect(valeurChampHeure(1439)).toBe('23:59')
  })

  it('schéma de base : heure de début sans Terminé refusée (E2), sous son champ', () => {
    const resultat = schemaBaseMiseAJourEvenement.safeParse({
      date: '2026-10-03',
      statut: 'valide',
      heure_prevue: null,
      heure_debut: 1152,
    })
    expect(erreurs(resultat)).toEqual({ heure_debut: TEXTES_EVENEMENT.erreurHeureDebutSansTermine })
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
