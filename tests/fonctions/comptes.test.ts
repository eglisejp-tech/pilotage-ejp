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

const FONCTIONS = [
  'creer-compte',
  'desactiver-compte',
  'reinitialiser-2fa',
  'relancer-invitation',
  'reactiver-compte',
  // T74
  'corriger-adresse',
  'supprimer-ministere',
] as const

// Corps qui passe le schéma de chaque fonction (le refus attendu vient ensuite de la base).
function corpsValide(fonction: (typeof FONCTIONS)[number], email: string): Record<string, unknown> {
  switch (fonction) {
    case 'creer-compte':
      return { type: 'conseil', email }
    case 'corriger-adresse':
      return { user_id: randomUUID(), email }
    case 'supprimer-ministere':
      return { ministere_id: randomUUID() }
    default:
      return { user_id: randomUUID() }
  }
}

// EJP Tech gère seul les comptes (décision T60) : c'est l'appelant des essais.
let tech: CompteDeTest
let sessionTech: Session
let jetonTechAal1: string

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
  tech = await creerCompteDeTest('admin_plateforme')
  const premierFacteur = await connecter(tech)
  jetonTechAal1 = premierFacteur.jeton
  sessionTech = await activerDoubleAuthentification(premierFacteur)
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

  it('refuse sans JWT, avec un JWT illisible, modifié ou une clé à sa place (401)', async () => {
    // verify_jwt = false : c'est la fonction qui répond, avec son corps et ses en-têtes CORS.
    const [entete, charge, signature] = sessionTech.jeton.split('.')
    const revendications = JSON.parse(Buffer.from(charge ?? '', 'base64url').toString('utf8'))
    const modifie = [
      entete,
      Buffer.from(JSON.stringify({ ...revendications, exp: revendications.exp + 3600 })).toString(
        'base64url',
      ),
      signature,
    ].join('.')
    const { clePublique } = environnement()
    for (const fonction of FONCTIONS) {
      for (const jeton of [undefined, 'abc.def.ghi', modifie, clePublique]) {
        const reponse = await appeler(fonction, { user_id: randomUUID() }, { jeton })
        attendreErreur(reponse, 401, 'non_authentifie', [sessionTech.jeton])
        expect(reponse.enTetes.get('access-control-allow-origin')).toBe('*')
      }
    }
  })

  it('refuse un JWT aal1, même d’EJP Tech (403)', async () => {
    const email = adresseDeTest('essai-refus-aal1')
    for (const fonction of FONCTIONS) {
      const corps = fonction === 'creer-compte' ? { type: 'conseil', email } : { user_id: tech.id }
      attendreErreur(
        await appeler(fonction, corps, { jeton: jetonTechAal1 }),
        403,
        'double_authentification_requise',
        [jetonTechAal1, email],
      )
    }
    expect(await utilisateurParEmail(email)).toBeUndefined()
  })

  it('refuse un compte qui n’est pas EJP Tech : ministère, berger, conseil, administration (403, T60)', async () => {
    // Un seul berger actif (index unique) : celui du jeu d'exemple est mis de côté pendant
    // l'essai, puis rendu tel quel.
    const secret = clientSecret()
    const { data: bergers, error: erreurBergers } = await secret
      .from('compte')
      .select('user_id')
      .eq('type', 'berger')
      .is('desactive_le', null)
    expect(erreurBergers).toBeNull()
    const anciensBergers = (bergers ?? []).map((ligne) => String(ligne.user_id))
    const poserDesactivation = async (ids: string[], date: string | null) => {
      if (ids.length === 0) return
      const { error } = await secret
        .from('compte')
        .update({ desactive_le: date })
        .in('user_id', ids)
      expect(error).toBeNull()
    }
    await poserDesactivation(anciensBergers, new Date().toISOString())
    const ministere = await creerMinistereDeTest()
    const berger = await creerCompteDeTest('berger', { libelle: 'Berger' })
    try {
      const autres = [
        await connecterEnAal2(await creerCompteDeTest('ministere', { ministereId: ministere.id })),
        await connecterEnAal2(berger),
        await connecterEnAal2(await creerCompteDeTest('conseil')),
        await connecterEnAal2(
          await creerCompteDeTest('admin_eglise', { libelle: "Administration de l'église" }),
        ),
      ]
      const email = adresseDeTest('essai-refus-conseil')
      for (const autre of autres) {
        for (const fonction of FONCTIONS) {
          const corps =
            fonction === 'creer-compte' ? { type: 'conseil', email } : { user_id: tech.id }
          attendreErreur(
            await appeler(fonction, corps, { jeton: autre.jeton }),
            403,
            'acces_refuse',
            [autre.jeton, email],
          )
        }
      }
      expect(await utilisateurParEmail(email)).toBeUndefined()
    } finally {
      await poserDesactivation([berger.id], new Date().toISOString())
      await poserDesactivation(anciensBergers, null)
    }
  })

  it('refuse un compte EJP Tech désactivé (403)', async () => {
    const ancienne = await creerCompteDeTest('admin_plateforme')
    const session = await connecterEnAal2(ancienne)
    const { error } = await clientSecret()
      .from('compte')
      .update({ desactive_le: new Date().toISOString() })
      .eq('user_id', ancienne.id)
    expect(error).toBeNull()
    const email = adresseDeTest('essai-refus-desactivee')
    for (const fonction of FONCTIONS) {
      const corps = fonction === 'creer-compte' ? { type: 'conseil', email } : { user_id: tech.id }
      attendreErreur(await appeler(fonction, corps, { jeton: session.jeton }), 403, 'acces_refuse')
    }
    expect(await utilisateurParEmail(email)).toBeUndefined()
  })

  it('refuse un jeton encore valide dont la session a été supprimée (401, décision T15)', async () => {
    const autre = await creerCompteDeTest('admin_plateforme')
    const session = await connecterEnAal2(autre)
    // Session vivante : les contrôles de la base passent (compte inconnu, mais appelant accepté).
    attendreErreur(
      await appeler('desactiver-compte', { user_id: randomUUID() }, { jeton: session.jeton }),
      400,
      'compte_inconnu',
    )
    // Déconnexion : Auth supprime la session, le jeton d'accès reste signé et non expiré.
    const { error } = await session.client.auth.signOut({ scope: 'local' })
    expect(error).toBeNull()
    for (const fonction of FONCTIONS) {
      const corps = corpsValide(fonction, adresseDeTest('essai-session'))
      attendreErreur(
        await appeler(fonction, corps, { jeton: session.jeton }),
        401,
        'session_revoquee',
        [session.jeton],
      )
    }
  })

  it('refuse une autre méthode que POST (405)', async () => {
    for (const fonction of FONCTIONS) {
      attendreErreur(
        await appeler(fonction, null, { jeton: sessionTech.jeton, methode: 'GET' }),
        405,
        'methode_non_autorisee',
      )
    }
  })
})

