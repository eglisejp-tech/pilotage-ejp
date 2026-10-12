import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Cache de requêtes neuf pour un test de composant. Les boutons d'un point (`ActionsPoint`)
 * relisent les lectures de la page après une écriture : ils ont besoin du cache, comme dans
 * l'application (`main.tsx`). Aucune relance en cas d'échec : un test n'attend pas la seconde.
 */
export function AvecRequetes({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
