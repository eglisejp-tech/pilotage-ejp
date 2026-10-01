// Tests d'intégration des Edge Functions creer-compte, desactiver-compte et reinitialiser-2fa
// (BRIEF, section 8, « Contrat commun ») contre la pile locale : npx supabase start, puis
// npm run test:fonctions. Ils ajoutent des comptes et des ministères d'essai à la base locale :
// en local, npx supabase db reset remet ensuite le jeu d'exemple d'origine.
import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  activerDoubleAuthentification,
  adresseDeTest,
  appeler,
  clientSecret,
  connecter,
  connecterEnAal2,
  creerCompteDeTest,
  creerMinistereDeTest,
  environnement,
  lignesJournal,
  sansFuite,
  suffixe,
  utilisateurParEmail,
  type CompteDeTest,
  type Reponse,
  type Session,
} from './outils.ts'

const FONCTIONS = ['creer-compte', 'desactiver-compte', 'reinitialiser-2fa'] as const

let admin: CompteDeTest
let sessionAdmin: Session
let jetonAdminAal1: string

function attendreErreur(reponse: Reponse, statut: number, code: string, secrets: string[] = []) {
  expect(reponse.statut).toBe(statut)
  expect(reponse.corps).toEqual({ erreur: code })
  expect(sansFuite(reponse, secrets)).toBe(true)
}

function attendreSucces(reponse: Reponse) {
  expect(reponse.statut).toBe(200)
  expect(reponse.corps).toEqual({ ok: true })
}

async function compte(userId: string) {
  const { data, error } = await clientSecret()
    .from('compte')
    .select('type, ministere_id, libelle, desactive_le')
    .eq('user_id', userId)
    .maybeSingle()
  expect(error).toBeNull()
  return data as {
    type: string
    ministere_id: string | null
    libelle: string
    desactive_le: string | null
  } | null
}

beforeAll(async () => {
  admin = await creerCompteDeTest('admin_eglise', { libelle: "Administration de l'église" })
  const premierFacteur = await connecter(admin)
  jetonAdminAal1 = premierFacteur.jeton
  sessionAdmin = await activerDoubleAuthentification(premierFacteur)
})

describe("contrôle de l'appelant", () => {
  it('répond à OPTIONS avec les en-têtes CORS', async () => {
    for (const fonction of FONCTIONS) {
      const { apiUrl } = environnement()
      const reponse = await fetch(`${apiUrl}/functions/v1/${fonction}`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://127.0.0.1:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization, apikey, content-type',
        },
      })
      expect(reponse.status).toBeLessThan(300)
      expect(reponse.headers.get('access-control-allow-origin')).toBeTruthy()
    }
  })

  it('refuse sans JWT ou avec un JWT illisible (401)', async () => {
    for (const fonction of FONCTIONS) {
      const sansJeton = await appeler(fonction, { user_id: randomUUID() })
      expect(sansJeton.statut).toBe(401)
      expect(sansFuite(sansJeton)).toBe(true)
      const illisible = await appeler(fonction, { user_id: randomUUID() }, { jeton: 'abc.def.ghi' })
      expect(illisible.statut).toBe(401)
      expect(sansFuite(illisible)).toBe(true)
    }
  })

  it('refuse un JWT aal1, même de l’administration (403)', async () => {
    const email = adresseDeTest('essai-refus-aal1')
    for (const fonction of FONCTIONS) {
      const corps = fonction === 'creer-compte' ? { type: 'conseil', email } : { user_id: admin.id }
      attendreErreur(
        await appeler(fonction, corps, { jeton: jetonAdminAal1 }),
        403,
        'double_authentification_requise',
        [jetonAdminAal1, email],
      )
    }
    expect(await utilisateurParEmail(email)).toBeUndefined()
  })

  it('refuse un compte qui n’est pas l’administration (403)', async () => {
    const conseil = await connecterEnAal2(await creerCompteDeTest('conseil'))
    const email = adresseDeTest('essai-refus-conseil')
    for (const fonction of FONCTIONS) {
      const corps = fonction === 'creer-compte' ? { type: 'conseil', email } : { user_id: admin.id }
      attendreErreur(
        await appeler(fonction, corps, { jeton: conseil.jeton }),
        403,
        'acces_refuse',
        [conseil.jeton, email],
      )
    }
    expect(await utilisateurParEmail(email)).toBeUndefined()
  })

  it('refuse une administration désactivée (403)', async () => {
    const ancienne = await creerCompteDeTest('admin_eglise', {
      libelle: "Administration de l'église",
    })
    const session = await connecterEnAal2(ancienne)
    const { error } = await clientSecret()
      .from('compte')
      .update({ desactive_le: new Date().toISOString() })
      .eq('user_id', ancienne.id)
    expect(error).toBeNull()
    const email = adresseDeTest('essai-refus-desactivee')
    for (const fonction of FONCTIONS) {
      const corps = fonction === 'creer-compte' ? { type: 'conseil', email } : { user_id: admin.id }
      attendreErreur(await appeler(fonction, corps, { jeton: session.jeton }), 403, 'acces_refuse')
    }
    expect(await utilisateurParEmail(email)).toBeUndefined()
  })

  it('refuse une autre méthode que POST (405)', async () => {
    for (const fonction of FONCTIONS) {
      attendreErreur(
        await appeler(fonction, null, { jeton: sessionAdmin.jeton, methode: 'GET' }),
        405,
        'methode_non_autorisee',
      )
    }
  })
})

