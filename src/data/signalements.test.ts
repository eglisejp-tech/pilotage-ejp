import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import {
  cloreSignalement,
  lireMesSignalements,
  lireSignalementsATraiter,
  signalerDifficulte,
} from './signalements'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const SIGNALEMENT = '43000000-0000-4000-8000-000000000001'
const COLONNES =
  'id, ministere_id, ministere_nom, ecran, texte, saisi_le, suivi_id, commentaire, clos_le, ouvert, clos_recent'

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

describe('lectures de v_signalement', () => {
  it('« Vos derniers signalements » : ceux du ministère, du plus récent, trois au plus', async () => {
    const faux = installer()
    await lireMesSignalements(COMMUNICATION, 3)
    expect(appelsDe(faux.de('v_signalement')[0])).toEqual([
      `select(${JSON.stringify(COLONNES)})`,
      `eq("ministere_id", "${COMMUNICATION}")`,
      'order("saisi_le", {"ascending":false})',
      'limit(3)',
    ])
  })

  it('bloc d’EJP Tech : ouverts et clos récents par les colonnes de la base, jamais une date', async () => {
    const faux = installer()
    await lireSignalementsATraiter()
    const appels = appelsDe(faux.de('v_signalement')[0])
    expect(appels).toEqual([
      `select(${JSON.stringify(COLONNES)})`,
      'or("ouvert.is.true,clos_recent.is.true")',
      'order("saisi_le", {"ascending":true})',
    ])
    // Aucun filtre par date : `ouvert` et `clos_recent` viennent de la base (heure de Paris).
    expect(appels.slice(1).join(' ')).not.toMatch(/gte|lte|gt\(|lt\(|clos_le/)
  })

  it('une lecture refusée est relancée', async () => {
    const erreur = { code: 'PGRST301', message: 'refus' }
    installer({ v_signalement: { data: null, error: erreur } })
    await expect(lireSignalementsATraiter()).rejects.toBe(erreur)
  })
})

describe('signalerDifficulte', () => {
  it('appelle signaler_difficulte avec l’écran et le texte sans espaces autour, rend l’identifiant', async () => {
    const faux = installer({}, { data: SIGNALEMENT, error: null })
    const id = await signalerDifficulte({
      ecran: 'saisie_evenement',
      texte: '  Je ne peux pas choisir la date.  ',
    })
    expect(id).toBe(SIGNALEMENT)
    expect(faux.rpc).toHaveBeenCalledWith('signaler_difficulte', {
      p_ecran: 'saisie_evenement',
      p_texte: 'Je ne peux pas choisir la date.',
    })
    // Jamais d'ajout direct dans `signalement`.
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('un texte trop court est refusé avant tout appel', async () => {
    const faux = installer()
    await expect(signalerDifficulte({ ecran: 'autre', texte: 'court' })).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: "N'écrivez aucun nom ni information personnelle." }
    installer({}, { data: null, error: refus })
    await expect(
      signalerDifficulte({ ecran: 'autre', texte: 'Écrivez-moi à contact@exemple.test' }),
    ).rejects.toBe(refus)
  })
})

describe('cloreSignalement', () => {
  it('sans commentaire : p_commentaire null', async () => {
    const faux = installer()
    await cloreSignalement({ signalementId: SIGNALEMENT, commentaire: null })
    expect(faux.rpc).toHaveBeenCalledWith('clore_signalement', {
      p_signalement_id: SIGNALEMENT,
      p_commentaire: null,
    })
  })

  it('avec commentaire ; « Ce signalement est déjà clos. » relancé tel quel', async () => {
    const refus = { code: 'P0001', message: 'Ce signalement est déjà clos.' }
    const faux = installer({}, { data: null, error: refus })
    await expect(
      cloreSignalement({ signalementId: SIGNALEMENT, commentaire: 'Transmis à l’équipe.' }),
    ).rejects.toBe(refus)
    expect(faux.rpc).toHaveBeenCalledWith('clore_signalement', {
      p_signalement_id: SIGNALEMENT,
      p_commentaire: 'Transmis à l’équipe.',
    })
  })

  it('un identifiant invalide est refusé avant tout appel', async () => {
    const faux = installer()
    await expect(cloreSignalement({ signalementId: 'x', commentaire: null })).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })
})
