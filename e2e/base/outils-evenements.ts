import { expect } from '@playwright/test'
import type { APIResponse, Page } from '@playwright/test'

// Outils des parcours d'événement et de réunion avec la base locale (lot E5) : lectures et
// appels directs à l'API avec le jeton de la page, pour que la RLS décide et non l'interface.
// Adresse et clé publique de la pile locale seulement (job « e2e » de la CI).

/** Jeton d'accès de la session enregistrée par auth-js dans ce navigateur. */
export async function jetonAcces(page: Page): Promise<string> {
  const jeton = await page.evaluate(() => {
    const cle = Object.keys(localStorage).find((nom) => /^sb-.*-auth-token$/.test(nom))
    const session = cle
      ? (JSON.parse(localStorage.getItem(cle) ?? '{}') as { access_token?: string })
      : {}
    return session.access_token ?? null
  })
  if (!jeton) throw new Error('Aucune session enregistrée dans le navigateur.')
  return jeton
}

function adresseEtCle(): { url: string; cle: string } {
  const url = process.env.VITE_SUPABASE_URL
  const cle = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !cle) throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquent.')
  return { url, cle }
}

async function entetes(page: Page): Promise<Record<string, string>> {
  const { cle } = adresseEtCle()
  return { apikey: cle, Authorization: `Bearer ${await jetonAcces(page)}` }
}

/** Lecture PostgREST (`v_evenement?select=id&titre=eq.X`) : la RLS du compte de la page décide. */
export async function lire<Ligne>(page: Page, requete: string): Promise<Ligne[]> {
  const { url } = adresseEtCle()
  const reponse = await page.request.get(`${url}/rest/v1/${requete}`, {
    headers: await entetes(page),
  })
  expect(reponse.status(), requete).toBe(200)
  return (await reponse.json()) as Ligne[]
}

/** Nombre de lignes lisibles par le compte de la page. */
export async function compter(page: Page, requete: string): Promise<number> {
  return (await lire<unknown>(page, requete)).length
}

/** Appel direct d'une fonction de l'API (`/rest/v1/rpc/<nom>`), pour vérifier un refus. */
export async function appeler(page: Page, nom: string, args: object): Promise<APIResponse> {
  const { url } = adresseEtCle()
  return page.request.post(`${url}/rest/v1/rpc/${nom}`, {
    headers: { ...(await entetes(page)), 'Content-Type': 'application/json' },
    data: args,
  })
}

/** Ajout direct dans une table, pour vérifier que la RLS le refuse. */
export async function ajouter(page: Page, table: string, ligne: object): Promise<APIResponse> {
  const { url } = adresseEtCle()
  return page.request.post(`${url}/rest/v1/${table}`, {
    headers: { ...(await entetes(page)), 'Content-Type': 'application/json' },
    data: ligne,
  })
}

/** Jour de Paris de la base (`v_semaine.aujourdhui`), jamais la date de la machine. */
export async function aujourdhuiDeLaBase(page: Page): Promise<string> {
  const [semaine] = await lire<{ aujourdhui: string }>(page, 'v_semaine?select=aujourdhui')
  if (!semaine) throw new Error('v_semaine ne rend aucune ligne.')
  return semaine.aujourdhui
}

/** `AAAA-MM-JJ` plus `jours` jours (calcul sur la date seule, en UTC). */
export function plusJours(date: string, jours: number): string {
  const jour = new Date(`${date}T00:00:00Z`)
  jour.setUTCDate(jour.getUTCDate() + jours)
  return jour.toISOString().slice(0, 10)
}

/** Événement « Réunion des responsables » du jeu d'exemple (seed/42) : Coordination, @Communication. */
export const EVENEMENT_COORDINATION = '42000000-0000-4000-8000-000000000001'

/** Ministère Communication du jeu d'exemple (supabase/seed.sql). */
export const MINISTERE_COMMUNICATION = '10000000-0000-4000-8000-000000000001'
