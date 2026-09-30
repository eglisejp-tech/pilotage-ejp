import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { exempleCetteSemaine } from './exemple'
import { OuvertureSemaine } from './OuvertureSemaine'

describe('OuvertureSemaine', () => {
  it('surligne seulement la partie « À décider » de la phrase du berger', () => {
    const { semaine, phrase, ligneSecondaire } = exempleCetteSemaine('berger')
    const { container } = render(
      <OuvertureSemaine
        semaine={semaine}
        phrase={phrase}
        ligneSecondaire={ligneSecondaire}
        surligner
      />,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et un point attend votre décision.",
    )
    const surligneurs = container.querySelectorAll('mark')
    expect(surligneurs).toHaveLength(1)
    expect(surligneurs[0]).toHaveTextContent(/^un point attend votre décision$/)
    expect(surligneurs[0]).toHaveClass('a-decider')
  })

  it("donne le numéro de semaine en une phrase aux lecteurs d'écran", () => {
    const { semaine, phrase } = exempleCetteSemaine('berger')
    render(<OuvertureSemaine semaine={semaine} phrase={phrase} surligner />)
    expect(screen.getByText('Semaine 39, du 21 au 27 sept.')).toHaveClass('sr-only')
  })

  it('ne surligne rien pour un profil sans « À décider », même si la phrase le demande', () => {
    const { semaine } = exempleCetteSemaine('admin_eglise')
    const { container } = render(
      <OuvertureSemaine
        semaine={semaine}
        phrase={[{ texte: 'Un point ' }, { texte: 'attend', aDecider: true }, { texte: '.' }]}
        surligner={false}
      />,
    )
    expect(container.querySelector('mark')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Un point attend.')
  })
})
