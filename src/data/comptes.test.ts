import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { CodeErreur } from '../../supabase/functions/_shared/http.ts'
import {
  creerCompte,
  desactiverCompte,
  ErreurCompte,
  lireEtatComptes,
  lireIndicateursDesMinisteres,
  MESSAGES_ERREURS_COMPTES,
  reactiverCompte,
  reinitialiserDoubleAuthentification,
  relancerInvitation,
} from './comptes'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMPTE = '20000000-0000-4000-8000-000000000014'
const FIJ = '10000000-0000-4000-8000-000000000006'
/** Tiret cadratin et demi-cadratin, interdits dans les textes (écrits par leur code). */
const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

type ReponseInvoke = { data: unknown; error: unknown }

/** Faux client : les requêtes de `fauxRequete`, plus `functions.invoke` pour les fonctions. */
function installer(invoke: () => Promise<ReponseInvoke> = () => ok()) {
  const faux = fauxRequete()
  const appel = vi.fn<(nom: string, options: { body: unknown }) => Promise<ReponseInvoke>>(invoke)
  courant.client = { from: faux.client.from, functions: { invoke: appel } }
  return { ...faux, invoke: appel }
}

const ok = () => Promise.resolve({ data: { ok: true }, error: null })

/** Réponse d'erreur d'une fonction, comme supabase-js la rend (statut hors 2xx). */
function refus(statut: number, corps: unknown) {
  const reponse = new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json' },
  })
  return () => Promise.resolve({ data: null, error: new FunctionsHttpError(reponse) })
}

beforeEach(() => {
  courant.client = undefined
})

describe('lectures de l’écran 13', () => {
  it('v_etat_comptes : les colonnes de l’écran, dans l’ordre des libellés', async () => {
    const faux = installer()
    await lireEtatComptes()
    expect(appelsDe(faux.de('v_etat_comptes')[0])).toEqual([
      'select("user_id, type, libelle, ministere_id, email, desactive_le, etat")',
      'order("libelle", {"ascending":true})',
    ])
  })

  it('indicateurs propres actifs ou à valider, jamais une valeur ni un commun', async () => {
    const faux = installer()
    await lireIndicateursDesMinisteres()
    expect(appelsDe(faux.de('indicateur')[0])).toEqual([
      'select("ministere_id")',
      'not("ministere_id", "is", null)',
      'in("etat", ["actif","en_attente"])',
    ])
  })
})

describe('appels des cinq fonctions de comptes', () => {
  it('creer-compte : la demande validée par le schéma partagé, adresse en minuscules', async () => {
    const faux = installer()
    await creerCompte({
      type: 'ministere',
      email: '  EJPTech1+Ministere@Exemple.test ',
      ministere: { nom: ' Tech ' },
    })
    expect(faux.invoke).toHaveBeenCalledWith('creer-compte', {
      body: {
        type: 'ministere',
        email: 'ejptech1+ministere@exemple.test',
        ministere: { nom: 'Tech' },
      },
    })
  })

  it('creer-compte : un ministère existant par son identifiant', async () => {
    const faux = installer()
    await creerCompte({ type: 'ministere', email: 'fij@exemple.test', ministere: { id: FIJ } })
    expect(faux.invoke).toHaveBeenCalledWith('creer-compte', {
      body: { type: 'ministere', email: 'fij@exemple.test', ministere: { id: FIJ } },
    })
  })

  it('creer-compte : une demande invalide ne part pas (type admin_eglise, adresse fausse)', async () => {
    const faux = installer()
    await expect(
      creerCompte({ type: 'admin_eglise', email: 'x@exemple.test' } as never),
    ).rejects.toThrow()
    await expect(creerCompte({ type: 'conseil', email: 'pas-une-adresse' })).rejects.toThrow()
    expect(faux.invoke).not.toHaveBeenCalled()
  })

  it.each([
    ['relancer-invitation', relancerInvitation],
    ['desactiver-compte', desactiverCompte],
    ['reactiver-compte', reactiverCompte],
    ['reinitialiser-2fa', reinitialiserDoubleAuthentification],
  ] as const)('%s : { user_id } seulement', async (nom, action) => {
    const faux = installer()
    await action(COMPTE)
    expect(faux.invoke).toHaveBeenCalledWith(nom, { body: { user_id: COMPTE } })
  })

  it('un identifiant qui n’est pas un uuid ne part pas', async () => {
    const faux = installer()
    await expect(desactiverCompte('pas-un-uuid')).rejects.toThrow()
    expect(faux.invoke).not.toHaveBeenCalled()
  })
})

