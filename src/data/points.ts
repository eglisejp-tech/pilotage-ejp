// Lecture des points ouverts, pour « À décider » (berger et conseil seulement : les autres profils
// ne les lisent pas ici).

import type { LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

export interface PointsOuverts {
  points: LigneVue<'v_point'>[]
  mentions: LigneVue<'v_point_mention'>[]
}

/** Points qui ne sont pas traités (un point traité ne se rouvre pas), avec leurs mentions. */
export async function lirePointsOuverts(): Promise<PointsOuverts> {
  const lecturePoints = await supabase()
    .from('v_point')
    .select(
      'id, ministere_id, titre, description, action_attendue, priorite, echeance, cree_le, cree_par, statut, statut_le, traitement_id, traite_le, traite_par, traite_commentaire',
    )
    .neq('statut', 'traite')
  if (lecturePoints.error) throw lecturePoints.error
  const points = lecturePoints.data
  if (points.length === 0) return { points, mentions: [] }

  const lectureMentions = await supabase()
    .from('v_point_mention')
    .select('point_id, ministere_id')
    .in(
      'point_id',
      points.map((point) => point.id),
    )
  if (lectureMentions.error) throw lectureMentions.error
  return { points, mentions: lectureMentions.data }
}
