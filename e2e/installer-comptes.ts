import { createClient, isAuthApiError } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generate } from 'otplib'
import {
  attendreTourDeVerification,
  COMPTES_JEU_EXEMPLE,
  enregistrerSecrets,
  MOT_DE_PASSE_TEST,
} from './comptes.ts'

// Installation des comptes de test (BRIEF section 8, « Tests obligatoires »), lancée par
// Playwright avant les parcours avec la base (globalSetup, E2E_BASE=1), en local ou en CI.
// - Refuse toute adresse autre que http://127.0.0.1 ou http://localhost : jamais un projet
//   distant, jamais la production.
// - Mot de passe par l'API d'administration Auth (clé secrète locale, lue dans l'environnement
//   du script seulement, jamais dans une variable VITE_).
// - Facteur TOTP par l'API publique : connexion, mfa.enroll (qui rend le secret), puis
//   challengeAndVerify avec un code otplib. Jamais d'écriture dans auth.mfa_factors.
// - EJP Formation reste sans facteur. Les secrets vont dans e2e/.auth/ et ne s'affichent jamais.

const OPTIONS_CLIENT = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

function lireVariable(nom: string): string {
  const valeur = process.env[nom]?.trim()
  if (!valeur) throw new Error(`${nom} manque : voir le job « e2e » de la CI.`)
  return valeur
}

/** Seulement la base locale de la CLI Supabase. */
export function verifierAdresseLocale(adresse: string): URL {
  const url = new URL(adresse)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error(
      'Installation refusée : seule une base locale (http://127.0.0.1 ou http://localhost) reçoit des comptes de test.',
    )
  }
  return url
}

const attendre = (ms: number) => new Promise((fin) => setTimeout(fin, ms))

/** Une vérification de code, avec un nouvel essai si la limite de fréquence répond 429. */
async function verifierAvecRythme(client: SupabaseClient, facteurId: string, secret: string) {
  for (let essai = 1; ; essai += 1) {
    await attendreTourDeVerification()
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId: facteurId,
      code: await generate({ secret }),
    })
    if (!error) return
    const limite = isAuthApiError(error) && error.status === 429
    if (!limite || essai >= 4)
      throw new Error(`Vérification du code refusée (${error.code ?? error.status}).`)
    await attendre(20_000)
  }
}

export default async function installerComptes() {
  const url = lireVariable('VITE_SUPABASE_URL')
  verifierAdresseLocale(url)
  const clePublique = lireVariable('VITE_SUPABASE_PUBLISHABLE_KEY')
  const cleSecrete = lireVariable('E2E_CLE_SECRETE_LOCALE')
  const admin = createClient(url, cleSecrete, OPTIONS_CLIENT)

  const { data: liste, error: erreurListe } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (erreurListe) throw new Error(`Lecture des comptes impossible (${erreurListe.code ?? ''}).`)
  const identifiants = new Map(
    liste.users.map((utilisateur) => [utilisateur.email, utilisateur.id]),
  )

  const secrets: Record<string, string> = {}
  for (const { email, avecFacteur } of COMPTES_JEU_EXEMPLE) {
    const id = identifiants.get(email)
    if (!id) throw new Error(`Compte absent du jeu d'exemple : ${email}.`)

    // Repart d'un compte sans facteur : le script peut tourner plusieurs fois sur la même base.
    const { data: facteurs, error: erreurFacteurs } = await admin.auth.admin.mfa.listFactors({
      userId: id,
    })
    if (erreurFacteurs) throw new Error(`Facteurs illisibles pour ${email}.`)
    for (const facteur of facteurs.factors) {
      const { error } = await admin.auth.admin.mfa.deleteFactor({ id: facteur.id, userId: id })
      if (error) throw new Error(`Suppression d'un facteur impossible pour ${email}.`)
    }

    const { error: erreurMotDePasse } = await admin.auth.admin.updateUserById(id, {
      password: MOT_DE_PASSE_TEST,
    })
    if (erreurMotDePasse) throw new Error(`Mot de passe refusé pour ${email}.`)
    if (!avecFacteur) continue

    const client = createClient(url, clePublique, OPTIONS_CLIENT)
    const { error: erreurConnexion } = await client.auth.signInWithPassword({
      email,
      password: MOT_DE_PASSE_TEST,
    })
    if (erreurConnexion) throw new Error(`Connexion refusée pour ${email}.`)
    const { data: facteur, error: erreurEnrolement } = await client.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Pilotage EJP',
      friendlyName: 'Pilotage EJP',
    })
    if (erreurEnrolement) throw new Error(`Enrôlement refusé pour ${email}.`)
    await verifierAvecRythme(client, facteur.id, facteur.totp.secret)
    secrets[email] = facteur.totp.secret
    await client.auth.signOut({ scope: 'local' })
  }

  await enregistrerSecrets(secrets)
  console.log(
    `Comptes de test prêts : ${Object.keys(secrets).length} avec double authentification, ` +
      `${COMPTES_JEU_EXEMPLE.length - Object.keys(secrets).length} sans.`,
  )
}