describe('validation de la demande', () => {
  it('refuse un corps illisible ou hors schéma (400)', async () => {
    const jeton = sessionTech.jeton
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
      ['relancer-invitation', { user_id: randomUUID(), email: 'a@example.com' }],
      ['reactiver-compte', '{"user_id": '],
      ['corriger-adresse', { user_id: randomUUID() }],
      ['corriger-adresse', { user_id: randomUUID(), email: 'pas-une-adresse' }],
      ['supprimer-ministere', { ministere_id: 'x' }],
      ['supprimer-ministere', { user_id: randomUUID() }],
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
      await appeler('creer-compte', { type: 'conseil', email }, { jeton: sessionTech.jeton }),
    )
    const utilisateur = await utilisateurParEmail(email)
    expect(utilisateur).toBeDefined()
    const { data } = await clientSecret().auth.admin.getUserById(utilisateur!.id)
    expect(data.user?.invited_at).toBeTruthy()
    const ligne = await compte(utilisateur!.id)
    expect(ligne).toMatchObject({ type: 'conseil', ministere_id: null, desactive_le: null })
    expect(ligne?.libelle).toMatch(/^Conseil, compte [0-9]+$/)
    expect(await lignesJournal(sessionTech, utilisateur!.id)).toEqual([
      {
        action: 'compte_cree',
        compte: tech.id,
        ministere_id: null,
        cible: 'compte',
        cible_id: utilisateur!.id,
        detail: { type: 'conseil' },
      },
    ])

    // La même adresse ne reçoit pas de deuxième compte.
    attendreErreur(
      await appeler('creer-compte', { type: 'conseil', email }, { jeton: sessionTech.jeton }),
      409,
      'adresse_deja_utilisee',
      [email],
    )
    expect(await lignesJournal(sessionTech, utilisateur!.id)).toHaveLength(1)
  })

  it('crée un compte EJP Tech avec le libellé imposé', async () => {
    const email = adresseDeTest('essai-ejptech')
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'admin_plateforme', email },
        { jeton: sessionTech.jeton },
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
        { jeton: sessionTech.jeton },
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
    expect(await lignesJournal(sessionTech, ligne!.ministere_id!)).toEqual([
      {
        action: 'ministere_cree',
        compte: tech.id,
        ministere_id: ligne!.ministere_id,
        cible: 'ministere',
        cible_id: ligne!.ministere_id,
        detail: {},
      },
    ])
    expect(await lignesJournal(sessionTech, utilisateur!.id)).toEqual([
      {
        action: 'compte_cree',
        compte: tech.id,
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
        { jeton: sessionTech.jeton },
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
        { jeton: sessionTech.jeton },
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
        { jeton: sessionTech.jeton },
      ),
      409,
      'ministere_a_deja_un_compte',
    )
    expect(await utilisateurParEmail(autreEmail)).toBeUndefined()
    attendreErreur(
      await appeler(
        'creer-compte',
        { type: 'ministere', email: autreEmail, ministere: { id: randomUUID() } },
        { jeton: sessionTech.jeton },
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
      await appeler('creer-compte', { type: 'berger', email }, { jeton: sessionTech.jeton }),
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
      await appeler('desactiver-compte', { user_id: tech.id }, { jeton: sessionTech.jeton }),
      403,
      'propre_compte',
    )
    attendreErreur(
      await appeler('desactiver-compte', { user_id: randomUUID() }, { jeton: sessionTech.jeton }),
      400,
      'compte_inconnu',
    )
  })

  it('bannit, désactive le compte et son ministère, supprime les sessions, écrit le journal', async () => {
    attendreSucces(
      await appeler('desactiver-compte', { user_id: cible.id }, { jeton: sessionTech.jeton }),
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
    // Une seule ligne de journal, au nom d'EJP Tech.
    expect(await lignesJournal(sessionTech, cible.id)).toEqual([
      {
        action: 'compte_desactive',
        compte: tech.id,
        ministere_id: ministereId,
        cible: 'compte',
        cible_id: cible.id,
        detail: { type: 'ministere', ministere_desactive: true },
      },
    ])
  })

  it('refuse un compte déjà désactivé, sans nouvelle ligne de journal', async () => {
    attendreErreur(
      await appeler('desactiver-compte', { user_id: cible.id }, { jeton: sessionTech.jeton }),
      409,
      'compte_desactive',
    )
    attendreErreur(
      await appeler('reinitialiser-2fa', { user_id: cible.id }, { jeton: sessionTech.jeton }),
      409,
      'compte_desactive',
    )
    expect(await lignesJournal(sessionTech, cible.id)).toHaveLength(1)
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
      await appeler('reinitialiser-2fa', { user_id: tech.id }, { jeton: sessionTech.jeton }),
      403,
      'propre_compte',
    )
  })

  it('supprime les facteurs, change le mot de passe, supprime les sessions, écrit le journal', async () => {
    const secret = clientSecret()
    const avant = await secret.auth.admin.mfa.listFactors({ userId: cible.id })
    expect(avant.data?.factors.length).toBeGreaterThan(0)

    attendreSucces(
      await appeler('reinitialiser-2fa', { user_id: cible.id }, { jeton: sessionTech.jeton }),
    )

    const apres = await secret.auth.admin.mfa.listFactors({ userId: cible.id })
    expect(apres.error).toBeNull()
    expect(apres.data?.factors).toEqual([])
    // L'ancien mot de passe ne sert plus ; la session ouverte ne se rafraîchit plus.
    await expect(connecter(cible)).rejects.toThrow()
    const { error: erreurRafraichissement } = await sessionCible.client.auth.refreshSession()
    expect(erreurRafraichissement).not.toBeNull()
    // Le compte reste actif ; une seule ligne de journal, au nom d'EJP Tech.
    expect((await compte(cible.id))?.desactive_le).toBeNull()
    expect(await lignesJournal(sessionTech, cible.id)).toEqual([
      {
        action: 'double_auth_reinitialisee',
        compte: tech.id,
        ministere_id: null,
        cible: 'compte',
        cible_id: cible.id,
        detail: {},
      },
    ])
  })
})

