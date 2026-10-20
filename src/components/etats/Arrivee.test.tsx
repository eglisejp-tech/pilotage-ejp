import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arrivee } from '@/components/etats/Arrivee'
import { DUREE_FONDU_MS, FIN_DU_FONDU_MS } from '@/components/etats/tempsChargement'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Un élément est-il sous une enveloppe qui anime encore (classe ou attribut du fondu) ? */
function sousUnFondu(element: HTMLElement) {
  return element.closest('[data-arrivee], .arrivee, .arrivee-sections, .arrivee-suite') !== null
}

function Liste({ lignes, mode }: { lignes: string[]; mode?: 'contenu' | 'sections' | 'suite' }) {
  return (
    <section>
      <Arrivee fondu mode={mode}>
        {lignes.length === 0 ? <p>Rien à valider.</p> : null}
        {lignes.map((ligne) => (
          <p key={ligne}>{ligne}</p>
        ))}
      </Arrivee>
    </section>
  )
}

describe('Arrivee (T65 : le fondu ne joue qu’une fois)', () => {
  it('le contenu arrive en fondu, puis l’enveloppe perd sa classe sans rien remonter', () => {
    render(<Liste lignes={['Projets en cours']} />)
    const ligne = screen.getByText('Projets en cours')
    expect(ligne.parentElement).toHaveClass('arrivee')
    expect(ligne.parentElement).toHaveAttribute('data-arrivee', 'contenu')
    act(() => vi.advanceTimersByTime(DUREE_FONDU_MS))
    expect(sousUnFondu(ligne)).toBe(true)
    act(() => vi.advanceTimersByTime(FIN_DU_FONDU_MS - DUREE_FONDU_MS))
    // Le même élément, toujours sans boîte, mais sans fondu.
    expect(screen.getByText('Projets en cours')).toBe(ligne)
    expect(ligne.parentElement).toHaveClass('contents')
    expect(sousUnFondu(ligne)).toBe(false)
  })

  for (const mode of ['contenu', 'sections', 'suite'] as const) {
    it(`mode ${mode} : un changement après l’arrivée ne relance aucun fondu`, () => {
      const { rerender } = render(<Liste lignes={['Projets en cours']} mode={mode} />)
      act(() => vi.advanceTimersByTime(FIN_DU_FONDU_MS))
      // La dernière demande validée : « Rien à valider. » apparaît sous l'enveloppe, sans fondu.
      rerender(<Liste lignes={[]} mode={mode} />)
      expect(sousUnFondu(screen.getByText('Rien à valider.'))).toBe(false)
    })
  }

  it('sans fondu : le contenu tel quel, sans enveloppe', () => {
    render(
      <section>
        <Arrivee fondu={false}>
          <p>Projets en cours</p>
        </Arrivee>
      </section>,
    )
    expect(screen.getByText('Projets en cours').parentElement?.tagName).toBe('SECTION')
  })
})
