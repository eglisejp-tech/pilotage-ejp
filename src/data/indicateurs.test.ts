import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  lireAValider,
  lireCalculs,
  lireCatalogue,
  lireCommunsFiche,
  lireIndicateursDuMinistere,
  lireLimitesIndicateurs,
  lireMesuresPeriode,
  lireSeries,
  lireSuggestions,
  lireSuiviIndicateurs,
  lireTermes,
  lireUsageIndicateurs,
  verifierLibelle,
} from './indicateurs'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

beforeEach(() => {
  courant.client = undefined
})

/** Faux client : les lectures du faux de `fauxRequete`, plus `rpc` pour les fonctions de la base. */
function client(
  reponses: Parameters<typeof fauxRequete>[0],
  rpc: (nom: string, args: unknown) => { data: unknown; error: unknown } = () => ({
    data: [],
    error: null,
  }),
) {
  const faux = fauxRequete(reponses)
  const appelsRpc: { nom: string; args: unknown }[] = []
  courant.client = {
    from: faux.from,
    rpc: (nom: string, args: unknown) => {
      appelsRpc.push({ nom, args })
      return Promise.resolve(rpc(nom, args))
    },
  }
  return { faux, appelsRpc }
}

describe('lireIndicateursDuMinistere', () => {
  it('lit la table indicateur du ministère, avec les colonnes d’un formulaire de saisie', async () => {
    const { faux } = client({ indicateur: { data: [{ id: 'i1' }], error: null } })
    expect(await lireIndicateursDuMinistere('com')).toEqual([{ id: 'i1' }])
    const appels = appelsDe(faux.de('indicateur')[0])
    expect(appels[0]).toContain('select("id, code, libelle, definition, nature, unite, sensible')
    expect(appels[0]).toContain('saisi_dimanche_matin')
    expect(appels[0]).toContain('retrait_motif')
    expect(appels[1]).toBe('eq("ministere_id", "com")')
  })
})

describe('lireTermes', () => {
  it('lit les termes des calculs donnés, dans l’ordre de chaque calcul', async () => {
    const { faux } = client({ indicateur_terme: { data: [{ calcul_id: 'c1' }], error: null } })
    expect(await lireTermes(['c1', 'c2'])).toEqual([{ calcul_id: 'c1' }])
    expect(appelsDe(faux.de('indicateur_terme')[0])).toEqual([
      'select("calcul_id, ordre, role, source_id, comptage, agregat, decalage")',
      'in("calcul_id", ["c1","c2"])',
      'order("calcul_id", {"ascending":true})',
      'order("ordre", {"ascending":true})',
    ])
  })

  it('sans calcul, ne fait aucune requête', async () => {
    const { faux } = client({})
    expect(await lireTermes([])).toEqual([])
    expect(faux.from).not.toHaveBeenCalled()
  })
})

describe('lireSuiviIndicateurs', () => {
  it('d’un ministère : v_indicateur_suivi filtrée sur ce ministère', async () => {
    const { faux } = client({
      v_indicateur_suivi: { data: [{ indicateur_id: 'i1' }], error: null },
    })
    expect(await lireSuiviIndicateurs('com')).toEqual([{ indicateur_id: 'i1' }])
    const appels = appelsDe(faux.de('v_indicateur_suivi')[0])
    expect(appels[0]).toContain('select("indicateur_id, ministere_id, libelle, definition, nature')
    expect(appels[0]).toContain('somme_nb_saisies, somme_nb_attendues')
    expect(appels[0]).toContain('etat_valeur, attente_jours, retire_le')
    expect(appels[1]).toBe('eq("ministere_id", "com")')
  })

  it('sans ministère : toutes les lignes lisibles, sans filtre', async () => {
    const { faux } = client({ v_indicateur_suivi: { data: [], error: null } })
    await lireSuiviIndicateurs()
    expect(appelsDe(faux.de('v_indicateur_suivi')[0])).toHaveLength(1)
  })
})

describe('lireCalculs', () => {
  it('lit v_calcul du ministère, raison du « Non calculé » comprise', async () => {
    const { faux } = client({ v_calcul: { data: [{ indicateur_id: 'c1' }], error: null } })
    expect(await lireCalculs('com')).toEqual([{ indicateur_id: 'c1' }])
    const appels = appelsDe(faux.de('v_calcul')[0])
    expect(appels[0]).toContain('non_calcule_raison, non_calcule_source_id')
    expect(appels[1]).toBe('eq("ministere_id", "com")')
  })
})

describe('lireSeries', () => {
  it('lit les périodes des indicateurs donnés, du plus ancien au plus récent', async () => {
    const { faux } = client({ v_indicateur_serie: { data: [], error: null } })
    await lireSeries(['i1', 'i2'])
    expect(appelsDe(faux.de('v_indicateur_serie')[0])).toEqual([
      'select("indicateur_id, ministere_id, periode, rang, valeur, moins_de_3, complete")',
      'in("indicateur_id", ["i1","i2"])',
      'order("indicateur_id", {"ascending":true})',
      'order("rang", {"ascending":true})',
    ])
  })

  it('sans indicateur, ne fait aucune requête', async () => {
    const { faux } = client({})
    expect(await lireSeries([])).toEqual([])
    expect(faux.from).not.toHaveBeenCalled()
  })
})

