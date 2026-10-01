// Outils des tests d'intégration des Edge Functions de comptes. Pile locale seulement : les
// adresses et les clés viennent de « npx supabase status -o env » (variables API_URL,
// PUBLISHABLE_KEY, SECRET_KEY, exportées par la CI ou lues ici), et toute adresse autre que
// http://127.0.0.1 ou http://localhost est refusée. Les comptes de test sont créés ici, par
// l'API d'administration Auth, sans dépendre du jeu d'exemple.
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { generate } from 'otplib'

interface Environnement {
  apiUrl: string
  clePublique: string
  cleSecrete: string
}

let environnementLu: Environnement | undefined

function lireStatutLocal(): Record<string, string> {
  let sortie: string
  try {
    sortie = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    throw new Error('Pile locale introuvable : lancez npx supabase start (Docker requis).')
  }
  const valeurs: Record<string, string> = {}
  for (const ligne of sortie.split(/\r?\n/)) {
    const correspondance = /^([A-Z0-9_]+)=(.*)$/.exec(ligne.trim())
    if (correspondance?.[1] && correspondance[2] !== undefined) {
      valeurs[correspondance[1]] = correspondance[2].replace(/^"(.*)"$/, '$1')
    }
  }
  return valeurs
}

export function environnement(): Environnement {
  if (environnementLu) return environnementLu
  const nettoyer = (valeur: string | undefined) => valeur?.trim().replace(/^"(.*)"$/, '$1')
  let apiUrl = nettoyer(process.env['API_URL'])
  let clePublique = nettoyer(process.env['PUBLISHABLE_KEY'])
  let cleSecrete = nettoyer(process.env['SECRET_KEY'])
  if (!apiUrl || !clePublique || !cleSecrete) {
    const statut = lireStatutLocal()
    apiUrl = statut['API_URL']
    clePublique = statut['PUBLISHABLE_KEY']
    cleSecrete = statut['SECRET_KEY']
  }
  if (!apiUrl || !clePublique || !cleSecrete) {
    throw new Error('Pile locale introuvable : lancez npx supabase start.')
  }
  const hote = new URL(apiUrl)
  if (hote.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(hote.hostname)) {
    throw new Error('Ces tests ne tournent que contre la pile locale (http://127.0.0.1).')
  }
  environnementLu = { apiUrl: apiUrl.replace(/\/+$/, ''), clePublique, cleSecrete }
  return environnementLu
}

const optionsSansStockage = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

// Client de la clé secrète : prépare les données et lit ce que la fonction a écrit.
export function clientSecret(): SupabaseClient {
  const { apiUrl, cleSecrete } = environnement()
  return createClient(apiUrl, cleSecrete, optionsSansStockage)
}

function clientPublic(): SupabaseClient {
  const { apiUrl, clePublique } = environnement()
  return createClient(apiUrl, clePublique, optionsSansStockage)
}

export function suffixe(): string {
  return randomUUID().slice(0, 8)
}

export function adresseDeTest(prefixe: string): string {
  return `${prefixe}-${suffixe()}@example.com`
}

export interface CompteDeTest {
  id: string
  email: string
  motDePasse: string
}

export type TypeCompte = 'ministere' | 'berger' | 'conseil' | 'admin_eglise' | 'admin_plateforme'

// Utilisateur Auth confirmé et sa ligne compte (écrite avec la clé secrète).
export async function creerCompteDeTest(
  type: TypeCompte,
  options: { ministereId?: string; libelle?: string } = {},
): Promise<CompteDeTest> {
  const secret = clientSecret()
  const email = adresseDeTest(`essai-${type}`)
  const motDePasse = `Essai-${randomUUID()}`
  const { data, error } = await secret.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`Création de l'utilisateur de test : ${error?.code}`)
  const { error: erreurCompte } = await secret.from('compte').insert({
    user_id: data.user.id,
    type,
    ministere_id: options.ministereId ?? null,
    libelle: options.libelle ?? `Essai ${type} ${suffixe()}`,
  })
  if (erreurCompte) throw new Error(`Création du compte de test : ${erreurCompte.code}`)
  return { id: data.user.id, email, motDePasse }
}

