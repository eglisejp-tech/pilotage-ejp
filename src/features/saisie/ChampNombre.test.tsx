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

const proprietes = (valeur: string): Parameters<typeof ChampNombre>[0] => ({
  id: 'service',
  libelle: 'STARs au service ce dimanche',
  valeur,
  onChange: () => undefined,
  max: 9999,
})

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

  it('garde un champ vide vide', () => {
    render(<Champ depart="" />)
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    expect(champ).toHaveValue('')
    expect(champ).not.toHaveAttribute('aria-invalid')
  })

  it.each(['12,5', '12.5', '1 2', '12a'])(
    'garde « %s » tel quel et explique sous le champ, sans jamais le réécrire (m100)',
    async (texte) => {
      const utilisateur = userEvent.setup()
      render(<Champ depart="" />)
      const champ = screen.getByLabelText('STARs au service ce dimanche')
      await utilisateur.type(champ, texte)
      expect(champ).toHaveValue(texte)
      expect(champ).toHaveAttribute('aria-invalid', 'true')
      expect(champ).toHaveAccessibleDescription(
        'Saisissez un nombre entier, sans virgule ni lettre.',
      )
      // Une seule consigne : celle qu'on voit sous le champ, qui est aussi dans la région annoncée
      // (elle arrive pendant la frappe). Un lecteur d'écran ne la lit pas deux fois.
      const consignes = screen.getAllByText('Saisissez un nombre entier, sans virgule ni lettre.')
      expect(consignes).toHaveLength(1)
      expect(consignes[0]?.closest('[aria-live="polite"]')).not.toBeNull()
      expect(champ.getAttribute('aria-describedby')?.split(' ')).toContain(consignes[0]?.id)
      // Les boutons plus et moins n'agissent pas sur un texte à corriger.
      const plus = screen.getByRole('button', { name: 'Ajouter un : STARs au service ce dimanche' })
      expect(plus).toHaveAttribute('aria-disabled', 'true')
      await utilisateur.click(plus)
      expect(champ).toHaveValue(texte)
    },
  )

  it('la consigne disparaît dès que le champ contient un nombre entier ; « 1 000 » en est un', async () => {
    const utilisateur = userEvent.setup()
    render(<Champ depart="" />)
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    await utilisateur.type(champ, '12,')
    expect(champ).toHaveAccessibleDescription('Saisissez un nombre entier, sans virgule ni lettre.')
    await utilisateur.type(champ, '{Backspace}')
    expect(champ).toHaveValue('12')
    expect(screen.queryByText('Saisissez un nombre entier, sans virgule ni lettre.')).toBeNull()
    await utilisateur.clear(champ)
    await utilisateur.type(champ, '1 000')
    expect(champ).not.toHaveAttribute('aria-invalid')
  })

  it('0 et le vide sont des saisies valides ; « Retirer un » est inactif à 0', async () => {
    const utilisateur = userEvent.setup()
    render(<Champ depart="0" />)
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    expect(champ).not.toHaveAttribute('aria-invalid')
    const moins = screen.getByRole('button', { name: 'Retirer un : STARs au service ce dimanche' })
    expect(moins).toHaveAttribute('aria-disabled', 'true')
    await utilisateur.click(moins)
    expect(champ).toHaveValue('0')
  })

  it('au plafond, « Ajouter un » se dit inactif et garde le focus ; « Retirer un » reste actif', async () => {
    const utilisateur = userEvent.setup()
    render(<Champ depart="9998" />)
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    const plus = screen.getByRole('button', { name: 'Ajouter un : STARs au service ce dimanche' })
    expect(plus).not.toHaveAttribute('aria-disabled')
    await utilisateur.click(plus)
    expect(champ).toHaveValue('9999')
    expect(plus).toHaveAttribute('aria-disabled', 'true')
    expect(plus).toHaveFocus()
    await utilisateur.click(plus)
    expect(champ).toHaveValue('9999')
    expect(
      screen.getByRole('button', { name: 'Retirer un : STARs au service ce dimanche' }),
    ).not.toHaveAttribute('aria-disabled')
  })

  it('la consigne de format passe avant une erreur reçue (borne, refus)', () => {
    render(<ChampNombre {...proprietes('12,5')} erreur="Entre 0 et 9 999." />)
    expect(screen.getByLabelText('STARs au service ce dimanche')).toHaveAccessibleDescription(
      'Saisissez un nombre entier, sans virgule ni lettre.',
    )
    expect(screen.queryByText('Entre 0 et 9 999.')).toBeNull()
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

  it('relie aussi la mention, la phrase « déjà saisi » et les éléments donnés par decritAussi', () => {
    render(
      <>
        <p id="message-groupe">Le message du groupe.</p>
        <Champ
          mention="À valider par EJP Tech."
          dejaSaisi="Déjà saisi : 10."
          decritAussi="message-groupe"
          invalide
        />
      </>,
    )
    const champ = screen.getByLabelText('STARs au service ce dimanche')
    // Sans message à lui, le champ est tout de même marqué en erreur.
    expect(champ).toHaveAttribute('aria-invalid', 'true')
    expect(champ).toHaveAccessibleDescription(
      'À valider par EJP Tech. Déjà saisi : 10. Le message du groupe.',
    )
  })

  it('le nombre domine : 112 px, réduit seulement au-delà de 3 chiffres', () => {
    const { rerender } = render(<ChampNombre {...proprietes('120')} />)
    expect(screen.getByLabelText('STARs au service ce dimanche')).toHaveClass('text-[112px]')
    rerender(<ChampNombre {...proprietes('1200')} />)
    expect(screen.getByLabelText('STARs au service ce dimanche')).toHaveClass('text-[84px]')
    rerender(<ChampNombre {...proprietes('1 000')} />)
    expect(screen.getByLabelText('STARs au service ce dimanche')).toHaveClass('text-[64px]')
  })

  it('un texte à corriger se réduit pour tenir entre les boutons, à 360 px comme à 390 px', () => {
    const { rerender } = render(<ChampNombre {...proprietes('12,5')} />)
    const champ = () => screen.getByLabelText('STARs au service ce dimanche')
    expect(champ()).toHaveClass('text-[56px]')
    rerender(<ChampNombre {...proprietes('1250,5')} />)
    expect(champ()).toHaveClass('text-[40px]')
    // La bordure d'erreur ne touche pas les boutons : une marge entre le champ et chacun d'eux.
    expect(champ().parentElement).toHaveClass('px-1.5')
  })

  it('une erreur reçue à l’envoi est lue avec le champ, pas annoncée par une région', () => {
    render(<ChampNombre {...proprietes('12000')} erreur="Entre 0 et 9 999." />)
    expect(screen.getByText('Entre 0 et 9 999.').closest('[aria-live]')).toBeNull()
    expect(screen.getByLabelText('STARs au service ce dimanche')).toHaveAccessibleDescription(
      'Entre 0 et 9 999.',
    )
  })

  it('« moins » est un carré bordé, « plus » est plein (maquette 08)', () => {
    render(<Champ />)
    expect(
      screen.getByRole('button', { name: 'Retirer un : STARs au service ce dimanche' }),
    ).toHaveClass('border', 'border-encre', 'bg-papier')
    expect(
      screen.getByRole('button', { name: 'Ajouter un : STARs au service ce dimanche' }),
    ).toHaveClass('bg-encre')
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
