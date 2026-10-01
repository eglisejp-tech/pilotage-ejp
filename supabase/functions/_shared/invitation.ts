// Invitation par email, commune à creer-compte et relancer-invitation : lien vers /acces
// (BRIEF, section 8, « Parcours par email »).
import type { SupabaseClient } from '@supabase/supabase-js'
import { consigner, ErreurFonction } from './http.ts'

// Adresse de l'application (variable URL_APPLICATION des secrets des fonctions). Sans elle,
// Auth renvoie vers son Site URL, qui est déjà l'adresse de l'application.
export function adresseAcces(): string | undefined {
  const deno = (globalThis as { Deno?: { env: { get(nom: string): string | undefined } } }).Deno
  const base = deno?.env.get('URL_APPLICATION')
  if (!base) return undefined
  try {
    const url = new URL('/acces', base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

// Envoie (ou renvoie, pour une adresse pas encore confirmée) l'invitation et rend l'identifiant
// de l'utilisateur Auth. Une adresse déjà confirmée donne adresse_deja_utilisee ; un envoi trop
// rapproché du précédent, invitation_trop_recente.
export async function inviter(
  admin: SupabaseClient,
  fonction: string,
  email: string,
): Promise<string> {
  const redirectTo = adresseAcces()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    redirectTo ? { redirectTo } : undefined,
  )
  if (error || !data.user) {
    if (error?.code === 'email_exists') throw new ErreurFonction(409, 'adresse_deja_utilisee')
    if (error?.status === 429) throw new ErreurFonction(409, 'invitation_trop_recente')
    consigner(fonction, 'invitation', error?.code)
    throw new ErreurFonction(500, 'invitation_non_envoyee')
  }
  return data.user.id
}
