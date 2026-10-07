import type { QueryClient } from '@tanstack/react-query'

/**
 * Clés de requête de la configuration des indicateurs. Le lot L3b, qui écrit (ajouter, corriger,
 * remplacer, retirer), relit tout par `invaliderConfiguration` après chaque écriture : les deux
 * écrans partagent les mêmes lectures, une seule fois en mémoire.
 */
export const CLES_CONFIGURATION = {
  racine: ['indicateurs', 'configuration'],
  ministeres: ['indicateurs', 'configuration', 'ministeres'],
  indicateurs: ['indicateurs', 'configuration', 'indicateurs'],
  usage: ['indicateurs', 'configuration', 'usage'],
  catalogue: ['indicateurs', 'configuration', 'catalogue'],
  creations: ['indicateurs', 'configuration', 'creations'],
  changements: ['indicateurs', 'configuration', 'changements'],
} as const

/** Relit les lectures des deux écrans, et celles que l'écriture a pu changer (fiches, usage). */
export async function invaliderConfiguration(client: QueryClient): Promise<void> {
  await client.invalidateQueries({ queryKey: CLES_CONFIGURATION.racine })
}
