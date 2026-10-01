import type { TypeCompte } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Compte connecté : jamais le nom d'une personne (« Conseil, compte 3 »). */
export type Compte = {
  id: string
  type: TypeCompte
  /** Ministère du compte, pour un compte de ministère seulement. */
  ministereId: string | null
  libelle: string
  actif: boolean
}

/**
 * Ligne `compte` du compte connecté. Lisible dès aal1, seule exception à la politique aal2
 * (BRIEF section 8) : libellé des écrans 17 et 18, détection d'un compte désactivé. En aal2, la
 * RLS laisse lire d'autres comptes : le filtre sur user_id est donc indispensable.
 */
export async function lireMonCompte(userId: string): Promise<Compte | null> {
  const { data, error } = await supabase()
    .from('compte')
    .select('user_id, type, ministere_id, libelle, desactive_le')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.user_id,
    type: data.type,
    ministereId: data.ministere_id,
    libelle: data.libelle,
    actif: data.desactive_le === null,
  }
}
