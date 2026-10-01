// Contrôle de l'appelant, avant toute action (BRIEF, section 8, « Contrat commun ») :
// JWT vérifié par @supabase/server (signature, expiration, audience), niveau aal2, puis compte
// actif de l'administration de l'église. La clé secrète n'est lue que par @supabase/server, dans
// l'environnement fourni par Supabase (SUPABASE_SECRET_KEYS) : jamais dans le code ni les logs.
import { createSupabaseContext } from '@supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { consigner, ErreurFonction } from './http.ts'

export interface Appelant {
  // auth.users.id de l'administration qui appelle : il signe la ligne de journal.
  id: string
  // Revendication session_id du JWT vérifié : la base exige que cette session existe encore,
  // à l'appelant et en aal2 (décision T15).
  session: string
  // Client de la clé secrète (contourne la RLS) : seulement après les contrôles ci-dessous.
  admin: SupabaseClient
}

const identifiant = z.uuid()
const ligneCompte = z.object({
  type: z.string(),
  desactive_le: z.string().nullable(),
})

export async function verifierAppelant(requete: Request, fonction: string): Promise<Appelant> {
  const { data: contexte, error } = await createSupabaseContext(requete, {
    auth: 'user',
    audience: 'authenticated',
  })
  if (error) {
    if (error.status === 401) throw new ErreurFonction(401, 'non_authentifie')
    consigner(fonction, 'verification_jwt', error.code)
    throw new ErreurFonction(500, 'erreur_interne')
  }

  const revendications = contexte.jwtClaims
  if (
    !revendications ||
    revendications.role !== 'authenticated' ||
    !identifiant.safeParse(revendications.sub).success ||
    !identifiant.safeParse(revendications['session_id']).success
  ) {
    throw new ErreurFonction(401, 'non_authentifie')
  }
  if (revendications['aal'] !== 'aal2') {
    throw new ErreurFonction(403, 'double_authentification_requise')
  }

  const admin = contexte.supabaseAdmin
  const { data, error: erreurCompte } = await admin
    .from('compte')
    .select('type, desactive_le')
    .eq('user_id', revendications.sub)
    .maybeSingle()
  if (erreurCompte) {
    consigner(fonction, 'lecture_compte_appelant', erreurCompte.code)
    throw new ErreurFonction(500, 'erreur_interne')
  }
  const compte = ligneCompte.safeParse(data)
  if (!compte.success || compte.data.type !== 'admin_eglise' || compte.data.desactive_le !== null) {
    throw new ErreurFonction(403, 'acces_refuse')
  }
  return { id: revendications.sub, session: String(revendications['session_id']), admin }
}