describe('codes d’erreur traduits en français', () => {
  const CODES: CodeErreur[] = [
    'requete_invalide',
    'methode_non_autorisee',
    'non_authentifie',
    'session_revoquee',
    'double_authentification_requise',
    'acces_refuse',
    'type_interdit',
    'ministere_inconnu',
    'compte_inconnu',
    'propre_compte',
    'adresse_deja_utilisee',
    'ministere_a_deja_un_compte',
    'nom_ministere_deja_pris',
    'berger_deja_actif',
    'compte_desactive',
    'compte_actif',
    'invitation_deja_acceptee',
    'invitation_trop_recente',
    'conflit',
    'invitation_non_envoyee',
    'erreur_interne',
  ]

  it.each(CODES)('%s : une phrase française, sans le code ni tiret', async (code) => {
    installer(refus(409, { erreur: code }))
    const erreur = await desactiverCompte(COMPTE).catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(ErreurCompte)
    expect((erreur as ErreurCompte).code).toBe(code)
    const message = (erreur as ErreurCompte).message
    expect(message).toBe(MESSAGES_ERREURS_COMPTES[code])
    expect(message).toMatch(/^[A-ZÀ-Ü].*\.$/u)
    expect(message).not.toContain(code)
    expect(message).not.toMatch(TIRETS)
  })

  it('adresse déjà utilisée et nom déjà pris : des phrases précises', () => {
    expect(MESSAGES_ERREURS_COMPTES.adresse_deja_utilisee).toBe(
      'Cette adresse a déjà un compte. Choisissez une autre adresse.',
    )
    expect(MESSAGES_ERREURS_COMPTES.nom_ministere_deja_pris).toBe(
      'Un ministère porte déjà ce nom. Choisissez un autre nom.',
    )
  })

  it('un corps illisible ou un code inconnu : erreur_interne, jamais le texte du serveur', async () => {
    installer(refus(500, { erreur: 'trace interne' }))
    await expect(relancerInvitation(COMPTE)).rejects.toMatchObject({ code: 'erreur_interne' })
    installer(() =>
      Promise.resolve({
        data: null,
        error: new FunctionsHttpError(new Response('<html>502</html>', { status: 502 })),
      }),
    )
    await expect(relancerInvitation(COMPTE)).rejects.toMatchObject({ code: 'erreur_interne' })
  })

  it.each(['toString', 'constructor', '__proto__', 'connexion'])(
    'un code hérité ou réservé (%s) : erreur_interne',
    async (code) => {
      installer(refus(500, { erreur: code }))
      await expect(relancerInvitation(COMPTE)).rejects.toMatchObject({
        code: 'erreur_interne',
        message: MESSAGES_ERREURS_COMPTES.erreur_interne,
      })
    },
  )

  it('réponse absente (réseau, délai) : vérifier la liste avant de réessayer', async () => {
    installer(() =>
      Promise.resolve({ data: null, error: new FunctionsFetchError(new Error('réseau')) }),
    )
    await expect(reactiverCompte(COMPTE)).rejects.toMatchObject({
      code: 'connexion',
      message: "La réponse n'est pas arrivée. Vérifiez la liste avant de réessayer.",
    })
    installer(() => Promise.reject(new Error('délai')))
    await expect(reactiverCompte(COMPTE)).rejects.toMatchObject({ code: 'connexion' })
  })
})