export async function creerMinistereDeTest(): Promise<{ id: string; nom: string }> {
  const nom = `Essai fonctions ${suffixe()}`
  const { data, error } = await clientSecret()
    .from('ministere')
    .insert({ nom })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Création du ministère de test : ${error?.code}`)
  return { id: String(data.id), nom }
}

export interface Session {
  client: SupabaseClient
  jeton: string
}

// Connexion par mot de passe : session aal1.
export async function connecter(compte: CompteDeTest): Promise<Session> {
  const client = clientPublic()
  const { data, error } = await client.auth.signInWithPassword({
    email: compte.email,
    password: compte.motDePasse,
  })
  if (error || !data.session) throw new Error(`Connexion de test : ${error?.code}`)
  return { client, jeton: data.session.access_token }
}

// Enrôle un facteur TOTP et le vérifie avec otplib : la session passe en aal2.
export async function activerDoubleAuthentification(session: Session): Promise<Session> {
  const { data, error } = await session.client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Essai ${suffixe()}`,
  })
  if (error || !data) throw new Error(`Enrôlement TOTP : ${error?.code}`)
  const code = await generate({ secret: data.totp.secret })
  const { error: erreurVerification } = await session.client.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code,
  })
  if (erreurVerification) throw new Error(`Vérification TOTP : ${erreurVerification.code}`)
  const { data: courante } = await session.client.auth.getSession()
  if (!courante.session) throw new Error('Session aal2 absente')
  return { client: session.client, jeton: courante.session.access_token }
}

export async function connecterEnAal2(compte: CompteDeTest): Promise<Session> {
  return activerDoubleAuthentification(await connecter(compte))
}

export interface Reponse {
  statut: number
  texte: string
  corps: unknown
}

// Appel HTTP brut d'une Edge Function, avec la clé publique et, si donné, le JWT.
export async function appeler(
  fonction: string,
  corps: unknown,
  options: { jeton?: string; methode?: string } = {},
): Promise<Reponse> {
  const { apiUrl, clePublique } = environnement()
  const enTetes: Record<string, string> = {
    apikey: clePublique,
    'Content-Type': 'application/json',
  }
  if (options.jeton) enTetes['Authorization'] = `Bearer ${options.jeton}`
  const methode = options.methode ?? 'POST'
  const reponse = await fetch(`${apiUrl}/functions/v1/${fonction}`, {
    method: methode,
    headers: enTetes,
    body:
      methode === 'POST' ? (typeof corps === 'string' ? corps : JSON.stringify(corps)) : undefined,
  })
  const texte = await reponse.text()
  let lu: unknown
  try {
    lu = JSON.parse(texte)
  } catch {
    lu = null
  }
  return { statut: reponse.status, texte, corps: lu }
}

// Rien d'interne dans une réponse : ni clé, ni jeton, ni adresse, ni trace de la base.
export function sansFuite(reponse: Reponse, secrets: string[] = []): boolean {
  const { cleSecrete } = environnement()
  const interdits = [cleSecrete, ...secrets, 'sb_secret_', 'postgres', 'SQLSTATE', 'stack', 'auth.']
  return interdits.every((interdit) => !reponse.texte.includes(interdit))
}

export interface LigneJournal {
  action: string
  compte: string | null
  ministere_id: string | null
  cible: string | null
  cible_id: string | null
  detail: Record<string, unknown>
}

// Le journal se lit comme l'administration le lit, en aal2 (service_role n'a que insert).
export async function lignesJournal(lecteur: Session, cibleId: string): Promise<LigneJournal[]> {
  const { data, error } = await lecteur.client
    .from('journal')
    .select('action, compte, ministere_id, cible, cible_id, detail')
    .eq('cible_id', cibleId)
    .order('id')
  if (error) throw new Error(`Lecture du journal : ${error.code}`)
  return (data ?? []) as LigneJournal[]
}

export async function utilisateurParEmail(email: string): Promise<{ id: string } | undefined> {
  const secret = clientSecret()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await secret.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`Liste des utilisateurs : ${error.code}`)
    const trouve = data.users.find((utilisateur) => utilisateur.email === email)
    if (trouve) return { id: trouve.id }
    if (data.users.length < 200) return undefined
  }
  return undefined
}
