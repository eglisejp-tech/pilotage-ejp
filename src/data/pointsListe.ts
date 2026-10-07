// Lecture des points de l'écran 05 « Points d'attention » et de « Mes points » : tous les points
// que la base laisse lire au compte (RLS), ouverts et traités, avec leurs mentions et l'auteur de
// chaque traitement. Fichier propre au lot P3 : `points.ts` (« À décider ») ne change pas.

import type { LigneTable, LigneVue } from '@/lib/base'
import { supabase } from '@/lib/supabase'

/** Compte qui a marqué un point traité : son ministère, sinon son libellé (« Berger »). */
export type AuteurTraitement = Pick<LigneTable<'compte'>, 'user_id' | 'ministere_id' | 'libelle'>

export interface PointsListe {
  points: LigneVue<'v_point'>[]
  mentions: LigneTable<'point_mention'>[]
  /** Un compte par auteur distinct de traitement (`traite_par`). */
  auteurs: AuteurTraitement[]
}

const COLONNES_POINT =
  'id, ministere_id, titre, description, action_attendue, priorite, echeance, cree_le, cree_par, statut, statut_le, traitement_id, traite_le, traite_par, traite_commentaire'

/**
 * Tous les points lisibles par le compte : le berger, le conseil et EJP Tech les lisent tous, un
 * ministère ceux qu'il a créés ou qui le mentionnent (la RLS filtre, aucun filtre ici). Une
 * lecture des points, puis, en même temps, leurs mentions et les comptes qui ont marqué un point
 * traité. L'auteur d'un traitement se lit par `compte.ministere_id`, puis le nom du ministère,
 * sinon le libellé du compte (« Traité le 30 sept. par Coordination »).
 */
export async function lirePointsListe(): Promise<PointsListe> {
  const lecturePoints = await supabase().from('v_point').select(COLONNES_POINT)
  if (lecturePoints.error) throw lecturePoints.error
  const points = lecturePoints.data
  if (points.length === 0) return { points, mentions: [], auteurs: [] }

  const idsAuteurs = [
    ...new Set(points.flatMap((point) => (point.traite_par === null ? [] : [point.traite_par]))),
  ]
  const [lectureMentions, lectureAuteurs] = await Promise.all([
    supabase().from('point_mention').select('point_id, ministere_id'),
    idsAuteurs.length === 0
      ? Promise.resolve({ data: [] as AuteurTraitement[], error: null })
      : supabase()
          .from('compte')
          .select('user_id, ministere_id, libelle')
          .in('user_id', idsAuteurs),
  ])
  if (lectureMentions.error) throw lectureMentions.error
  if (lectureAuteurs.error) throw lectureAuteurs.error
  return { points, mentions: lectureMentions.data, auteurs: lectureAuteurs.data }
}
