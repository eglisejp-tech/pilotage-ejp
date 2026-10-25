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

  it('reconnaît les tailles par rôle, les espacements et la largeur des fondations (T69)', () => {
    expect(cn('text-interface text-encre-3')).toBe('text-interface text-encre-3')
    expect(cn('text-[15px] text-interface')).toBe('text-interface')
    expect(cn('text-titre-point text-citation')).toBe('text-citation')
    expect(cn('gap-12 gap-sections')).toBe('gap-sections')
    expect(cn('max-w-[720px] max-w-lecture')).toBe('max-w-lecture')
  })
})