describe('relancer-invitation', () => {
  it('renvoie l’invitation d’une adresse pas encore confirmée et écrit le journal', async () => {
    const email = adresseDeTest('essai-relance')
    attendreSucces(
      await appeler('creer-compte', { type: 'conseil', email }, { jeton: sessionTech.jeton }),
    )
    const invite = await utilisateurParEmail(email)
    expect(invite).toBeDefined()
    const avant = await clientSecret().auth.admin.getUserById(invite!.id)
    // Auth espace deux envois à la même adresse (max_frequency de la pile locale).
    await new Promise((resolve) => setTimeout(resolve, 2_000))

    const reponse = await appeler(
      'relancer-invitation',
      { user_id: invite!.id },
      { jeton: sessionTech.jeton },
    )
    attendreSucces(reponse)
    expect(sansFuite(reponse, [email])).toBe(true)
    const apres = await clientSecret().auth.admin.getUserById(invite!.id)
    expect(apres.data.user?.email_confirmed_at ?? null).toBeNull()
    expect(Date.parse(apres.data.user?.invited_at ?? '')).toBeGreaterThanOrEqual(
      Date.parse(avant.data.user?.invited_at ?? ''),
    )
    const lignes = await lignesJournal(sessionTech, invite!.id)
    expect(lignes.filter((ligne) => ligne.action === 'invitation_relancee')).toEqual([
      {
        action: 'invitation_relancee',
        compte: tech.id,
        ministere_id: null,
        cible: 'compte',
        cible_id: invite!.id,
        detail: {},
      },
    ])
  })

  it('refuse une adresse déjà confirmée, le compte de l’appelant et un compte inconnu', async () => {
    const confirme = await creerCompteDeTest('conseil')
    attendreErreur(
      await appeler('relancer-invitation', { user_id: confirme.id }, { jeton: sessionTech.jeton }),
      409,
      'invitation_deja_acceptee',
      [confirme.email],
    )
    expect(await lignesJournal(sessionTech, confirme.id)).toEqual([])
    attendreErreur(
      await appeler('relancer-invitation', { user_id: tech.id }, { jeton: sessionTech.jeton }),
      403,
      'propre_compte',
    )
    attendreErreur(
      await appeler('relancer-invitation', { user_id: randomUUID() }, { jeton: sessionTech.jeton }),
      400,
      'compte_inconnu',
    )
  })
})

