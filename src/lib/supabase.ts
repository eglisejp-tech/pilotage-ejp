import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/base'

export type ClientSupabase = SupabaseClient<Database>

/** Au-delà, une requête est abandonnée et l'écran affiche son erreur (LISEZMOI, « États »). */
const DELAI_MAX_REQUETE = 10_000

export class ErreurConfiguration extends Error {
  override name = 'ErreurConfiguration'
}

type Environnement = Pick<ImportMetaEnv, 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY'>

/** Une ancienne clé JWT dont le rôle est service_role contourne la RLS : jamais dans le navigateur. */
function estAncienneCleSecrete(cle: string): boolean {
  const charge = cle.split('.')[1]
  if (!charge) return false
  try {
    const json = atob(charge.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: unknown }).role === 'service_role'
  } catch {
    return false
  }
}

/** Lit et vérifie l'URL et la clé publique. Refuse toute clé secrète. */
export function lireConfiguration(environnement: Environnement): { url: string; cle: string } {
  const url = environnement.VITE_SUPABASE_URL?.trim()
  const cle = environnement.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !cle) {
    throw new ErreurConfiguration(
      'VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquent : copiez .env.example vers .env.local.',
    )
  }
  if (cle.startsWith('sb_secret_') || estAncienneCleSecrete(cle)) {
    throw new ErreurConfiguration(
      'La clé fournie est une clé secrète. Le navigateur ne reçoit que la clé publique (sb_publishable_...).',
    )
  }
  return { url, cle }
}

/** fetch avec un délai maximal, en gardant le signal d'annulation fourni par l'appelant. */
function fetchAvecDelai(entree: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const delai = AbortSignal.timeout(DELAI_MAX_REQUETE)
  const signal = init?.signal ? AbortSignal.any([init.signal, delai]) : delai
  return fetch(entree, { ...init, signal })
}

let client: ClientSupabase | undefined

/**
 * Client Supabase du navigateur, créé au premier appel : les aperçus de développement, qui ne
 * l'appellent jamais, s'affichent même sans configuration. Flux PKCE pour Google (aucun jeton
 * dans l'adresse de retour) ; les liens des emails passent par /acces et verifyOtp.
 */
export function supabase(): ClientSupabase {
  if (!client) {
    const { url, cle } = lireConfiguration(import.meta.env)
    client = createClient<Database>(url, cle, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { fetch: fetchAvecDelai },
      // Sans cette option, le client relance seul chaque lecture en échec réseau (1, 2 puis 4 s),
      // et un délai dépassé (TimeoutError) compte comme un échec réseau : une route sans réponse
      // ferait attendre 47 s au lieu de 10 s. Le nouvel essai appartient à TanStack Query.
      db: { retry: false },
    })
  }
  return client
}
