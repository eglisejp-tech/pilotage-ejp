import { vi } from 'vitest'

/**
 * Simule une fenêtre de `largeur` pixels pour les composants qui lisent matchMedia
 * (« (min-width: 600px) »). À annuler avec vi.unstubAllGlobals().
 */
export function simulerLargeur(largeur: number) {
  vi.stubGlobal('matchMedia', (requete: string) => {
    const minimum = Number(/min-width:\s*(\d+)px/.exec(requete)?.[1] ?? 0)
    return {
      matches: largeur >= minimum,
      media: requete,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }
  })
}
