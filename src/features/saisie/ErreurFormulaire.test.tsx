import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErreurCompte } from '@/data/comptes'
import { referenceEchec } from '@/data/echecEnvoi'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

// La ligne de référence d'un échec technique (T76) : « Référence pour EJP Tech : K7Q4MX » pour un
// ministère, « Référence : K7Q4MX » sur un écran d'EJP Tech (conception 4.3), lue d'un coup d'œil
// et épelée au lecteur d'écran.

describe('ErreurFormulaire : la référence (T76)', () => {
  it('sous la phrase, « Référence pour EJP Tech : », la référence visible d’un bloc et épelée à part', () => {
    render(<ErreurFormulaire message="La connexion a échoué." reference="K7Q4MX" />)
    const alerte = screen.getByRole('alert')
    expect(alerte).toHaveTextContent('La connexion a échoué. Référence pour EJP Tech : K7Q4MX')
    const visible = screen.getByText('K7Q4MX')
    expect(visible).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('K 7 Q 4 M X')).toHaveClass('sr-only')
  })

  it('écran d’EJP Tech : « Référence : »', () => {
    render(<ErreurFormulaire message="L'action n'a pas abouti." reference="K7Q4MX" ecranEjpTech />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      "L'action n'a pas abouti. Référence : K7Q4MX",
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent('pour EJP Tech')
  })

  it('sans référence (refus dit par la base) : la phrase seule', () => {
    render(<ErreurFormulaire message="Cette date est passée." reference={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Cette date est passée\.$/)
  })
})

describe('referenceEchec', () => {
  it('un refus de la base n’a pas de référence ; un échec technique en a une', () => {
    expect(
      referenceEchec({ code: 'P0001', message: 'La date ne peut pas être passée.' }),
    ).toBeNull()
    expect(referenceEchec(new TypeError('Failed to fetch'))).toMatch(/^[2-9A-HJKMNP-Z]{6}$/)
  })

  it('une erreur traduite qui porte sa référence (comptes) la garde', () => {
    expect(referenceEchec(new ErreurCompte('connexion', 'K7Q4MX'))).toBe('K7Q4MX')
    expect(referenceEchec(new ErreurCompte('erreur_interne', 'K7Q4MX'))).toBe('K7Q4MX')
    // Un refus dit par la fonction n'en montre pas.
    expect(referenceEchec(new ErreurCompte('adresse_deja_utilisee', 'K7Q4MX'))).toBeNull()
  })
})
