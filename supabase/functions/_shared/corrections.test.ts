// @vitest-environment node
// Tests unitaires (npm test) de corriger-adresse et supprimer-ministere (décision T74) : ordre des
// étapes et chemins d'échec, avec un faux client de la clé secrète qui note chaque appel. Les
// essais contre la pile locale sont dans tests/fonctions/comptes.test.ts.
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { corrigerAdresse } from '../corriger-adresse/index.ts'
import { supprimerMinistere } from '../supprimer-ministere/index.ts'
import { ErreurFonction } from './http.ts'

const CIBLE = '7f1c2a54-3b6e-4d1a-9f0e-2c8b5a6d4e31'
const AUTRE = '0b6c2d1e-4f5a-4b3c-9d8e-7f6a5b4c3d2e'
const MINISTERE = '5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a'
const ADRESSE = 'ministere.tech+ministere@exemple.fr'

interface Options {
  // Étape qui échoue : message de la base pour un rpc, objet d'erreur Auth sinon.
  echecs?: Record<string, string | { code?: string; status?: number }>
  adresseRendue?: string
  inviteRendu?: string
  reponseSuppression?: unknown
}

function clientFactice({
  echecs = {},
  adresseRendue = ADRESSE,
  inviteRendu = CIBLE,
  reponseSuppression = [CIBLE, AUTRE],
}: Options = {}) {
  const appels: string[] = []
  const parametresRpc: Record<string, unknown>[] = []
  const attributsAuth: Record<string, unknown>[] = []
  const erreurAuth = (etape: string) => {
    const echec = echecs[etape]
    if (echec === undefined) return null
    return typeof echec === 'string' ? { code: echec, status: 500 } : echec
  }
  const client = {
    rpc: async (nom: string, parametres: Record<string, unknown>) => {
      const etape = `rpc:${nom}`
      appels.push(etape)
      parametresRpc.push(parametres)
      const message = echecs[etape]
      if (typeof message === 'string') {
        return { data: null, error: { code: 'P0001', message } }
      }
      return {
        data: nom === 'serveur_supprimer_ministere' ? reponseSuppression : null,
        error: null,
      }
    },
    auth: {
      admin: {
        updateUserById: async (_id: string, attributs: Record<string, unknown>) => {
          appels.push('adresse')
          attributsAuth.push(attributs)
          const error = erreurAuth('adresse')
          return { data: { user: error ? null : { email: adresseRendue } }, error }
        },
        inviteUserByEmail: async () => {
          appels.push('invitation')
          const error = erreurAuth('invitation')
          return { data: { user: error ? null : { id: inviteRendu } }, error }
        },
        deleteUser: async (id: string) => {
          const etape = `suppression_utilisateur:${id}`
          appels.push(etape)
          return { data: { user: null }, error: erreurAuth(etape) }
        },
        mfa: {
          listFactors: async () => {
            appels.push('liste_facteurs')
            return 'liste_facteurs' in echecs
              ? { data: null, error: { code: 'unexpected_failure' } }
              : {
                  data: {
                    factors: [
                      { id: 'f1', status: 'verified' },
                      { id: 'f2', status: 'unverified' },
                    ],
                  },
                  error: null,
                }
          },
          deleteFactor: async ({ id }: { id: string }) => {
            const etape = `suppression_facteur:${id}`
            appels.push(etape)
            return { data: { id }, error: erreurAuth(etape) }
          },
        },
      },
    },
  } as unknown as SupabaseClient
  return {
    appelant: { id: 'appelant', session: 'session', admin: client },
    appels,
    parametresRpc,
    attributsAuth,
  }
}

