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
    const faux = installer({}, { data: 'e-1', error: null })
    const id = await ajouterEvenement({
      date: '2026-10-10',
      titre: 'Soirée de louange',
      statut: 'attente_validation',
      mentions: ['m-coordination'],
    })
    expect(id).toBe('e-1')
    expect(faux.rpc).toHaveBeenCalledWith('ajouter_evenement', {
      p_titre: 'Soirée de louange',
      p_date: '2026-10-10',
      p_statut: 'attente_validation',
      p_mentions: ['m-coordination'],
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
    await mettreAJourEvenement('e-1', { date: '2026-10-17', statut: 'valide' })
    expect(appelsDe(faux.de('evenement_etat')[0])).toEqual([
      'insert({"evenement_id":"e-1","date":"2026-10-17","statut":"valide"})',
    ])
  })

  it('le refus d’une ligne identique est relancé tel quel', async () => {
    const refus = {
      code: 'P0001',
      message: "Rien n'a changé : ce statut et cette date sont déjà enregistrés.",
    }
    installer({ evenement_etat: { data: null, error: refus } })
    await expect(
      mettreAJourEvenement('e-1', { date: '2026-10-10', statut: 'preparation' }),
    ).rejects.toBe(refus)
  })
})

describe('lectures de la mise à jour', () => {
  it('dernier état d’un événement lisible, null sinon', async () => {
    const ligne = { id: 'e-1', ministere_id: 'm-communication', titre: 'Soirée de louange' }
    const faux = installer({ v_evenement: { data: ligne, error: null } })
    expect(await lireEvenementAMettreAJour('e-1')).toBe(ligne)
    expect(appelsDe(faux.de('v_evenement')[0])).toEqual([
      'select("id, ministere_id, titre, date, statut, a_confirmer, reporte_du")',
      'eq("id", "e-1")',
      'maybeSingle()',
    ])
    installer({ v_evenement: { data: null, error: null } })
    expect(await lireEvenementAMettreAJour('e-2')).toBeNull()
  })

  it('mentions d’un événement', async () => {
    const faux = installer({
      evenement_mention: {
        data: [{ evenement_id: 'e-1', ministere_id: 'm-coordination' }],
        error: null,
      },
    })
    expect(await lireMentionsEvenement('e-1')).toEqual([
      { evenement_id: 'e-1', ministere_id: 'm-coordination' },
    ])
    expect(appelsDe(faux.de('evenement_mention')[0])).toEqual([
      'select("evenement_id, ministere_id")',
      'eq("evenement_id", "e-1")',
    ])
  })

  it('une erreur de lecture est relancée', async () => {
    installer({ v_evenement: { data: null, error: new Error('refusé') } })
    await expect(lireEvenementAMettreAJour('e-1')).rejects.toThrow('refusé')
  })
})

describe('prochaine réunion', () => {
  it('lit la réunion déclarée du ministère', async () => {
    const faux = installer({ v_prochaine_reunion: { data: null, error: null } })
    expect(await lireProchaineReunion('m-communication')).toBeNull()
    expect(appelsDe(faux.de('v_prochaine_reunion')[0])).toEqual([
      'select("id, ministere_id, date, heure, objet, decision_attendue")',
      'eq("ministere_id", "m-communication")',
      'maybeSingle()',
    ])
  })

  it('ajoute une déclaration (jamais une mise à jour), décision dans decision_attendue', async () => {
    const faux = installer()
    await enregistrerReunion('m-communication', {
      date: '2026-10-12',
      heure: '20:00',
      objet: null,
      decision: 'Choisir la salle',
    })
    expect(appelsDe(faux.de('reunion')[0])).toEqual([
      'insert({"ministere_id":"m-communication","date":"2026-10-12","heure":"20:00","objet":null,"decision_attendue":"Choisir la salle"})',
    ])
  })

  it('un refus de la base est relancé', async () => {
    installer({ reunion: { data: null, error: new Error('refusé') } })
    await expect(
      enregistrerReunion('m-communication', {
        date: '2026-10-12',
        heure: null,
        objet: null,
        decision: null,
      }),
    ).rejects.toThrow('refusé')
  })
})
