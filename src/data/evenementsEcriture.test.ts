import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import {
  ajouterEvenement,
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

describe('ajouterEvenement', () => {
  it('appelle ajouter_evenement avec ses quatre arguments, rend l’identifiant', async () => {
    const faux = installer({}, { data: '20000000-0000-4000-8000-000000000001', error: null })
    const id = await ajouterEvenement({
      date: '2026-10-10',
      titre: 'Soirée de louange',
      statut: 'attente_validation',
      mentions: ['10000000-0000-4000-8000-000000000002'],
    })
    expect(id).toBe('20000000-0000-4000-8000-000000000001')
    expect(faux.rpc).toHaveBeenCalledWith('ajouter_evenement', {
      p_titre: 'Soirée de louange',
      p_date: '2026-10-10',
      p_statut: 'attente_validation',
      p_mentions: ['10000000-0000-4000-8000-000000000002'],
    })
    // Jamais d'ajout direct dans `evenement` ni dans `evenement_mention`.
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: 'La date ne peut pas être passée.' }
    installer({}, { data: null, error: refus })
    await expect(
      ajouterEvenement({ date: '2026-10-01', titre: 'Essai', statut: 'brouillon', mentions: [] }),
    ).rejects.toBe(refus)
  })
})

describe('mettreAJourEvenement', () => {
  it('ajoute une ligne d’état, jamais une mise à jour', async () => {
    const faux = installer()
    await mettreAJourEvenement('20000000-0000-4000-8000-000000000001', {
      date: '2026-10-17',
      statut: 'valide',
    })
    expect(appelsDe(faux.de('evenement_etat')[0])).toEqual([
      'insert({"evenement_id":"20000000-0000-4000-8000-000000000001","date":"2026-10-17","statut":"valide"})',
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
  }
  const reunion = { date: '2026-10-12', heure: null, objet: null, decision: null }
  const MINISTERE = '10000000-0000-4000-8000-000000000001'

  it('ajouterEvenement : titre trop long, statut hors liste, mention qui n’est pas un uuid', async () => {
    const faux = installer()
    await expect(ajouterEvenement({ ...evenement, titre: 'a'.repeat(81) })).rejects.toThrow()
    await expect(
      ajouterEvenement({ ...evenement, statut: 'reporte' as unknown as 'brouillon' }),
    ).rejects.toThrow()
    await expect(ajouterEvenement({ ...evenement, mentions: ['pas-un-uuid'] })).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('mettreAJourEvenement : statut vide, date mal formée, identifiant qui n’est pas un uuid', async () => {
    const faux = installer()
    const id = '20000000-0000-4000-8000-000000000001'
    await expect(
      mettreAJourEvenement(id, { date: '2026-10-10', statut: '' as unknown as 'valide' }),
    ).rejects.toThrow()
    await expect(
      mettreAJourEvenement(id, { date: '10/10/2026', statut: 'valide' }),
    ).rejects.toThrow()
    await expect(
      mettreAJourEvenement('e-1', { date: '2026-10-10', statut: 'valide' }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
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
      'select("id, ministere_id, titre, date, statut, a_confirmer, reporte_du")',
      'eq("id", "20000000-0000-4000-8000-000000000001")',
      'maybeSingle()',
    ])
    installer({ v_evenement: { data: null, error: null } })
    expect(await lireEvenementAMettreAJour('20000000-0000-4000-8000-000000000002')).toBeNull()
  })

  it('mentions d’un événement', async () => {
    const faux = installer({
      evenement_mention: {
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
    expect(appelsDe(faux.de('evenement_mention')[0])).toEqual([
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