describe('validation de la demande', () => {
  it('refuse un corps illisible ou hors schéma (400)', async () => {
    const jeton = sessionAdmin.jeton
    const invalides: Array<[string, unknown]> = [
      ['creer-compte', '{"type": "conseil",'],
      ['creer-compte', { type: 'admin_eglise', email: adresseDeTest('essai-admin') }],
      ['creer-compte', { type: 'conseil', email: 'pas-une-adresse' }],
      ['creer-compte', { type: 'conseil', email: adresseDeTest('essai'), libelle: 'Jean' }],
      [
        'creer-compte',
        { type: 'ministere', email: adresseDeTest('essai'), ministere: { nom: '' } },
      ],
      [
        'creer-compte',
        { type: 'ministere', email: adresseDeTest('essai'), ministere: { id: 'x' } },
      ],
      ['desactiver-compte', { user_id: 'pas-un-uuid' }],
      ['reinitialiser-2fa', {}],
    ]
    for (const [fonction, corps] of invalides) {
      attendreErreur(await appeler(fonction, corps, { jeton }), 400, 'requete_invalide')
    }
  })
})

describe('creer-compte', () => {
  it('crée un compte du conseil : invitation, ligne compte, journal au nom de l’appelant', async () => {
    const email = adresseDeTest('essai-conseil')
    attendreSucces(
      await appeler('creer-compte', { type: 'conseil', email }, { jeton: sessionAdmin.jeton }),
    )
    const utilisateur = await utilisateurParEmail(email)
    expect(utilisateur).toBeDefined()
    const { data } = await clientSecret().auth.admin.getUserById(utilisateur!.id)
    expect(data.user?.invited_at).toBeTruthy()
    const ligne = await compte(utilisateur!.id)
    expect(ligne).toMatchObject({ type: 'conseil', ministere_id: null, desactive_le: null })
    expect(ligne?.libelle).toMatch(/^Conseil, compte [0-9]+$/)
    expect(await lignesJournal(sessionAdmin, utilisateur!.id)).toEqual([
      {
        action: 'compte_cree',
        compte: admin.id,
        ministere_id: null,
        cible: 'compte',
        cible_id: utilisateur!.id,
        detail: { type: 'conseil' },
      },
    ])

    // La même adresse ne reçoit pas de deuxième compte.
    attendreErreur(
      await appeler('creer-compte', { type: 'conseil', email }, { jeton: sessionAdmin.jeton }),
      409,
      'adresse_deja_utilisee',
      [email],
    )
    expect(await lignesJournal(sessionAdmin, utilisateur!.id)).toHaveLength(1)
  })

  it('crée un compte EJP Tech avec le libellé imposé', async () => {
    const email = adresseDeTest('essai-ejptech')
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'admin_plateforme', email },
        { jeton: sessionAdmin.jeton },
      ),
    )
    const utilisateur = await utilisateurParEmail(email)
    const ligne = await compte(utilisateur!.id)
    expect(ligne?.type).toBe('admin_plateforme')
    expect(ligne?.libelle).toMatch(/^EJP Tech, compte [0-9]+$/)
  })

  it('crée un nouveau ministère et son compte, puis refuse le même nom', async () => {
    const nom = `Essai nouveau ${suffixe()}`
    const email = adresseDeTest('essai-ministere')
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'ministere', email, ministere: { nom, description: 'Ministère d’essai' } },
        { jeton: sessionAdmin.jeton },
      ),
    )
    const utilisateur = await utilisateurParEmail(email)
    const ligne = await compte(utilisateur!.id)
    expect(ligne?.libelle).toBe(`Ministère ${nom}`)
    const { data: ministere } = await clientSecret()
      .from('ministere')
      .select('id, nom, description, desactive_le')
      .eq('id', ligne!.ministere_id!)
      .single()
    expect(ministere).toMatchObject({ nom, description: 'Ministère d’essai', desactive_le: null })
    expect(await lignesJournal(sessionAdmin, ligne!.ministere_id!)).toEqual([
      {
        action: 'ministere_cree',
        compte: admin.id,
        ministere_id: ligne!.ministere_id,
        cible: 'ministere',
        cible_id: ligne!.ministere_id,
        detail: {},
      },
    ])
    expect(await lignesJournal(sessionAdmin, utilisateur!.id)).toEqual([
      {
        action: 'compte_cree',
        compte: admin.id,
        ministere_id: ligne!.ministere_id,
        cible: 'compte',
        cible_id: utilisateur!.id,
        detail: { type: 'ministere' },
      },
    ])

    const autreEmail = adresseDeTest('essai-ministere-doublon')
    attendreErreur(
      await appeler(
        'creer-compte',
        { type: 'ministere', email: autreEmail, ministere: { nom: nom.toUpperCase() } },
        { jeton: sessionAdmin.jeton },
      ),
      409,
      'nom_ministere_deja_pris',
    )
    // Refus avant l'invitation : aucune adresse n'a été invitée.
    expect(await utilisateurParEmail(autreEmail)).toBeUndefined()
  })

  it('crée le compte d’un ministère existant, puis refuse un deuxième compte actif', async () => {
    const ministere = await creerMinistereDeTest()
    const email = adresseDeTest('essai-existant')
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'ministere', email, ministere: { id: ministere.id } },
        { jeton: sessionAdmin.jeton },
      ),
    )
    const utilisateur = await utilisateurParEmail(email)
    expect(await compte(utilisateur!.id)).toMatchObject({
      type: 'ministere',
      ministere_id: ministere.id,
      libelle: `Ministère ${ministere.nom}`,
    })
    const autreEmail = adresseDeTest('essai-existant-doublon')
    attendreErreur(
      await appeler(
        'creer-compte',
        { type: 'ministere', email: autreEmail, ministere: { id: ministere.id } },
        { jeton: sessionAdmin.jeton },
      ),
      409,
      'ministere_a_deja_un_compte',
    )
    expect(await utilisateurParEmail(autreEmail)).toBeUndefined()
    attendreErreur(
      await appeler(
        'creer-compte',
        { type: 'ministere', email: autreEmail, ministere: { id: randomUUID() } },
        { jeton: sessionAdmin.jeton },
      ),
      400,
      'ministere_inconnu',
    )
  })

  it('refuse un deuxième berger actif', async () => {
    const { data: bergers } = await clientSecret()
      .from('compte')
      .select('user_id')
      .eq('type', 'berger')
      .is('desactive_le', null)
    if (!bergers || bergers.length === 0) await creerCompteDeTest('berger', { libelle: 'Berger' })
    const email = adresseDeTest('essai-berger')
    attendreErreur(
      await appeler('creer-compte', { type: 'berger', email }, { jeton: sessionAdmin.jeton }),
      409,
      'berger_deja_actif',
    )
    expect(await utilisateurParEmail(email)).toBeUndefined()
  })
})

