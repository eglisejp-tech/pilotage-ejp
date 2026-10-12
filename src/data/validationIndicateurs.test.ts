import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import {
  ajouterSuggestion,
  lireAttentesAdministration,
  lireDecisionsRecentes,
  lireMesIndicateurs,
  lireMesRefus,
  validerIndicateur,
} from './validationIndicateurs'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const KUMI = '10000000-0000-4000-8000-000000000011'
const INDICATEUR = '00000000-0000-4000-8000-0000000000b1'
const DEMANDE = '00000000-0000-4000-8000-0000000000a1'

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

describe('ajouterSuggestion', () => {
  it('appelle ajouter_suggestion avec le ministère, le code et le « Pourquoi » sans espaces autour', async () => {
    const faux = installer({}, { data: INDICATEUR, error: null })
    const id = await ajouterSuggestion({
      ministereId: COMMUNICATION,
      code: 'suggestion_demandes_recues',
      pourquoi: '  Voir les demandes de chaque mois.  ',
    })
    expect(id).toBe(INDICATEUR)
    expect(faux.rpc).toHaveBeenCalledWith('ajouter_suggestion', {
      p_ministere_id: COMMUNICATION,
      p_code: 'suggestion_demandes_recues',
      p_pourquoi: 'Voir les demandes de chaque mois.',
    })
    // Jamais d'ajout direct dans `indicateur` ni dans `demande_indicateur`.
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('un « Pourquoi » trop court ou trop long ne part jamais à la base', async () => {
    const faux = installer()
    await expect(
      ajouterSuggestion({ ministereId: COMMUNICATION, code: 'suggestion_x', pourquoi: 'court' }),
    ).rejects.toThrow()
    await expect(
      ajouterSuggestion({
        ministereId: COMMUNICATION,
        code: 'suggestion_x',
        pourquoi: 'a'.repeat(281),
      }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: 'Votre ministère a déjà 3 indicateurs à lui.' }
    installer({}, { data: null, error: refus })
    await expect(
      ajouterSuggestion({
        ministereId: COMMUNICATION,
        code: 'suggestion_x',
        pourquoi: 'Voir les demandes de chaque mois.',
      }),
    ).rejects.toBe(refus)
  })
})

describe('validerIndicateur', () => {
  it('valider : ni motif ni fenêtre, la demande seule', async () => {
    const faux = installer()
    await validerIndicateur({ demandeId: DEMANDE, decision: 'valide' })
    expect(faux.rpc).toHaveBeenCalledWith('valider_indicateur', {
      p_demande_id: DEMANDE,
      p_decision: 'valide',
      p_motif: null,
    })
  })

  it('refuser : le motif sans espaces autour', async () => {
    const faux = installer()
    await validerIndicateur({
      demandeId: DEMANDE,
      decision: 'refuse',
      motif: '  Ce chiffre existe déjà sur la fiche.  ',
    })
    expect(faux.rpc).toHaveBeenCalledWith('valider_indicateur', {
      p_demande_id: DEMANDE,
      p_decision: 'refuse',
      p_motif: 'Ce chiffre existe déjà sur la fiche.',
    })
  })

  it('un refus sans motif valide ne part jamais à la base', async () => {
    const faux = installer()
    await expect(
      validerIndicateur({ demandeId: DEMANDE, decision: 'refuse', motif: 'court' }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('« Cette demande a déjà été décidée. » est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: 'Cette demande a déjà été décidée.' }
    installer({}, { data: null, error: refus })
    await expect(validerIndicateur({ demandeId: DEMANDE, decision: 'valide' })).rejects.toBe(refus)
  })
})

describe('lectures de l’administration de l’église', () => {
  const attente = {
    id: INDICATEUR,
    libelle: 'Demandes reçues',
    definition: 'Demandes reçues par le ministère dans le mois, sans nom ni objet.',
    nature: 'mois',
    ministere_id: KUMI,
    cree_le: '2026-10-01T10:00:00+02:00',
    etat: 'en_attente',
  }

  it('lit les définitions à valider, les noms et les jours d’attente, jamais un « Pourquoi »', async () => {
    const faux = installer({
      indicateur: { data: [attente], error: null },
      ministere: { data: [{ id: KUMI, nom: 'Kumi' }], error: null },
      v_usage_indicateurs: {
        data: [{ indicateur_id: INDICATEUR, attente_jours: 9 }],
        error: null,
      },
    })
    const lignes = await lireAttentesAdministration()
    expect(lignes).toEqual([
      {
        indicateur_id: INDICATEUR,
        ministere_id: KUMI,
        ministere_nom: 'Kumi',
        libelle: 'Demandes reçues',
        definition: 'Demandes reçues par le ministère dans le mois, sans nom ni objet.',
        nature: 'mois',
        cree_le: '2026-10-01T10:00:00+02:00',
        attente_jours: 9,
      },
    ])
    expect(appelsDe(faux.de('indicateur')[0])).toEqual([
      'select("id, libelle, definition, nature, ministere_id, cree_le, etat")',
      'eq("etat", "en_attente")',
      'order("cree_le", {"ascending":true})',
    ])
    // La RLS de `demande_indicateur` ne lui ouvre rien : l'administration ne la lit jamais.
    const tables = faux.from.mock.calls.map(([table]) => table)
    expect(tables).not.toContain('demande_indicateur')
    expect(tables).not.toContain('v_a_valider')
    expect(tables).not.toContain('validation')
    expect(tables).not.toContain('mesure')
  })

  it('ne garde que les ajouts qui attendent, même si la réponse en rend d’autres', async () => {
    installer({
      indicateur: {
        data: [attente, { ...attente, id: 'autre', etat: 'actif' }],
        error: null,
      },
      ministere: { data: [{ id: KUMI, nom: 'Kumi' }], error: null },
      v_usage_indicateurs: { data: [], error: null },
    })
    const lignes = await lireAttentesAdministration()
    expect(lignes.map((ligne) => ligne.indicateur_id)).toEqual([INDICATEUR])
    expect(lignes[0]?.attente_jours).toBeNull()
  })

  it('rien n’attend : une seule lecture, aucune autre', async () => {
    const faux = installer({ indicateur: { data: [], error: null } })
    expect(await lireAttentesAdministration()).toEqual([])
    expect(faux.from).toHaveBeenCalledTimes(1)
  })

  it('une lecture refusée est relancée', async () => {
    const erreur = { code: 'PGRST301', message: 'refus' }
    installer({ indicateur: { data: null, error: erreur } })
    await expect(lireAttentesAdministration()).rejects.toBe(erreur)
  })
})

describe('décisions des 30 derniers jours (EJP Tech)', () => {
  it('part du jour de Paris de v_semaine, jamais de la date du navigateur', async () => {
    const faux = installer({
      v_semaine: { data: { aujourdhui: '2026-10-12' }, error: null },
      validation: {
        data: [
          {
            id: 'v1',
            demande_id: DEMANDE,
            ministere_id: KUMI,
            decision: 'refuse',
            motif: 'Ce chiffre existe déjà sur la fiche.',
            saisi_le: '2026-10-08T11:00:00+02:00',
          },
        ],
        error: null,
      },
      demande_indicateur: { data: [{ id: DEMANDE, libelle: 'Demandes reçues' }], error: null },
      ministere: { data: [{ id: KUMI, nom: 'Kumi' }], error: null },
    })
    const decisions = await lireDecisionsRecentes()
    expect(decisions).toEqual([
      {
        validation_id: 'v1',
        ministere_nom: 'Kumi',
        libelle: 'Demandes reçues',
        decision: 'refuse',
        motif: 'Ce chiffre existe déjà sur la fiche.',
        saisi_le: '2026-10-08T11:00:00+02:00',
      },
    ])
    const appels = appelsDe(faux.de('validation')[0])
    expect(appels[1]).toBe('gte("saisi_le", "2026-09-12")')
  })

  it('sans décision : aucune autre lecture', async () => {
    const faux = installer({
      v_semaine: { data: { aujourdhui: '2026-10-12' }, error: null },
      validation: { data: [], error: null },
    })
    expect(await lireDecisionsRecentes()).toEqual([])
    expect(faux.de('demande_indicateur')).toHaveLength(0)
  })

  it('sans jour de Paris, la lecture échoue : aucune date inventée', async () => {
    installer({ v_semaine: { data: null, error: null } })
    await expect(lireDecisionsRecentes()).rejects.toThrow()
  })
})

describe('lectures du ministère', () => {
  it('« Mes indicateurs » : les définitions de la fiche, jamais une valeur', async () => {
    const faux = installer()
    await lireMesIndicateurs(COMMUNICATION)
    expect(appelsDe(faux.de('indicateur')[0])).toEqual([
      'select("id, libelle, definition, nature, calcul, etat, origine, modele_code, cree_le, retire_le, retrait_motif")',
      `eq("ministere_id", "${COMMUNICATION}")`,
    ])
    expect(faux.de('mesure')).toHaveLength(0)
  })

  it('les refus : le motif écrit par EJP Tech, relié à l’indicateur par la demande', async () => {
    const faux = installer({
      validation: {
        data: [
          {
            demande_id: DEMANDE,
            decision: 'refuse',
            motif: 'Ce chiffre existe déjà sur la fiche.',
            saisi_le: '2026-10-05T16:45:00+02:00',
          },
          {
            demande_id: 'autre',
            decision: 'valide',
            motif: null,
            saisi_le: '2026-10-06T10:00:00Z',
          },
        ],
        error: null,
      },
      demande_indicateur: {
        data: [
          { id: DEMANDE, indicateur_id: INDICATEUR },
          { id: 'autre', indicateur_id: 'deux' },
        ],
        error: null,
      },
    })
    const refus = await lireMesRefus(COMMUNICATION)
    expect(refus).toEqual([
      {
        indicateur_id: INDICATEUR,
        saisi_le: '2026-10-05T16:45:00+02:00',
        motif: 'Ce chiffre existe déjà sur la fiche.',
      },
    ])
    expect(appelsDe(faux.de('validation')[0])).toEqual([
      'select("demande_id, decision, motif, saisi_le")',
      `eq("ministere_id", "${COMMUNICATION}")`,
      'eq("decision", "refuse")',
    ])
  })
})
