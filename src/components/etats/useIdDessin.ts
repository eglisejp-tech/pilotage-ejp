import { useId } from 'react'

/** Identifiant d'un dégradé, utilisable dans `url(#...)` : sans les signes que met useId. */
export function useIdDessin(): string {
  return `dessin-${useId().replace(/[^\w-]/g, '')}`
}
