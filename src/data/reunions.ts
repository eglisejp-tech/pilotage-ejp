// Prochaine réunion du ministère (règle 15) : chaque envoi ajoute une déclaration, la plus récente
// fait foi tant que sa date n'est pas passée. Ajout direct dans `reunion`, sous RLS (le ministère
// du compte, date du jour ou à venir) : une instruction, une ligne de journal `reunion_saisie`.
// Les valeurs arrivent déjà validées par `schemaReunion` (src/features/evenements/schemas.ts).

import type { Reunion } from '@/features/evenements/schemas'
import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/**
 * Prochaine réunion déclarée par le ministère, si sa date n'est pas passée (« Modifier » ouvre le
 * panneau prérempli) ; null sinon (« Renseigner » l'ouvre vide).
 */
export async function lireProchaineReunion(
  ministereId: string,
): Promise<LigneVue<'v_prochaine_reunion'> | null> {
  const { data, error } = await supabase()
    .from('v_prochaine_reunion')
    .select('id, ministere_id, date, heure, objet, decision_attendue')
    .eq('ministere_id', ministereId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Déclare la prochaine réunion du ministère (une nouvelle ligne, jamais une mise à jour). */
export async function enregistrerReunion(ministereId: string, reunion: Reunion): Promise<void> {
  const { error } = await supabase().from('reunion').insert({
    ministere_id: ministereId,
    date: reunion.date,
    heure: reunion.heure,
    objet: reunion.objet,
    decision_attendue: reunion.decision,
  })
  if (error) throw error
}