describe('reactiver-compte', () => {
  it('refuse un compte actif et le compte de l’appelant', async () => {
    const actif = await creerCompteDeTest('conseil')
    attendreErreur(
      await appeler('reactiver-compte', { user_id: actif.id }, { jeton: sessionTech.jeton }),
      409,
      'compte_actif',
    )
    attendreErreur(
      await appeler('reactiver-compte', { user_id: tech.id }, { jeton: sessionTech.jeton }),
      403,
      'propre_compte',
    )
    attendreErreur(
      await appeler('reactiver-compte', { user_id: randomUUID() }, { jeton: sessionTech.jeton }),
      400,
      'compte_inconnu',
    )
    expect(await lignesJournal(sessionTech, actif.id)).toEqual([])
  })

  it('lève le bannissement, réactive le compte et son ministère, écrit le journal', async () => {
    const ministere = await creerMinistereDeTest()
    const cible = await creerCompteDeTest('ministere', { ministereId: ministere.id })
    attendreSucces(
      await appeler('desactiver-compte', { user_id: cible.id }, { jeton: sessionTech.jeton }),
    )
    await expect(connecter(cible)).rejects.toThrow()

    attendreSucces(
      await appeler('reactiver-compte', { user_id: cible.id }, { jeton: sessionTech.jeton }),
    )
    expect((await compte(cible.id))?.desactive_le).toBeNull()
    const { data: ligneMinistere } = await clientSecret()
      .from('ministere')
      .select('desactive_le')
      .eq('id', ministere.id)
      .single()
    expect(ligneMinistere?.desactive_le).toBeNull()
    const { data } = await clientSecret().auth.admin.getUserById(cible.id)
    const banni = data.user?.banned_until
    expect(!banni || Date.parse(banni) <= Date.now()).toBe(true)
    // Le compte se connecte de nouveau (puis refera son code TOTP s'il en a un).
    await expect(connecter(cible)).resolves.toBeDefined()
    expect(await lignesJournal(sessionTech, cible.id)).toEqual([
      {
        action: 'compte_desactive',
        compte: tech.id,
        ministere_id: ministere.id,
        cible: 'compte',
        cible_id: cible.id,
        detail: { type: 'ministere', ministere_desactive: true },
      },
      {
        action: 'compte_reactive',
        compte: tech.id,
        ministere_id: ministere.id,
        cible: 'compte',
        cible_id: cible.id,
        detail: { type: 'ministere' },
      },
    ])

    // Déjà réactivé : refusé, sans nouvelle ligne.
    attendreErreur(
      await appeler('reactiver-compte', { user_id: cible.id }, { jeton: sessionTech.jeton }),
      409,
      'compte_actif',
    )
    expect(await lignesJournal(sessionTech, cible.id)).toHaveLength(2)
  })
})

