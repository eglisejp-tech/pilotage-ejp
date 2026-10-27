import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import {
  ajouterEvenement,
  ajouterSerie,
  lireEvenementAMettreAJour,
  lireMentionsEvenement,
  mettreAJourEvenement,
} from './evenementsEcriture'
import { enregistrerReunion, lireProchaineReunion } from './reunions'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

/** Faux client : les requêtes de `fauxRequete`, plus `rpc` pour les fonctions de la base. */
function installer(
  reponses: Parameters<typeof fauxRequete>[0] = {},
  rpc: ReponseFausse = { data: null, error: null },
) {
  const faux = fauxRequete(reponses)
  const appelRpc = vi.fn<(nom: string, args: unknown) => Promise<ReponseFausse>>(() =>
    Promise.resolve(rpc),
  )
  courant.client = { from: faux.client.from, rpc: appelRpc }
  return { ...faux, rpc: appelRpc }
}

beforeEach(() => {
  courant.client = undefined
})

/** Numéro anti-doublon tiré par le formulaire (T76). */
const NUMERO = 'a1000000-0000-4000-8000-000000000001'

describe('ajouterEvenement', () => {
  it('appelle ajouter_evenement avec ses huit arguments (T78, lot 2 : sans fin, null), rend l’identifiant', async () => {
    const faux = installer({}, { data: '20000000-0000-4000-8000-000000000001', error: null })
    const id = await ajouterEvenement(
      {
        date: '2026-10-10',
        titre: 'Soirée de louange',
        statut: 'attente_validation',
        mentions: ['10000000-0000-4000-8000-000000000002'],
        heure_prevue: 1140,
      },
      NUMERO,
    )
    expect(id).toBe('20000000-0000-4000-8000-000000000001')
    expect(faux.rpc).toHaveBeenCalledWith('ajouter_evenement', {
      p_titre: 'Soirée de louange',
      p_date: '2026-10-10',
      p_date_fin: null,
      p_statut: 'attente_validation',
      p_mentions: ['10000000-0000-4000-8000-000000000002'],
      p_heure_prevue: 1140,
      p_heure_fin: null,
      p_cle: NUMERO,
    })
    // Jamais d'ajout direct dans `evenement` ni dans `evenement_mention`.
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('S6 : plusieurs jours et heure de fin partent tels quels ; un dernier jour avant le premier est refusé', async () => {
    const faux = installer({}, { data: '20000000-0000-4000-8000-000000000001', error: null })
    const camp = {
      date: '2026-10-31',
      date_fin: '2026-11-02',
      titre: 'Camp de Toussaint',
      statut: 'valide' as const,
      mentions: [],
      heure_prevue: 600,
      heure_fin: 1020,
    }
    await ajouterEvenement(camp, NUMERO)
    expect(faux.rpc).toHaveBeenCalledWith(
      'ajouter_evenement',
      expect.objectContaining({ p_date_fin: '2026-11-02', p_heure_fin: 1020 }),
    )
    await expect(ajouterEvenement({ ...camp, date_fin: '2026-10-30' }, NUMERO)).rejects.toThrow()
    await expect(ajouterEvenement({ ...camp, date_fin: '2026-12-01' }, NUMERO)).rejects.toThrow()
  })

  it('sans heure prévue : la version à six arguments, avec null (jamais deux candidates)', async () => {
    const faux = installer({}, { data: '20000000-0000-4000-8000-000000000001', error: null })
    await ajouterEvenement(
      {
        date: '2026-10-10',
        titre: 'Soirée de louange',
        statut: 'brouillon',
        mentions: [],
        heure_prevue: null,
      },
      NUMERO,
    )
    expect(faux.rpc).toHaveBeenCalledWith(
      'ajouter_evenement',
      expect.objectContaining({ p_heure_prevue: null, p_cle: NUMERO }),
    )
  })

  it('un refus de la base est relancé tel quel, sans nouvel essai', async () => {
    const refus = { code: 'P0001', message: 'La date ne peut pas être passée.' }
    const faux = installer({}, { data: null, error: refus })
    await expect(
      ajouterEvenement(
        {
          date: '2026-10-01',
          titre: 'Essai',
          statut: 'brouillon',
          mentions: [],
          heure_prevue: null,
        },
        NUMERO,
      ),
    ).rejects.toBe(refus)
    expect(faux.rpc).toHaveBeenCalledTimes(1)
  })
})

describe('ajouterSerie (T78, lot 2)', () => {
  it('S1 : appelle ajouter_evenements_serie avec les dates, les heures et le numéro', async () => {
    const faux = installer({}, { data: '30000000-0000-4000-8000-000000000001', error: null })
    const dates = ['2026-11-02', '2026-11-09', '2026-11-16']
    const serie = await ajouterSerie(
      {
        dates,
        titre: 'Réunion des responsables',
        statut: 'valide',
        mentions: [],
        heure_prevue: 1140,
        heure_fin: 1260,
      },
      NUMERO,
    )
    expect(serie).toBe('30000000-0000-4000-8000-000000000001')
    expect(faux.rpc).toHaveBeenCalledWith('ajouter_evenements_serie', {
      p_titre: 'Réunion des responsables',
      p_dates: dates,
      p_statut: 'valide',
      p_mentions: [],
      p_heure_prevue: 1140,
      p_heure_fin: 1260,
      p_cle: NUMERO,
    })
  })

  it('une seule date ou plus de 31 : refusé avant tout appel', async () => {
    const faux = installer()
    const serie = {
      titre: 'Réunion',
      statut: 'valide' as const,
      mentions: [],
      heure_prevue: null,
      heure_fin: null,
    }
    await expect(ajouterSerie({ ...serie, dates: ['2026-11-02'] }, NUMERO)).rejects.toThrow()
    const trop = Array.from(
      { length: 32 },
      (_, rang) => `2026-12-${String(rang + 1).padStart(2, '0')}`,
    )
    await expect(ajouterSerie({ ...serie, dates: trop }, NUMERO)).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })
})

describe('mettreAJourEvenement', () => {
  it('ajoute une ligne d’état avec ses deux heures, jamais une mise à jour', async () => {
    const faux = installer()
    await mettreAJourEvenement('20000000-0000-4000-8000-000000000001', {
      date: '2026-10-17',
      statut: 'valide',
      heure_prevue: 1140,
      heure_debut: null,
    })
    expect(appelsDe(faux.de('evenement_etat')[0])).toEqual([
      'insert({"evenement_id":"20000000-0000-4000-8000-000000000001","date":"2026-10-17","statut":"valide","heure_prevue":1140,"heure_debut":null,"date_fin":null,"heure_fin":null})',
    ])
  })

  it('Terminé avec son heure de début : les deux heures partent en minutes', async () => {
    const faux = installer()
    await mettreAJourEvenement('20000000-0000-4000-8000-000000000001', {
      date: '2026-10-03',
      statut: 'termine',
      heure_prevue: null,
      heure_debut: 1152,
    })
    expect(appelsDe(faux.de('evenement_etat')[0])).toEqual([
      'insert({"evenement_id":"20000000-0000-4000-8000-000000000001","date":"2026-10-03","statut":"termine","heure_prevue":null,"heure_debut":1152,"date_fin":null,"heure_fin":null})',
    ])
  })

  it('le refus d’une ligne identique est relancé tel quel', async () => {
    const refus = {
      code: 'P0001',
      message: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
    }
    installer({ evenement_etat: { data: null, error: refus } })
    await expect(
      mettreAJourEvenement('20000000-0000-4000-8000-000000000001', {
        date: '2026-10-10',
        statut: 'preparation',
        heure_prevue: null,
        heure_debut: null,
      }),
    ).rejects.toBe(refus)
  })
})

describe('validation avant tout appel à la base (Zod partagé avec les formulaires)', () => {
  const evenement = {
    date: '2026-10-10',
    titre: 'Soirée de louange',
    statut: 'brouillon' as const,
    mentions: [],
    heure_prevue: null,
  }
  const miseAJour = {
    date: '2026-10-10',
    statut: 'valide' as const,
    heure_prevue: null,
    heure_debut: null,
  }
  const reunion = { date: '2026-10-12', heure: null, objet: null, decision: null }
  const MINISTERE = '10000000-0000-4000-8000-000000000001'

  it('ajouterEvenement : titre trop long, statut hors liste, mention qui n’est pas un uuid', async () => {
    const faux = installer()
    await expect(
      ajouterEvenement({ ...evenement, titre: 'a'.repeat(81) }, NUMERO),
    ).rejects.toThrow()
    await expect(
      ajouterEvenement({ ...evenement, statut: 'reporte' as unknown as 'brouillon' }, NUMERO),
    ).rejects.toThrow()
    await expect(
      ajouterEvenement({ ...evenement, mentions: ['pas-un-uuid'] }, NUMERO),
    ).rejects.toThrow()
    // Heure prévue hors de la journée ou pas entière (T68, E3).
    await expect(ajouterEvenement({ ...evenement, heure_prevue: 1440 }, NUMERO)).rejects.toThrow()
    await expect(ajouterEvenement({ ...evenement, heure_prevue: -1 }, NUMERO)).rejects.toThrow()
    await expect(ajouterEvenement({ ...evenement, heure_prevue: 19.5 }, NUMERO)).rejects.toThrow()
    // Numéro anti-doublon qui n'est pas un uuid (T76) : un bogue du code, rien ne part.
    await expect(ajouterEvenement(evenement, 'pas-un-numero')).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('mettreAJourEvenement : statut vide, date mal formée, identifiant qui n’est pas un uuid', async () => {
    const faux = installer()
    const id = '20000000-0000-4000-8000-000000000001'
    await expect(
      mettreAJourEvenement(id, { ...miseAJour, statut: '' as unknown as 'valide' }),
    ).rejects.toThrow()
    await expect(mettreAJourEvenement(id, { ...miseAJour, date: '10/10/2026' })).rejects.toThrow()
    await expect(mettreAJourEvenement('e-1', miseAJour)).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('mettreAJourEvenement : heure de début sans Terminé (E2), heure hors de la journée', async () => {
    const faux = installer()
    const id = '20000000-0000-4000-8000-000000000001'
    await expect(mettreAJourEvenement(id, { ...miseAJour, heure_debut: 1152 })).rejects.toThrow(
      "Choisissez « Terminé » pour indiquer l'heure de début.",
    )
    await expect(
      mettreAJourEvenement(id, { ...miseAJour, statut: 'termine', heure_debut: 1440 }),
    ).rejects.toThrow()
    await expect(mettreAJourEvenement(id, { ...miseAJour, heure_prevue: 2000 })).rejects.toThrow()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('enregistrerReunion : heure mal formée, objet trop long, ministère qui n’est pas un uuid', async () => {
    const faux = installer()
    await expect(enregistrerReunion(MINISTERE, { ...reunion, heure: '8h' })).rejects.toThrow()
    await expect(
      enregistrerReunion(MINISTERE, { ...reunion, objet: 'a'.repeat(81) }),
    ).rejects.toThrow()
    await expect(enregistrerReunion('m-1', reunion)).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
    expect(faux.from).not.toHaveBeenCalled()
  })
})

describe('lectures de la mise à jour', () => {
  it('dernier état d’un événement lisible, null sinon', async () => {
    const ligne = {
      id: '20000000-0000-4000-8000-000000000001',
      ministere_id: '10000000-0000-4000-8000-000000000001',
      titre: 'Soirée de louange',
    }
    const faux = installer({ v_evenement: { data: ligne, error: null } })
    expect(await lireEvenementAMettreAJour('20000000-0000-4000-8000-000000000001')).toBe(ligne)
    expect(appelsDe(faux.de('v_evenement')[0])).toEqual([
      'select("id, ministere_id, titre, date, statut, a_confirmer, reporte_du, heure_prevue, heure_debut, date_fin, heure_fin, jours_fin, serie_id, titre_precedent, titre_corrige_le")',
      'eq("id", "20000000-0000-4000-8000-000000000001")',
      'maybeSingle()',
    ])
    installer({ v_evenement: { data: null, error: null } })
    expect(await lireEvenementAMettreAJour('20000000-0000-4000-8000-000000000002')).toBeNull()
  })

  it('mentions en vigueur d’un événement (T78)', async () => {
    const faux = installer({
      v_evenement_mention: {
        data: [
          {
            evenement_id: '20000000-0000-4000-8000-000000000001',
            ministere_id: '10000000-0000-4000-8000-000000000002',
          },
        ],
        error: null,
      },
    })
    expect(await lireMentionsEvenement('20000000-0000-4000-8000-000000000001')).toEqual([
      {
        evenement_id: '20000000-0000-4000-8000-000000000001',
        ministere_id: '10000000-0000-4000-8000-000000000002',
      },
    ])
    expect(appelsDe(faux.de('v_evenement_mention')[0])).toEqual([
      'select("evenement_id, ministere_id")',
      'eq("evenement_id", "20000000-0000-4000-8000-000000000001")',
    ])
  })

  it('une erreur de lecture est relancée', async () => {
    installer({ v_evenement: { data: null, error: new Error('refusé') } })
    await expect(lireEvenementAMettreAJour('20000000-0000-4000-8000-000000000001')).rejects.toThrow(
      'refusé',
    )
  })
})

describe('prochaine réunion', () => {
  it('lit la réunion déclarée du ministère', async () => {
    const faux = installer({ v_prochaine_reunion: { data: null, error: null } })
    expect(await lireProchaineReunion('10000000-0000-4000-8000-000000000001')).toBeNull()
    expect(appelsDe(faux.de('v_prochaine_reunion')[0])).toEqual([
      'select("id, ministere_id, date, heure, objet, decision_attendue")',
      'eq("ministere_id", "10000000-0000-4000-8000-000000000001")',
      'maybeSingle()',
    ])
  })

  it('ajoute une déclaration (jamais une mise à jour), décision dans decision_attendue', async () => {
    const faux = installer()
    await enregistrerReunion('10000000-0000-4000-8000-000000000001', {
      date: '2026-10-12',
      heure: '20:00',
      objet: null,
      decision: 'Choisir la salle',
    })
    expect(appelsDe(faux.de('reunion')[0])).toEqual([
      'insert({"ministere_id":"10000000-0000-4000-8000-000000000001","date":"2026-10-12","heure":"20:00","objet":null,"decision_attendue":"Choisir la salle"})',
    ])
  })

  it('un refus de la base est relancé', async () => {
    installer({ reunion: { data: null, error: new Error('refusé') } })
    await expect(
      enregistrerReunion('10000000-0000-4000-8000-000000000001', {
        date: '2026-10-12',
        heure: null,
        objet: null,
        decision: null,
      }),
    ).rejects.toThrow('refusé')
  })
})