describe('lireMesuresPeriode', () => {
  it('toutes les périodes d’un rythme pour un ministère', async () => {
    const { faux } = client({ v_mesure_periode: { data: [], error: null } })
    await lireMesuresPeriode('com', 'mois')
    expect(appelsDe(faux.de('v_mesure_periode')[0])).toEqual([
      'select("indicateur_id, ministere_id, nature, periode, valeur, moins_de_3, saisi_le")',
      'eq("ministere_id", "com")',
      'eq("nature", "mois")',
    ])
  })

  it('une seule période : le dimanche ou le 1er du mois', async () => {
    const { faux } = client({ v_mesure_periode: { data: [], error: null } })
    await lireMesuresPeriode('com', 'dimanche', '2026-09-27')
    expect(appelsDe(faux.de('v_mesure_periode')[0]).at(-1)).toBe('eq("periode", "2026-09-27")')
  })
})

describe('autres lectures', () => {
  it('lireCommunsFiche : v_commun_fiche du ministère, par ordre', async () => {
    const { faux } = client({ v_commun_fiche: { data: [{ commun_code: 'service' }], error: null } })
    expect(await lireCommunsFiche('com')).toEqual([{ commun_code: 'service' }])
    expect(appelsDe(faux.de('v_commun_fiche')[0])).toEqual([
      'select("ministere_id, commun_code, libelle, ordre, reference_eglise")',
      'eq("ministere_id", "com")',
      'order("ordre", {"ascending":true})',
    ])
  })

  it('lireSuggestions : v_suggestions du ministère', async () => {
    const { faux } = client({ v_suggestions: { data: [], error: null } })
    await lireSuggestions('com')
    expect(appelsDe(faux.de('v_suggestions')[0])).toEqual([
      'select("ministere_id, code, libelle, definition, nature, unite")',
      'eq("ministere_id", "com")',
    ])
  })

  it('lireCatalogue : v_catalogue par ordre', async () => {
    const { faux } = client({ v_catalogue: { data: [], error: null } })
    await lireCatalogue()
    expect(appelsDe(faux.de('v_catalogue')[0])).toEqual([
      'select("code, modele, libelle, definition, nature, unite, sensible, calcul, ordre")',
      'order("ordre", {"ascending":true})',
    ])
  })

  it('lireUsageIndicateurs : v_usage_indicateurs, jamais une valeur', async () => {
    const { faux } = client({ v_usage_indicateurs: { data: [], error: null } })
    await lireUsageIndicateurs()
    const appels = appelsDe(faux.de('v_usage_indicateurs')[0])
    expect(appels).toHaveLength(1)
    expect(appels[0]).not.toContain('valeur')
  })

  it('lireAValider : v_a_valider, la plus ancienne demande d’abord', async () => {
    const { faux } = client({ v_a_valider: { data: [], error: null } })
    await lireAValider()
    const appels = appelsDe(faux.de('v_a_valider')[0])
    expect(appels[0]).toContain('demande_id, objet, indicateur_id, ministere_id, ministere_nom')
    expect(appels[1]).toBe('order("saisi_le", {"ascending":true})')
  })
})

describe('fonctions de la base', () => {
  it('lireLimitesIndicateurs : appelle limites_indicateurs et rend la première ligne', async () => {
    const ligne = { ajouts: 1, ajouts_max: 3, lignes: 12, lignes_max: 30 }
    const { appelsRpc } = client({}, () => ({ data: [ligne], error: null }))
    expect(await lireLimitesIndicateurs('com')).toEqual(ligne)
    expect(appelsRpc).toEqual([{ nom: 'limites_indicateurs', args: { p_ministere_id: 'com' } }])
  })

  it('lireLimitesIndicateurs : aucune ligne donne null', async () => {
    client({}, () => ({ data: [], error: null }))
    expect(await lireLimitesIndicateurs('com')).toBeNull()
  })

  it('verifierLibelle : appelle verifier_libelle avec le libellé, le rythme et le ministère', async () => {
    const verification = {
      famille: 'periode',
      message: 'Inutile d’écrire la période.',
      bloquant: false,
    }
    const { appelsRpc } = client({}, () => ({ data: [verification], error: null }))
    expect(await verifierLibelle('Publications du mois', 'mois', 'com')).toEqual([verification])
    expect(appelsRpc).toEqual([
      {
        nom: 'verifier_libelle',
        args: { p_libelle: 'Publications du mois', p_nature: 'mois', p_ministere_id: 'com' },
      },
    ])
  })
})

describe('erreurs de la base', () => {
  it('chaque lecture relance l’erreur reçue', async () => {
    const erreur = { data: null, error: new Error('refusé') }
    client(
      {
        indicateur: erreur,
        indicateur_terme: erreur,
        v_indicateur_suivi: erreur,
        v_calcul: erreur,
        v_indicateur_serie: erreur,
        v_mesure_periode: erreur,
        v_commun_fiche: erreur,
        v_suggestions: erreur,
        v_catalogue: erreur,
        v_usage_indicateurs: erreur,
        v_a_valider: erreur,
      },
      () => ({ data: null, error: new Error('refusé') }),
    )
    const lectures = [
      () => lireIndicateursDuMinistere('com'),
      () => lireTermes(['c1']),
      () => lireSuiviIndicateurs('com'),
      () => lireCalculs('com'),
      () => lireSeries(['i1']),
      () => lireMesuresPeriode('com', 'mois'),
      () => lireCommunsFiche('com'),
      () => lireSuggestions('com'),
      () => lireCatalogue(),
      () => lireUsageIndicateurs(),
      () => lireAValider(),
      () => lireLimitesIndicateurs('com'),
      () => verifierLibelle('x', 'mois', 'com'),
    ]
    for (const lire of lectures) await expect(lire()).rejects.toThrow('refusé')
  })
})
