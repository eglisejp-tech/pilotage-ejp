// Types de la base lus par le navigateur (supabase/migrations). Écrits à la main tant que la
// génération (`npx supabase gen types typescript --local`) demande Docker, absent de ce poste :
// seulement ce que l'application lit déjà. Chaque étape ajoute ce qu'elle lit, dans ce format.

export type TypeCompte = 'ministere' | 'berger' | 'conseil' | 'admin_eglise' | 'admin_plateforme'

type Aucun = { [_ in never]: never }

export type Database = {
  public: {
    Tables: {
      compte: {
        Row: {
          user_id: string
          type: TypeCompte
          ministere_id: string | null
          libelle: string
          cree_le: string
          desactive_le: string | null
        }
        // Aucune écriture côté navigateur : les comptes passent par les Edge Functions.
        Insert: Aucun
        Update: Aucun
        Relationships: []
      }
    }
    Views: Aucun
    Functions: Aucun
    Enums: { type_compte: TypeCompte }
    CompositeTypes: Aucun
  }
}
