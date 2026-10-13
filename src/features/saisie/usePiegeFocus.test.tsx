import { render, screen } from '@testing-library/react'
import { StrictMode, useRef } from 'react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'

function Fenetre({ actif = true, children }: { actif?: boolean; children?: ReactNode }) {
  const racine = useRef<HTMLDivElement>(null)
  usePiegeFocus(racine, actif, () => undefined)
  return (
    <div ref={racine} role="dialog" aria-label="Fenêtre" tabIndex={-1}>
      {children}
    </div>
  )
}

function Page({ ouverte, actif }: { ouverte: boolean; actif?: boolean }) {
  return (
    <StrictMode>
      <button type="button">Ouvrir</button>
      {ouverte ? (
        <Fenetre actif={actif}>
          <input aria-label="Champ" />
        </Fenetre>
      ) : null}
    </StrictMode>
  )
}

// L'application tourne sous StrictMode en développement (et dans les parcours Playwright) : chaque
// effet est monté, démonté puis remonté. Le focus doit tout de même revenir à l'élément d'origine.
describe('usePiegeFocus sous StrictMode', () => {
  it('le focus entre dans la fenêtre, puis revient au bouton d’origine à la fermeture', () => {
    const { rerender } = render(<Page ouverte={false} />)
    const ouvrir = screen.getByRole('button', { name: 'Ouvrir' })
    ouvrir.focus()
    rerender(<Page ouverte />)
    expect(screen.getByRole('dialog', { name: 'Fenêtre' })).toHaveFocus()
    rerender(<Page ouverte={false} />)
    expect(ouvrir).toHaveFocus()
  })

  it('devenue fenêtre pendant la frappe, elle laisse le focus au champ', () => {
    const { rerender } = render(<Page ouverte actif={false} />)
    const champ = screen.getByRole('textbox', { name: 'Champ' })
    champ.focus()
    rerender(<Page ouverte actif />)
    expect(champ).toHaveFocus()
    rerender(<Page ouverte actif={false} />)
    expect(champ).toHaveFocus()
  })
})
