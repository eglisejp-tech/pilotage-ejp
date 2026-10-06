import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ChampNombre } from '@/features/saisie/ChampNombre'

function Champ({
  depart = '10',
  ...reste
}: { depart?: string } & Partial<Parameters<typeof ChampNombre>[0]>) {
  const [valeur, setValeur] = useState(depart)
  return (
    <ChampNombre
      id="service"
      libelle="STARs au service ce dimanche"
      valeur={valeur}
      onChange={setValeur}
      max={9999}
      {...reste}
    />
  )
}

describe('ChampNombre', () => {
  it('relie le libellé au champ numérique', () => {
    render(<Champ />)
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    expect(champ).toHaveValue('10')
    expect(champ).toHaveAttribute('inputmode', 'numeric')
  })

  it('« Ajouter un » et « Retirer un » changent la valeur de un, jamais sous 0', async () => {
    const utilisateur = userEvent.setup()
    render(<Champ depart="1" />)
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    const plus = screen.getByRole('button', { name: 'Ajouter un : STARs au service ce dimanche' })
    const moins = screen.getByRole('button', { name: 'Retirer un : STARs au service ce dimanche' })
    await utilisateur.click(plus)
    expect(champ).toHaveValue('2')
    await utilisateur.click(moins)
    await utilisateur.click(moins)
    await utilisateur.click(moins)
    expect(champ).toHaveValue('0')
  })

  it('deux champs du même formulaire ont des boutons « plus » et « moins » distincts', () => {
    render(
      <>
        <Champ />
        <Champ id="actifs" libelle="STARs actifs" />
      </>,
    )
    const noms = screen.getAllByRole('button').map((bouton) => bouton.getAttribute('aria-label'))
    expect(new Set(noms).size).toBe(4)
  })

  it('n’accepte que des chiffres et garde un champ vide vide', async () => {
    const utilisateur = userEvent.setup()
    render(<Champ depart="" />)
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    expect(champ).toHaveValue('')
    await utilisateur.type(champ, 'a1b2')
    expect(champ).toHaveValue('12')
  })

  it('en variante compacte : pas de boutons plus et moins', () => {
    render(<Champ variante="compact" />)
    expect(screen.queryByRole('button', { name: /^Ajouter un/ })).toBeNull()
    expect(screen.getByLabelText('STARs au service ce dimanche')).toBeInTheDocument()
  })

  it('relie définition, note et erreur au champ (aria-describedby, aria-invalid)', () => {
    render(
      <Champ
        definition="Les STARs qui ont servi."
        note="Dimanche dernier : 9"
        erreur="Entre 0 et 9 999."
      />,
    )
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    expect(champ).toHaveAttribute('aria-invalid', 'true')
    const decrit = (champ.getAttribute('aria-describedby') ?? '').split(' ')
    expect(decrit).toHaveLength(3)
    expect(document.getElementById(decrit[0] ?? '')).toHaveTextContent('Les STARs qui ont servi.')
    expect(document.getElementById(decrit[2] ?? '')).toHaveTextContent('Entre 0 et 9 999.')
  })

  it('pose l’aide à côté du libellé, hors du <label>', () => {
    render(<Champ aide="dimanche.service" />)
    const aide = screen.getByRole('button', { name: 'Aide : STARs au service ce dimanche' })
    expect(aide.closest('label')).toBeNull()
  })

  it('écrit le suffixe de l’unité sans le lire deux fois', () => {
    render(<Champ suffixe="€" />)
    expect(screen.getByText('€')).toHaveAttribute('aria-hidden', 'true')
  })
})
