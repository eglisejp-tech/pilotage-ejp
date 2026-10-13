import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  declarerIntervenant,
  effacerPrenom,
  effacerPrenomsAnciens,
  lireConnexions,
  lireMaDeclaration,
  lirePrenomsDuJournal,
  noterPassage,
  TAILLE_PAGE_CONNEXIONS,
} from '@/data/personnes'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

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

describe('lireMaDeclaration (T56)', () => {
  it('lit la déclaration de la session, et si elle est du jour de Paris (T63)', async () => {
    const faux = installer({
      v_ma_declaration: { data: { id: 3, prenom: 'Marie D.', du_jour: false }, error: null },
    })
    expect(await lireMaDeclaration()).toEqual({ id: 3, prenom: 'Marie D.', duJour: false })
    expect(appelsDe(faux.de('v_ma_declaration')[0])).toEqual([
      'select("id, prenom, du_jour")',
      'maybeSingle()',
    ])
  })

  it('aucune déclaration : null ; une erreur remonte', async () => {
    installer({ v_ma_declaration: { data: null, error: null } })
    expect(await lireMaDeclaration()).toBeNull()
    installer({ v_ma_declaration: { data: null, error: new Error('refus') } })
    await expect(lireMaDeclaration()).rejects.toThrow('refus')
  })
})

describe('declarerIntervenant', () => {
  it('envoie le prénom nettoyé et le motif', async () => {
    const faux = installer()
    await declarerIntervenant('  Marie   D. ', 'changement')
    expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
      p_prenom: 'Marie D.',
      p_motif: 'changement',
    })
  })

  it('refuse un prénom invalide avant tout appel', async () => {
    const faux = installer()
    await expect(declarerIntervenant('marie@exemple.test', 'connexion')).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })
})

describe('noterPassage', () => {
  it('ajoute le jour d’utilisation, une seconde fois ignorée', async () => {
    const faux = installer()
    await noterPassage(3)
    expect(appelsDe(faux.de('passage')[0])).toEqual([
      'upsert({"intervenant_id":3}, {"onConflict":"intervenant_id,jour","ignoreDuplicates":true})',
    ])
  })
})

describe('lireConnexions', () => {
  it('lit les connexions de la plus récente à la plus ancienne, une de plus que la page', async () => {
    const lignes = Array.from({ length: TAILLE_PAGE_CONNEXIONS + 1 }, (_, rang) => ({
      id: 100 - rang,
      compte: 'c1',
      prenom: 'Marie',
      declare_le: '2026-10-11T09:00:00+00:00',
    }))
    const faux = installer({ intervenant: { data: lignes, error: null } })
    const page = await lireConnexions(null)
    expect(page.connexions).toHaveLength(TAILLE_PAGE_CONNEXIONS)
    expect(page.suivant).toBe(100 - TAILLE_PAGE_CONNEXIONS + 1)
    expect(appelsDe(faux.de('intervenant')[0])).toEqual([
      'select("id, compte, prenom, declare_le")',
      'eq("motif", "connexion")',
      'order("id", {"ascending":false})',
      `limit(${TAILLE_PAGE_CONNEXIONS + 1})`,
    ])
  })

  it('reprend après le curseur ; la dernière page n’a pas de suite', async () => {
    const faux = installer({ intervenant: { data: [], error: null } })
    expect(await lireConnexions(42)).toEqual({ connexions: [], suivant: null })
    expect(appelsDe(faux.de('intervenant')[0])).toContain('lt("id", 42)')
  })
})

describe('effacement', () => {
  it('effacerPrenom et effacerPrenomsAnciens rendent le nombre de déclarations effacées', async () => {
    const faux = installer({}, { data: 2, error: null })
    expect(await effacerPrenom(5)).toBe(2)
    expect(faux.rpc).toHaveBeenCalledWith('effacer_prenom', { p_intervenant: 5 })
    expect(await effacerPrenomsAnciens()).toBe(2)
    expect(faux.rpc).toHaveBeenCalledWith('effacer_prenoms_anciens', {})
  })
})

describe('lirePrenomsDuJournal', () => {
  it('lit les prénoms des lignes demandées, null pour une personne non déclarée', async () => {
    const faux = installer({
      v_journal_intervenant: {
        data: [
          { journal_id: 1, prenom: 'Marie' },
          { journal_id: 2, prenom: null },
        ],
        error: null,
      },
    })
    const prenoms = await lirePrenomsDuJournal([1, 2, 3])
    expect(prenoms.get(1)).toBe('Marie')
    expect(prenoms.get(2)).toBeNull()
    expect(prenoms.has(3)).toBe(false)
    expect(appelsDe(faux.de('v_journal_intervenant')[0])).toEqual([
      'select("journal_id, prenom")',
      'in("journal_id", [1,2,3])',
    ])
  })

  it('sans ligne : aucune requête', async () => {
    const faux = installer()
    expect((await lirePrenomsDuJournal([])).size).toBe(0)
    expect(faux.de('v_journal_intervenant')).toHaveLength(0)
  })
})
