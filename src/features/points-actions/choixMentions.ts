import type { MinistereListe } from '@/data/ministeres'
import type { MinistreAMentionner } from '@/features/evenements/ChoixMentions'
import { TEXTES_ACTIONS_POINT } from '@/features/points-actions/textes'
import { comparerNoms } from '@/lib/metier/texte'

// Choix de la fenêtre « Modifier les mentions » (T54) : quels ministères s'affichent, et si la
// liste a changé.

/**
 * Ministères proposés : les actifs autres que le créateur, puis, cochés, ceux qui restent
 * mentionnés bien que désactivés (« Social (désactivé) ») : on peut les retirer, plus les ajouter.
 * Par ordre alphabétique du nom.
 */
export function ministeresDeLaFenetre(
  ministeres: readonly MinistereListe[],
  createurId: string,
  mentions: readonly string[],
): MinistreAMentionner[] {
  return ministeres
    .filter((ministere) => ministere.id !== createurId)
    .flatMap((ministere) => {
      if (ministere.desactive_le === null) return [{ id: ministere.id, nom: ministere.nom }]
      if (!mentions.includes(ministere.id)) return []
      return [
        { id: ministere.id, nom: `${ministere.nom} ${TEXTES_ACTIONS_POINT.mentions.desactive}` },
      ]
    })
    .sort((a, b) => comparerNoms(a.nom, b.nom))
}

/** Vrai quand les deux listes contiennent les mêmes ministères, quel que soit l'ordre. */
export function memesMentions(a: readonly string[], b: readonly string[]): boolean {
  const premiere = new Set(a)
  const seconde = new Set(b)
  return premiere.size === seconde.size && [...premiere].every((id) => seconde.has(id))
}