describe('desactiver-compte', () => {
  let cible: CompteDeTest
  let sessionCible: Session
  let ministereId: string

  beforeAll(async () => {
    ministereId = (await creerMinistereDeTest()).id
    cible = await creerCompteDeTest('ministere', { ministereId })
    sessionCible = await connecterEnAal2(cible)
  })

  it('refuse le compte de l’appelant et un compte inconnu', async () => {
    attendreErreur(
      await appeler('desactiver-compte', { user_id: admin.id }, { jeton: sessionAdmin.jeton }),
      403,
      'propre_compte',
    )
    attendreErreur(
      await appeler('desactiver-compte', { user_id: randomUUID() }, { jeton: sessionAdmin.jeton }),
      400,
      'compte_inconnu',
    )
  })

  it('bannit, désactive le compte et son ministère, supprime les sessions, écrit le journal', async () => {
    attendreSucces(
      await appeler('desactiver-compte', { user_id: cible.id }, { jeton: sessionAdmin.jeton }),
    )
    // Données gardées, dates posées.
    const ligne = await compte(cible.id)
    expect(ligne?.desactive_le).not.toBeNull()
    const { data: ministere } = await clientSecret()
      .from('ministere')
      .select('desactive_le')
      .eq('id', ministereId)
      .single()
    expect(ministere?.desactive_le).not.toBeNull()
    // Banni dans Auth.
    const { data } = await clientSecret().auth.admin.getUserById(cible.id)
    expect(Date.parse(data.user?.banned_until ?? '')).toBeGreaterThan(Date.now())
    // Plus de session ni de connexion.
    const { error: erreurRafraichissement } = await sessionCible.client.auth.refreshSession()
    expect(erreurRafraichissement).not.toBeNull()
    await expect(connecter(cible)).rejects.toThrow()
    // Une seule ligne de journal, au nom de l'administration.
    expect(await lignesJournal(sessionAdmin, cible.id)).toEqual([
      {
        action: 'compte_desactive',
        compte: admin.id,
        ministere_id: ministereId,
        cible: 'compte',
        cible_id: cible.id,
        detail: { type: 'ministere', ministere_desactive: true },
      },
    ])
  })

  it('refuse un compte déjà désactivé, sans nouvelle ligne de journal', async () => {
    attendreErreur(
      await appeler('desactiver-compte', { user_id: cible.id }, { jeton: sessionAdmin.jeton }),
      409,
      'compte_desactive',
    )
    attendreErreur(
      await appeler('reinitialiser-2fa', { user_id: cible.id }, { jeton: sessionAdmin.jeton }),
      409,
      'compte_desactive',
    )
    expect(await lignesJournal(sessionAdmin, cible.id)).toHaveLength(1)
    const { data } = await clientSecret().auth.admin.getUserById(cible.id)
    expect(Date.parse(data.user?.banned_until ?? '')).toBeGreaterThan(Date.now())
  })
})