// T74 : corriger l'adresse d'un compte jamais activé, puis renvoyer l'invitation.
describe('corriger-adresse', () => {
  it('remplace l’adresse d’une invitation en attente et envoie l’invitation à la nouvelle', async () => {
    const ancienne = adresseDeTest('essai-correction-ancienne')
    const nouvelle = adresseDeTest('essai-correction-nouvelle')
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'conseil', email: ancienne },
        { jeton: sessionTech.jeton },
      ),
    )
    const invite = await utilisateurParEmail(ancienne)
    expect(invite).toBeDefined()
    const avant = await compte(invite!.id)
    const { data: auth } = await clientSecret().auth.admin.getUserById(invite!.id)
    // Auth espace deux envois au même utilisateur (max_frequency de la pile locale).
    await new Promise((resolve) => setTimeout(resolve, 2_000))

    const reponse = await appeler(
      'corriger-adresse',
      { user_id: invite!.id, email: nouvelle },
      { jeton: sessionTech.jeton },
    )
    attendreSucces(reponse)
    expect(sansFuite(reponse, [ancienne, nouvelle])).toBe(true)
    const { data: apres } = await clientSecret().auth.admin.getUserById(invite!.id)
    expect(apres.user?.email).toBe(nouvelle)
    expect(apres.user?.email_confirmed_at ?? null).toBeNull()
    expect(Date.parse(apres.user?.invited_at ?? '')).toBeGreaterThanOrEqual(
      Date.parse(auth.user?.invited_at ?? ''),
    )
    expect(await utilisateurParEmail(ancienne)).toBeUndefined()
    expect(await compte(invite!.id)).toEqual(avant)
    const lignes = await lignesJournal(sessionTech, invite!.id)
    expect(lignes.filter((ligne) => ligne.action === 'adresse_corrigee')).toEqual([
      {
        action: 'adresse_corrigee',
        compte: tech.id,
        ministere_id: null,
        cible: 'compte',
        cible_id: invite!.id,
        detail: { type: 'conseil' },
      },
    ])
    expect(JSON.stringify(lignes)).not.toContain('@')
  })

  it('« À activer » : l’adresse et le mot de passe changent, le ministère ne bouge pas', async () => {
    const ancienne = adresseDeTest('essai-correction-ministere')
    const nouvelle = adresseDeTest('essai-correction-ministere-bis')
    const nom = `Essai correction ${suffixe()}`
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'ministere', email: ancienne, ministere: { nom } },
        { jeton: sessionTech.jeton },
      ),
    )
    const invite = await utilisateurParEmail(ancienne)
    const avant = await compte(invite!.id)
    expect(avant?.ministere_id).toBeTruthy()
    // Quelqu'un a ouvert l'invitation de l'adresse fausse et choisi un mot de passe.
    const motDePasse = `Essai-${randomUUID()}`
    const { error: erreurConfirmation } = await clientSecret().auth.admin.updateUserById(
      invite!.id,
      { email_confirm: true, password: motDePasse },
    )
    expect(erreurConfirmation).toBeNull()
    await expect(connecter({ id: invite!.id, email: ancienne, motDePasse })).resolves.toBeDefined()
    await new Promise((resolve) => setTimeout(resolve, 2_000))

    attendreSucces(
      await appeler(
        'corriger-adresse',
        { user_id: invite!.id, email: nouvelle },
        { jeton: sessionTech.jeton },
      ),
    )
    const { data: apres } = await clientSecret().auth.admin.getUserById(invite!.id)
    expect(apres.user?.email).toBe(nouvelle)
    expect(apres.user?.email_confirmed_at ?? null).toBeNull()
    // Le mot de passe choisi depuis l'adresse fausse ne sert plus, ni avec l'une ni avec l'autre.
    await expect(connecter({ id: invite!.id, email: ancienne, motDePasse })).rejects.toThrow()
    await expect(connecter({ id: invite!.id, email: nouvelle, motDePasse })).rejects.toThrow()
    expect(await compte(invite!.id)).toEqual(avant)
    const { data: ministere } = await clientSecret()
      .from('ministere')
      .select('nom, desactive_le')
      .eq('id', avant!.ministere_id!)
      .single()
    expect(ministere).toEqual({ nom, desactive_le: null })
    expect(
      (await lignesJournal(sessionTech, invite!.id)).filter(
        (ligne) => ligne.action === 'adresse_corrigee',
      ),
    ).toEqual([
      {
        action: 'adresse_corrigee',
        compte: tech.id,
        ministere_id: avant!.ministere_id,
        cible: 'compte',
        cible_id: invite!.id,
        detail: { type: 'ministere' },
      },
    ])
  })

  it('refuse un compte activé, une adresse prise, son propre compte et l’administration', async () => {
    const active = await creerCompteDeTest('conseil')
    await connecterEnAal2(active)
    const nouvelle = adresseDeTest('essai-correction-refus')
    attendreErreur(
      await appeler(
        'corriger-adresse',
        { user_id: active.id, email: nouvelle },
        { jeton: sessionTech.jeton },
      ),
      409,
      'compte_deja_active',
      [active.email, nouvelle],
    )
    const invite = adresseDeTest('essai-correction-prise')
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'conseil', email: invite },
        { jeton: sessionTech.jeton },
      ),
    )
    const utilisateur = await utilisateurParEmail(invite)
    attendreErreur(
      await appeler(
        'corriger-adresse',
        { user_id: utilisateur!.id, email: active.email },
        { jeton: sessionTech.jeton },
      ),
      409,
      'adresse_deja_utilisee',
      [active.email],
    )
    attendreErreur(
      await appeler(
        'corriger-adresse',
        { user_id: tech.id, email: nouvelle },
        { jeton: sessionTech.jeton },
      ),
      403,
      'propre_compte',
    )
    const administration = await creerCompteDeTest('admin_eglise', {
      libelle: "Administration de l'église",
    })
    attendreErreur(
      await appeler(
        'corriger-adresse',
        { user_id: administration.id, email: nouvelle },
        { jeton: sessionTech.jeton },
      ),
      400,
      'type_interdit',
    )
    attendreErreur(
      await appeler(
        'corriger-adresse',
        { user_id: randomUUID(), email: nouvelle },
        { jeton: sessionTech.jeton },
      ),
      400,
      'compte_inconnu',
    )
    expect(await utilisateurParEmail(nouvelle)).toBeUndefined()
    for (const cible of [active.id, utilisateur!.id, administration.id]) {
      expect(
        (await lignesJournal(sessionTech, cible)).filter(
          (ligne) => ligne.action === 'adresse_corrigee',
        ),
      ).toEqual([])
    }
  })
})

