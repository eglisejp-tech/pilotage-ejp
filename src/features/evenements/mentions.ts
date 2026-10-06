import type { MinistereListe } from '@/data/ministeres'
import type { MinistreAMentionner } from '@/features/evenements/ChoixMentions'
import { comparerNoms, trierNoms } from '@/lib/metier/texte'

// Mentions de ministères sur les événements (T32) : qui peut être mentionné à la création, et les
// noms des mentions d'un événement existant (fixées à sa création, elles ne changent plus).

/** Ministères qu'un ministère peut mentionner : les actifs autres que lui, par ordre alphabétique. */
export function ministeresAMentionner(
  ministeres: readonly MinistereListe[],
  ministereId: string,
): MinistreAMentionner[] {
  return ministeres
    .filter((ministere) => ministere.desactive_le === null && ministere.id !== ministereId)
    .map(({ id, nom }) => ({ id, nom }))
    .sort((a, b) => comparerNoms(a.nom, b.nom))
}

/** Noms des ministères mentionnés, dans l'ordre alphabétique (un ministère désactivé compris). */
export function nomsDesMentions(
  idsMentionnes: readonly string[],
  ministeres: readonly MinistereListe[],
): string[] {
  const noms = new Map(ministeres.map((ministere) => [ministere.id, ministere.nom]))
  return trierNoms(
    idsMentionnes.flatMap((id) => {
      const nom = noms.get(id)
      return nom === undefined ? [] : [nom]
    }),
  )
}

/** Nom du ministère porteur, s'il est lisible. */
export function nomDuMinistere(
  ministereId: string,
  ministeres: readonly MinistereListe[],
): string | null {
  return ministeres.find((ministere) => ministere.id === ministereId)?.nom ?? null
}
