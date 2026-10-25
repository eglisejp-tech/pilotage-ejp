import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { GabaritPage } from '@/components/ui/GabaritPage'

describe('EnTetePage et GabaritPage (proposition 14)', () => {
  it('titre, phrase à la largeur de lecture, action ; un seul écart entre les sections', () => {
    const { container } = render(
      <GabaritPage>
        <EnTetePage
          titre="Ministères et comptes"
          phrase="Les comptes des ministères."
          action={<button type="button">Ajouter un ministère</button>}
        />
        <section>Ministères</section>
      </GabaritPage>,
    )
    expect(container.firstElementChild).toHaveClass('flex', 'flex-col', 'gap-sections')
    expect(screen.getByRole('heading', { level: 1, name: 'Ministères et comptes' })).toHaveClass(
      'font-lecture',
      'text-titre',
    )
    expect(screen.getByText('Les comptes des ministères.')).toHaveClass('max-w-lecture')
    expect(screen.getByRole('button', { name: 'Ajouter un ministère' })).toBeInTheDocument()
  })

  it('sans phrase, pas de paragraphe ; un titre qui reçoit le focus par programme', () => {
    const titre = createRef<HTMLHeadingElement>()
    const { container } = render(<EnTetePage titre="Journal" titreRef={titre} />)
    expect(container.querySelector('p')).toBeNull()
    expect(titre.current).toHaveAttribute('tabindex', '-1')
  })
})
