import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import { lireDemandesEnAttente, lireTextesARelire, marquerRelu, masquerTexte } from './moderation'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const POINT = '43000000-0000-4000-8000-000000000001'
const COLONNES =
  'cible, cible_id, ministere_id, auteur_libelle, ecrit_le, champs, etat, decision_le, motif, indicateur_libelle, mois'

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

describe('lectures de la modération', () => {
  it('la file : v_textes_a_relire, ses onze colonnes, aucun filtre de date ni de valeur', async () => {
    const faux = installer()
    await lireTextesARelire()
    const appels = appelsDe(faux.de('v_textes_a_relire')[0])
    expect(appels).toEqual([`select(${JSON.stringify(COLONNES)})`])
    // Les 30 derniers jours viennent de la base (heure de Paris) ; la file n'a pas de colonne de valeur.
    expect(COLONNES).not.toMatch(/valeur|total|repartition/)
  })

  it('l’en-tête : les demandes qui attendent, par indicateur et jours d’attente, sans aucun texte', async () => {
    const faux = installer()
    await lireDemandesEnAttente()
    expect(appelsDe(faux.de('v_a_valider')[0])).toEqual(['select("indicateur_id, attente_jours")'])
  })

  it('une lecture refusée est relancée', async () => {
    const erreur = { code: 'PGRST301', message: 'refus' }
    installer({ v_textes_a_relire: { data: null, error: erreur } })
    await expect(lireTextesARelire()).rejects.toBe(erreur)
  })
})

describe('marquerRelu', () => {
  it('appelle marquer_relu avec la cible et son identifiant', async () => {
    const faux = installer()
    await marquerRelu({ cible: 'point_attention', cibleId: POINT })
    expect(faux.rpc).toHaveBeenCalledWith('marquer_relu', {
      p_cible: 'point_attention',
      p_cible_id: POINT,
    })
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('une cible inconnue ou un identifiant invalide est refusé avant tout appel', async () => {
    const faux = installer()
    await expect(
      marquerRelu({ cible: 'compte' as 'point_attention', cibleId: POINT }),
    ).rejects.toThrow()
    await expect(marquerRelu({ cible: 'point_attention', cibleId: 'pas-un-id' })).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const erreur = { code: 'P0001', message: 'Ce texte a déjà été relu.' }
    installer({}, { data: null, error: erreur })
    await expect(marquerRelu({ cible: 'reunion', cibleId: POINT })).rejects.toBe(erreur)
  })
})

describe('masquerTexte', () => {
  it('appelle masquer_texte avec la cible, le champ et le motif', async () => {
    const faux = installer()
    await masquerTexte({
      cible: 'point_attention',
      cibleId: POINT,
      champ: 'description',
      motif: 'nom_personne',
    })
    expect(faux.rpc).toHaveBeenCalledWith('masquer_texte', {
      p_cible: 'point_attention',
      p_cible_id: POINT,
      p_champ: 'description',
      p_motif: 'nom_personne',
    })
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('les deux textes d’un signalement passent par la même fonction', async () => {
    const faux = installer()
    await masquerTexte({ cible: 'signalement', cibleId: POINT, champ: 'texte', motif: 'autre' })
    await masquerTexte({
      cible: 'signalement_suivi',
      cibleId: POINT,
      champ: 'commentaire',
      motif: 'coordonnees',
    })
    expect(faux.rpc).toHaveBeenNthCalledWith(1, 'masquer_texte', {
      p_cible: 'signalement',
      p_cible_id: POINT,
      p_champ: 'texte',
      p_motif: 'autre',
    })
    expect(faux.rpc).toHaveBeenNthCalledWith(2, 'masquer_texte', {
      p_cible: 'signalement_suivi',
      p_cible_id: POINT,
      p_champ: 'commentaire',
      p_motif: 'coordonnees',
    })
  })

  it('un motif hors de la liste est refusé avant tout appel', async () => {
    const faux = installer()
    await expect(
      masquerTexte({
        cible: 'evenement',
        cibleId: POINT,
        champ: 'titre',
        motif: 'gene' as 'autre',
      }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const erreur = { code: 'P0001', message: 'Texte introuvable, vide ou déjà masqué.' }
    installer({}, { data: null, error: erreur })
    await expect(
      masquerTexte({ cible: 'evenement', cibleId: POINT, champ: 'titre', motif: 'autre' }),
    ).rejects.toBe(erreur)
  })
})