// T74 : supprimer un ministère vide, son compte et son utilisateur Auth.
describe('supprimer-ministere', () => {
  it('supprime un ministère vide, son compte et son utilisateur Auth ; le journal garde son nom', async () => {
    const email = adresseDeTest('essai-suppression')
    const nom = `Essai suppression ${suffixe()}`
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'ministere', email, ministere: { nom } },
        { jeton: sessionTech.jeton },
      ),
    )
    const utilisateur = await utilisateurParEmail(email)
    const ministereId = (await compte(utilisateur!.id))?.ministere_id
    expect(ministereId).toBeTruthy()

    const reponse = await appeler(
      'supprimer-ministere',
      { ministere_id: ministereId },
      { jeton: sessionTech.jeton },
    )
    attendreSucces(reponse)
    expect(sansFuite(reponse, [email])).toBe(true)
    expect(await compte(utilisateur!.id)).toBeNull()
    const { data: ministere } = await clientSecret()
      .from('ministere')
      .select('id')
      .eq('id', ministereId!)
      .maybeSingle()
    expect(ministere).toBeNull()
    const { data: auth } = await clientSecret().auth.admin.getUserById(utilisateur!.id)
    expect(auth.user ?? null).toBeNull()
    const lignes = await lignesJournal(sessionTech, ministereId!)
    expect(lignes.map((ligne) => ligne.action)).toEqual(['ministere_cree', 'ministere_supprime'])
    expect(lignes[1]).toEqual({
      action: 'ministere_supprime',
      compte: tech.id,
      ministere_id: ministereId,
      cible: 'ministere',
      cible_id: ministereId,
      detail: { nom, comptes: 1, indicateurs: 0 },
    })
    expect(JSON.stringify(lignes)).not.toContain('@')
    // La ligne de création du compte reste, lisible avec le nom du ministère.
    const { data: vue } = await sessionTech.client
      .from('v_journal')
      .select('ministere_nom, cible_texte')
      .eq('action', 'compte_cree')
      .eq('cible_id', utilisateur!.id)
      .single()
    expect(vue).toEqual({ ministere_nom: nom, cible_texte: `Ministère ${nom}` })

    // L'adresse et le nom redeviennent libres.
    attendreSucces(
      await appeler(
        'creer-compte',
        { type: 'ministere', email, ministere: { nom } },
        { jeton: sessionTech.jeton },
      ),
    )
  })

  it('refuse un compte activé, FIJ et un ministère inconnu, sans rien supprimer', async () => {
    const ministere = await creerMinistereDeTest()
    const active = await creerCompteDeTest('ministere', { ministereId: ministere.id })
    await connecterEnAal2(active)
    attendreErreur(
      await appeler(
        'supprimer-ministere',
        { ministere_id: ministere.id },
        { jeton: sessionTech.jeton },
      ),
      409,
      'compte_deja_active',
      [active.email],
    )
    expect(await compte(active.id)).not.toBeNull()
    const { data: fij } = await clientSecret()
      .from('ministere')
      .select('id')
      .eq('code', 'fij')
      .single()
    attendreErreur(
      await appeler('supprimer-ministere', { ministere_id: fij?.id }, { jeton: sessionTech.jeton }),
      409,
      'ministere_de_reference',
    )
    attendreErreur(
      await appeler(
        'supprimer-ministere',
        { ministere_id: randomUUID() },
        { jeton: sessionTech.jeton },
      ),
      400,
      'ministere_inconnu',
    )
    expect(await lignesJournal(sessionTech, ministere.id)).toEqual([])
  })
})

