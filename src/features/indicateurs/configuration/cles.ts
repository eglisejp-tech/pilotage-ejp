import type { QueryClient } from '@tanstack/react-query'
import { RACINE_SAISIE_CHIFFRES } from '@/features/saisie-chiffres/useSaisieDimanche'

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

/** Relit les lectures des deux écrans de configuration, et elles seules. */
export async function invaliderConfiguration(client: QueryClient): Promise<void> {
  await client.invalidateQueries({ queryKey: CLES_CONFIGURATION.racine })
}

/**
 * Relit tout ce qu'une écriture sur les indicateurs d'un ministère change : les deux écrans de
 * configuration, la fiche du ministère (`useFiche`) et la liste de ses saisies (accueil et
 * formulaires de saisie des chiffres). À appeler après chaque écriture, ici et dans le lot L3b :
 * il n'y a rien à deviner.
 */
export async function invaliderApresEcriture(
  client: QueryClient,
  ministereId: string,
): Promise<void> {
  await Promise.all([
    invaliderConfiguration(client),
    client.invalidateQueries({ queryKey: ['fiche', ministereId] }),
    client.invalidateQueries({ queryKey: [RACINE_SAISIE_CHIFFRES, 'indicateurs', ministereId] }),
  ])
}
