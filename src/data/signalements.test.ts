import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import {
  cloreSignalement,
  confirmerSignalement,
  lireMesSignalements,
  lireMesSignalementsOuverts,
  lireSignalementsATraiter,
  lireSuiviDesSignalements,
  prendreEnCharge,
  repondreAEjpTech,
  repondreAuMinistere,
  signalerDifficulte,
} from './signalements'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COORDINATION = '10000000-0000-4000-8000-000000000003'
const SIGNALEMENT = '43000000-0000-4000-8000-000000000001'
const AUTRE = '43000000-0000-4000-8000-000000000002'
/** Numéro anti-doublon tiré par le formulaire (T76). */
const NUMERO = 'a1000000-0000-4000-8000-000000000001'
/** Les 11 colonnes d'avant T77, puis les 7 du suivi, dans l'ordre de la vue. */
const COLONNES =
  'id, ministere_id, ministere_nom, ecran, texte, saisi_le, suivi_id, commentaire, clos_le, ouvert, clos_recent, statut, derniere_etape, statut_le, jours_depuis, fin, reponse_possible_jusquau, compte_actif'

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
  it('« Mes signalements » : ceux du ministère, ouverts et clos récents, du plus ancien', async () => {
    const faux = installer()
    await lireMesSignalements(COORDINATION)
    const appels = appelsDe(faux.de('v_signalement')[0])
    expect(appels).toEqual([
      `select(${JSON.stringify(COLONNES)})`,
      `eq("ministere_id", "${COORDINATION}")`,
      'or("ouvert.is.true,clos_recent.is.true")',
      'order("saisi_le", {"ascending":true})',
    ])
    // Aucun filtre par date : `ouvert` et `clos_recent` viennent de la base (heure de Paris).
    expect(appels.slice(1).join(' ')).not.toMatch(/gte|lte|gt\(|lt\(|clos_le/)
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
    expect(appels.slice(1).join(' ')).not.toMatch(/gte|lte|gt\(|lt\(|clos_le/)
  })

  it('« Ma semaine » : les seuls ouverts du ministère, trois colonnes', async () => {
    const faux = installer()
    await lireMesSignalementsOuverts(COORDINATION)
    expect(appelsDe(faux.de('v_signalement')[0])).toEqual([
      'select("id, saisi_le, statut")',
      `eq("ministere_id", "${COORDINATION}")`,
      'eq("ouvert", true)',
      'order("saisi_le", {"ascending":true})',
    ])
  })

  it('une lecture refusée est relancée', async () => {
    const erreur = { code: 'PGRST301', message: 'refus' }
    installer({ v_signalement: { data: null, error: erreur } })
    await expect(lireSignalementsATraiter()).rejects.toBe(erreur)
  })
})

describe('lireSuiviDesSignalements', () => {
  it('les lignes des signalements lus, dans l’ordre réel (`ordre`), sans leur auteur', async () => {
    const faux = installer()
    await lireSuiviDesSignalements([SIGNALEMENT, AUTRE])
    expect(appelsDe(faux.de('signalement_suivi')[0])).toEqual([
      'select("id, signalement_id, etape, commentaire, saisi_le, ordre")',
      `in("signalement_id", ["${SIGNALEMENT}","${AUTRE}"])`,
      'order("ordre", {"ascending":true})',
    ])
  })

  it('aucun signalement : aucune lecture', async () => {
    const faux = installer()
    expect(await lireSuiviDesSignalements([])).toEqual([])
    expect(faux.from).not.toHaveBeenCalled()
  })
})

describe('signalerDifficulte', () => {
  it('appelle signaler_difficulte avec l’écran, le texte sans espaces autour et le numéro, rend l’identifiant', async () => {
    const faux = installer({}, { data: SIGNALEMENT, error: null })
    const id = await signalerDifficulte(
      {
        ecran: 'saisie_evenement',
        texte: '  Problème au niveau de la saisie des événement dans le calendrier  ',
      },
      NUMERO,
    )
    expect(id).toBe(SIGNALEMENT)
    expect(faux.rpc).toHaveBeenCalledWith('signaler_difficulte', {
      p_ecran: 'saisie_evenement',
      p_texte: 'Problème au niveau de la saisie des événement dans le calendrier',
      p_cle: NUMERO,
    })
    // Jamais d'ajout direct dans `signalement`.
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('un texte trop court est refusé avant tout appel', async () => {
    const faux = installer()
    await expect(signalerDifficulte({ ecran: 'autre', texte: 'court' }, NUMERO)).rejects.toThrow()
    await expect(
      signalerDifficulte({ ecran: 'autre', texte: 'Un texte assez long.' }, 'pas-un-numero'),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: "N'écrivez aucun nom ni information personnelle." }
    installer({}, { data: null, error: refus })
    await expect(
      signalerDifficulte({ ecran: 'autre', texte: 'Écrivez-moi à contact@exemple.test' }, NUMERO),
    ).rejects.toBe(refus)
  })
})

describe('gestes du suivi (T77) : une fonction de la base chacun, jamais un ajout direct', () => {
  it('« Prendre en charge » : prendre_en_charge_signalement', async () => {
    const faux = installer()
    await prendreEnCharge(SIGNALEMENT)
    expect(faux.rpc).toHaveBeenCalledWith('prendre_en_charge_signalement', {
      p_signalement_id: SIGNALEMENT,
    })
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('« Répondre au ministère » : la question d’EJP Tech du critère 3, rend la ligne', async () => {
    const LIGNE = 'd1000000-0000-4000-8000-000000000001'
    const faux = installer({}, { data: LIGNE, error: null })
    const texte =
      'Quel événement, à quelle date, et quel message s’affiche quand vous enregistrez ?'
    expect(await repondreAuMinistere({ signalementId: SIGNALEMENT, texte: ` ${texte} ` })).toBe(
      LIGNE,
    )
    expect(faux.rpc).toHaveBeenCalledWith('repondre_au_ministere', {
      p_signalement_id: SIGNALEMENT,
      p_reponse: texte,
    })
  })

  it('« Oui, c’est réglé » : confirmer_signalement', async () => {
    const faux = installer()
    await confirmerSignalement(SIGNALEMENT)
    expect(faux.rpc).toHaveBeenCalledWith('confirmer_signalement', {
      p_signalement_id: SIGNALEMENT,
    })
  })

  it('« Répondre à EJP Tech » : la réponse de Coordination du critère 5', async () => {
    const faux = installer()
    const texte = "L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche."
    await repondreAEjpTech({ signalementId: SIGNALEMENT, texte })
    expect(faux.rpc).toHaveBeenCalledWith('repondre_a_ejp_tech', {
      p_signalement_id: SIGNALEMENT,
      p_texte: texte,
    })
  })

  it('« Ce signalement est déjà clos. » relancé tel quel (critère 7)', async () => {
    const refus = { code: 'P0001', message: 'Ce signalement est déjà clos.' }
    installer({}, { data: null, error: refus })
    await expect(confirmerSignalement(SIGNALEMENT)).rejects.toBe(refus)
    await expect(prendreEnCharge(SIGNALEMENT)).rejects.toBe(refus)
  })

  it('un identifiant invalide ou une réponse trop courte : refusés avant tout appel', async () => {
    const faux = installer()
    await expect(prendreEnCharge('x')).rejects.toThrow()
    await expect(confirmerSignalement('x')).rejects.toThrow()
    await expect(repondreAEjpTech({ signalementId: SIGNALEMENT, texte: 'court' })).rejects.toThrow()
    await expect(
      repondreAuMinistere({ signalementId: SIGNALEMENT, texte: 'a'.repeat(281) }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })
})

describe('cloreSignalement', () => {
  it('la réponse au ministère, obligatoire à l’écran (critère 15)', async () => {
    const faux = installer()
    await cloreSignalement({
      signalementId: SIGNALEMENT,
      commentaire: 'Transmis à l’administration de l’église.',
    })
    expect(faux.rpc).toHaveBeenCalledWith('clore_signalement', {
      p_signalement_id: SIGNALEMENT,
      p_commentaire: 'Transmis à l’administration de l’église.',
    })
  })

  it('sans réponse : refusé avant tout appel', async () => {
    const faux = installer()
    await expect(
      cloreSignalement({ signalementId: SIGNALEMENT, commentaire: '' }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('« Ce signalement est déjà clos. » relancé tel quel', async () => {
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
    await expect(
      cloreSignalement({ signalementId: 'x', commentaire: 'Transmis à l’équipe.' }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })
})