// T60 : le compte de l'administration de l'église se gère au tableau de bord, sur demande écrite
// de la coordination ; aucune Edge Function ne le vise (migration 20261013130500).
describe('compte de l’administration de l’église', () => {
  it('ni désactivé, ni réinitialisé, ni relancé, ni réactivé par EJP Tech (400), rien ne change', async () => {
    const administration = await creerCompteDeTest('admin_eglise', {
      libelle: "Administration de l'église",
    })
    for (const fonction of ['desactiver-compte', 'reinitialiser-2fa', 'relancer-invitation']) {
      attendreErreur(
        await appeler(fonction, { user_id: administration.id }, { jeton: sessionTech.jeton }),
        400,
        'type_interdit',
        [administration.email],
      )
    }
    // Toujours actif, pas banni, son mot de passe sert encore.
    expect((await compte(administration.id))?.desactive_le).toBeNull()
    const { data } = await clientSecret().auth.admin.getUserById(administration.id)
    const banni = data.user?.banned_until
    expect(!banni || Date.parse(banni) <= Date.now()).toBe(true)
    await expect(connecter(administration)).resolves.toBeDefined()

    // Désactivé au tableau de bord : la réactivation est refusée aussi.
    const { error } = await clientSecret()
      .from('compte')
      .update({ desactive_le: new Date().toISOString() })
      .eq('user_id', administration.id)
    expect(error).toBeNull()
    attendreErreur(
      await appeler(
        'reactiver-compte',
        { user_id: administration.id },
        { jeton: sessionTech.jeton },
      ),
      400,
      'type_interdit',
    )
    expect((await compte(administration.id))?.desactive_le).not.toBeNull()
    expect(await lignesJournal(sessionTech, administration.id)).toEqual([])
  })
})
