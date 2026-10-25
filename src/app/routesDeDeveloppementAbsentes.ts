import type { RouteObject } from 'react-router'

// Remplace src/app/routesDeDeveloppement.tsx au build (alias de vite.config.ts) : aucune route
// d'aperçu en production, et aucun de leurs modules dans le bundle.
export const routesDeDeveloppement: RouteObject[] = []
