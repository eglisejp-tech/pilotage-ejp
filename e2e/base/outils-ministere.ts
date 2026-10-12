import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifierAdresseLocale } from '../installer-comptes.ts'

// Outils des parcours qui créent leur propre ministère d'essai dans la base locale (lots L3a et
// L3b). La clé secrète de la pile locale ne sert qu'ici, jamais contre une base distante :
// `verifierAdresseLocale` refuse toute autre adresse, comme `installer-comptes.ts`.

/** Client de la pile locale avec la clé secrète (job « e2e » de la CI). */
export function clientLocalSecret(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL
  const cleSecrete = process.env.E2E_CLE_SECRETE_LOCALE
  if (!url || !cleSecrete) {
    throw new Error('VITE_SUPABASE_URL et E2E_CLE_SECRETE_LOCALE manquent : voir le job « e2e ».')
  }
  verifierAdresseLocale(url)
  return createClient(url, cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/** Identifiant d'un ministère d'essai, créé s'il n'existe pas (clé secrète de la pile locale). */
export async function ministereDEssai(nom: string): Promise<string> {
  const admin = clientLocalSecret()
  const { data: existant, error: erreurLecture } = await admin
    .from('ministere')
    .select('id')
    .eq('nom', nom)
    .maybeSingle()
  if (erreurLecture)
    throw new Error(`Lecture du ministère d'essai impossible (${erreurLecture.code}).`)
  if (existant) return (existant as { id: string }).id
  const { data, error } = await admin.from('ministere').insert({ nom }).select('id').single()
  if (error) throw new Error(`Création du ministère d'essai impossible (${error.code}).`)
  return (data as { id: string }).id
}