describe('reinitialiser-2fa', () => {
  let cible: CompteDeTest
  let sessionCible: Session

  beforeAll(async () => {
    cible = await creerCompteDeTest('conseil')
    sessionCible = await connecterEnAal2(cible)
  })

  it('refuse le compte de l’appelant', async () => {
    attendreErreur(
      await appeler('reinitialiser-2fa', { user_id: admin.id }, { jeton: sessionAdmin.jeton }),
      403,
      'propre_compte',
    )
  })

  it('supprime les facteurs, change le mot de passe, supprime les sessions, écrit le journal', async () => {
    const secret = clientSecret()
    const avant = await secret.auth.admin.mfa.listFactors({ userId: cible.id })
    expect(avant.data?.factors.length).toBeGreaterThan(0)

    attendreSucces(
      await appeler('reinitialiser-2fa', { user_id: cible.id }, { jeton: sessionAdmin.jeton }),
    )

    const apres = await secret.auth.admin.mfa.listFactors({ userId: cible.id })
    expect(apres.error).toBeNull()
    expect(apres.data?.factors).toEqual([])
    // L'ancien mot de passe ne sert plus ; la session ouverte ne se rafraîchit plus.
    await expect(connecter(cible)).rejects.toThrow()
    const { error: erreurRafraichissement } = await sessionCible.client.auth.refreshSession()
    expect(erreurRafraichissement).not.toBeNull()
    // Le compte reste actif ; une seule ligne de journal, au nom de l'administration.
    expect((await compte(cible.id))?.desactive_le).toBeNull()
    expect(await lignesJournal(sessionAdmin, cible.id)).toEqual([
      {
        action: 'double_auth_reinitialisee',
        compte: admin.id,
        ministere_id: null,
        cible: 'compte',
        cible_id: cible.id,
        detail: {},
      },
    ])
  })
})