async function erreurDe(promesse: Promise<unknown>): Promise<ErreurFonction> {
  try {
    await promesse
  } catch (erreur) {
    if (erreur instanceof ErreurFonction) return erreur
    throw erreur
  }
  throw new Error('aucune erreur')
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('corriger-adresse', () => {
  const demande = { user_id: CIBLE, email: ADRESSE }

  it('contrôle, adresse et mot de passe, base, facteurs non vérifiés, puis invitation', async () => {
    const { appelant, appels, parametresRpc, attributsAuth } = clientFactice()
    await corrigerAdresse(demande, appelant)
    expect(appels).toEqual([
      'rpc:serveur_controler_correction_adresse',
      'adresse',
      'rpc:serveur_corriger_adresse',
      'liste_facteurs',
      'suppression_facteur:f2',
      'invitation',
    ])
    for (const parametres of parametresRpc) {
      expect(parametres).toMatchObject({
        p_user_id: CIBLE,
        p_email: ADRESSE,
        p_appelant: 'appelant',
        p_session: 'session',
      })
    }
    expect(attributsAuth[0]).toMatchObject({ email: ADRESSE })
    expect(String(attributsAuth[0]?.['password'])).toMatch(/^Aa1!.{40,}$/)
  })

  it('un refus de la base au contrôle ne touche pas à Auth', async () => {
    const { appelant, appels } = clientFactice({
      echecs: { 'rpc:serveur_controler_correction_adresse': 'compte_deja_active' },
    })
    expect(await erreurDe(corrigerAdresse(demande, appelant))).toMatchObject({
      statut: 409,
      code: 'compte_deja_active',
    })
    expect(appels).toEqual(['rpc:serveur_controler_correction_adresse'])
  })

  it('une adresse déjà prise dans Auth est refusée (409), sans écriture en base', async () => {
    const { appelant, appels } = clientFactice({
      echecs: { adresse: { code: 'email_exists', status: 422 } },
    })
    expect(await erreurDe(corrigerAdresse(demande, appelant))).toMatchObject({
      statut: 409,
      code: 'adresse_deja_utilisee',
    })
    expect(appels).not.toContain('rpc:serveur_corriger_adresse')
  })

  it('Auth qui rend une autre adresse : erreur interne, rien en base', async () => {
    const { appelant, appels } = clientFactice({ adresseRendue: 'autre@exemple.fr' })
    expect(await erreurDe(corrigerAdresse(demande, appelant))).toMatchObject({
      statut: 500,
      code: 'erreur_interne',
    })
    expect(appels).not.toContain('rpc:serveur_corriger_adresse')
  })

  it('un envoi trop rapproché garde son code : la correction se relance', async () => {
    const { appelant } = clientFactice({ echecs: { invitation: { status: 429 } } })
    expect(await erreurDe(corrigerAdresse(demande, appelant))).toMatchObject({
      statut: 409,
      code: 'invitation_trop_recente',
    })
  })

  it('une adresse encore confirmée à l’invitation : invitation non envoyée (500)', async () => {
    const { appelant } = clientFactice({
      echecs: { invitation: { code: 'email_exists', status: 422 } },
    })
    expect(await erreurDe(corrigerAdresse(demande, appelant))).toMatchObject({
      statut: 500,
      code: 'invitation_non_envoyee',
    })
  })

  it('une invitation qui vise un autre utilisateur : erreur interne', async () => {
    const { appelant } = clientFactice({ inviteRendu: AUTRE })
    expect(await erreurDe(corrigerAdresse(demande, appelant))).toMatchObject({
      statut: 500,
      code: 'erreur_interne',
    })
  })

  it('un facteur qui ne se supprime pas arrête avant l’invitation', async () => {
    const { appelant, appels } = clientFactice({ echecs: { 'suppression_facteur:f2': 'panne' } })
    expect(await erreurDe(corrigerAdresse(demande, appelant))).toMatchObject({ statut: 500 })
    expect(appels).not.toContain('invitation')
  })
})

describe('supprimer-ministere', () => {
  const demande = { ministere_id: MINISTERE }

  it('contrôle, suppression en base, puis les utilisateurs Auth rendus par la base', async () => {
    const { appelant, appels, parametresRpc } = clientFactice()
    await supprimerMinistere(demande, appelant)
    expect(appels).toEqual([
      'rpc:serveur_controler_suppression_ministere',
      'rpc:serveur_supprimer_ministere',
      `suppression_utilisateur:${CIBLE}`,
      `suppression_utilisateur:${AUTRE}`,
    ])
    for (const parametres of parametresRpc) {
      expect(parametres).toMatchObject({ p_ministere_id: MINISTERE, p_appelant: 'appelant' })
    }
  })

  it('un ministère sans compte : rien à supprimer dans Auth', async () => {
    const { appelant, appels } = clientFactice({ reponseSuppression: [] })
    await supprimerMinistere(demande, appelant)
    expect(appels.filter((appel) => appel.startsWith('suppression_utilisateur'))).toEqual([])
  })

  it('un ministère qui a des données est refusé (409), sans rien supprimer', async () => {
    const { appelant, appels } = clientFactice({
      echecs: { 'rpc:serveur_controler_suppression_ministere': 'ministere_non_vide' },
    })
    expect(await erreurDe(supprimerMinistere(demande, appelant))).toMatchObject({
      statut: 409,
      code: 'ministere_non_vide',
    })
    expect(appels).toEqual(['rpc:serveur_controler_suppression_ministere'])
  })

  it('FIJ et Coordination sont refusés (409)', async () => {
    const { appelant } = clientFactice({
      echecs: { 'rpc:serveur_supprimer_ministere': 'ministere_de_reference' },
    })
    expect(await erreurDe(supprimerMinistere(demande, appelant))).toMatchObject({
      statut: 409,
      code: 'ministere_de_reference',
    })
  })

  it('un utilisateur déjà absent d’Auth est ignoré', async () => {
    const { appelant } = clientFactice({
      echecs: { [`suppression_utilisateur:${CIBLE}`]: { code: 'user_not_found', status: 404 } },
    })
    await expect(supprimerMinistere(demande, appelant)).resolves.toBeUndefined()
  })

  it('un utilisateur Auth qui ne se supprime pas : suppression incomplète, les autres essayés', async () => {
    const { appelant, appels } = clientFactice({
      echecs: { [`suppression_utilisateur:${CIBLE}`]: 'unexpected_failure' },
    })
    expect(await erreurDe(supprimerMinistere(demande, appelant))).toMatchObject({
      statut: 500,
      code: 'suppression_incomplete',
    })
    expect(appels).toContain(`suppression_utilisateur:${AUTRE}`)
  })

  it('une réponse illisible de la base : suppression incomplète, rien dans Auth', async () => {
    const { appelant, appels } = clientFactice({ reponseSuppression: ['pas-un-uuid'] })
    expect(await erreurDe(supprimerMinistere(demande, appelant))).toMatchObject({
      statut: 500,
      code: 'suppression_incomplete',
    })
    expect(appels.filter((appel) => appel.startsWith('suppression_utilisateur'))).toEqual([])
  })
})
