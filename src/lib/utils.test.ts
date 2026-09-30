import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it("garde une taille de texte des tokens à côté d'une couleur des tokens", () => {
    expect(cn('text-note text-encre-3')).toBe('text-note text-encre-3')
  })

  it('fusionne deux tailles ou deux couleurs des tokens', () => {
    expect(cn('text-note text-texte')).toBe('text-texte')
    expect(cn('text-encre text-encre-3')).toBe('text-encre-3')
    expect(cn('bg-fond bg-papier')).toBe('bg-papier')
  })

  it('reconnaît les espacements, polices et largeurs des tokens', () => {
    expect(cn('px-4 px-marge')).toBe('px-marge')
    expect(cn('h-10 h-cible')).toBe('h-cible')
    expect(cn('font-interface font-lecture')).toBe('font-lecture')
    expect(cn('max-w-prose max-w-contenu')).toBe('max-w-contenu')
  })
})
