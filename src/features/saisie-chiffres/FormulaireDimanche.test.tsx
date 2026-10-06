import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { etatApercuDimanche } from '@/features/saisie-chiffres/apercu/etatsApercu'
import { FormulaireDimanche } from '@/features/saisie-chiffres/FormulaireDimanche'

const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

function afficher(etat: string | null, enregistrer = vi.fn(() => Promise.resolve())) {
  const apercu = etatApercuDimanche(etat)
  if (apercu.etat !== 'pret') throw new Error('état d’aperçu sans formulaire')
  render(
    <MemoryRouter>
      <FormulaireDimanche
        dimanche={apercu.dimanche}
        matin={apercu.matin}
        champs={apercu.champs}
        proposes={apercu.proposes}
        enregistrer={enregistrer}
      />
    </MemoryRouter>,
  )
  return enregistrer
}

const service = () => screen.getByLabelText('STARs au service ce dimanche', { exact: true })
const enregistrerLesChiffres = () =>
  screen.getByRole('button', { name: 'Enregistrer les chiffres' })

describe('FormulaireDimanche (maquette 08)', () => {
  it('les trois communs, leurs notes, et quatre aides au plus', () => {
    afficher(null)
    expect(service()).toHaveValue('')
    expect(screen.getByLabelText('STARs actifs', { exact: true })).toHaveValue('14')
    expect(screen.getByLabelText('Dont en FIJ', { exact: true })).toHaveValue('11')
    expect(screen.getByText('Dimanche dernier : 9')).toBeInTheDocument()
    expect(screen.getByText('Saisi le 24 sept.')).toBeInTheDocument()
    // Espace fine insécable entre le nombre et « % » (BRIEF, « Formats »).
    expect(screen.getByText(/^79\s% des actifs$/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(4)
    expect(
      screen.getByRole('button', { name: 'Aide : Indicateurs du ministère' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Les STARs qui ont servi dans votre ministère ce dimanche. Si personne n'a servi, enregistrez 0.",
      ),
    ).toBeInTheDocument()
  })

  it('le pourcentage des actifs se calcule en direct, il ne se saisit pas', async () => {
    const utilisateur = userEvent.setup()
    afficher(null)
    const actifs = screen.getByLabelText('STARs actifs', { exact: true })
    await utilisateur.clear(actifs)
    await utilisateur.type(actifs, '22')
    expect(screen.getByText(/^50\s% des actifs$/)).toBeInTheDocument()
  })

  it('les STARs au service manquent : le message sous le champ, le focus y va, rien ne part', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher(null)
    await utilisateur.click(enregistrerLesChiffres())
    expect(screen.getByText('Saisissez un nombre.')).toBeInTheDocument()
    expect(service()).toHaveFocus()
    expect(service()).toHaveAttribute('aria-invalid', 'true')
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('un envoi : toutes les valeurs en un appel, puis « Chiffres du dimanche 27 sept. enregistrés. »', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher(null)
    await utilisateur.type(service(), '10')
    await utilisateur.type(screen.getByLabelText('Heures', { exact: true }), '12')
    await utilisateur.type(screen.getByLabelText('Minutes', { exact: true }), '30')
    await utilisateur.click(enregistrerLesChiffres())
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(enregistrer).toHaveBeenCalledWith([
      { indicateurId: 'commun-service', valeur: 10 },
      { indicateurId: 'commun-actifs', valeur: 14 },
      { indicateurId: 'commun-en-fij', valeur: 11 },
      { indicateurId: 'propre-heure-fin', valeur: 750 },
      { indicateurId: 'propre-abonnes', valeur: 1250 },
    ])
    expect(
      await screen.findByText('Chiffres du dimanche 27 sept. enregistrés.'),
    ).toBeInTheDocument()
    // Un second appui sur la même saisie n'envoie rien, et le dit.
    await utilisateur.click(enregistrerLesChiffres())
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(
      screen.getByText('Cette saisie est déjà enregistrée. Changez un chiffre pour la corriger.'),
    ).toBeInTheDocument()
  })

  it('une coupure : la phrase de LISEZMOI sous le bouton, les valeurs restent', async () => {
    const utilisateur = userEvent.setup()
    afficher(
      null,
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await utilisateur.type(service(), '8')
    await utilisateur.click(enregistrerLesChiffres())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez.',
    )
    expect(service()).toHaveValue('8')
  })

  it('une correction : « Déjà saisi » sous le champ, la valeur reprise et « Enregistrer la correction »', () => {
    afficher('correction')
    expect(service()).toHaveValue('10')
    expect(
      screen.getByText(
        'Déjà saisi : 10, le 27 sept. à 12 h 41. Votre saisie la remplacera dans les totaux.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer la correction' })).toBeInTheDocument()
  })

  it('un ajout à valider se saisit déjà, avec sa mention visible', () => {
    afficher(null)
    expect(screen.getByLabelText('Abonnés à ce jour', { exact: true })).toHaveValue('1250')
    expect(
      screen.getByText('À valider par EJP Tech. Vous pouvez déjà le saisir.'),
    ).toBeInTheDocument()
  })

  it('« Choisir un autre dimanche » ouvre les 4 derniers dimanches', async () => {
    const utilisateur = userEvent.setup()
    afficher('correction')
    await utilisateur.click(screen.getByRole('button', { name: 'Choisir un autre dimanche' }))
    const liens = within(screen.getByRole('list')).getAllByRole('link')
    expect(liens.map((lien) => lien.textContent)).toEqual([
      'Dimanche 27 sept. (déjà saisi)',
      'Dimanche 20 sept. (déjà saisi)',
      'Dimanche 13 sept.',
      'Dimanche 6 sept.',
    ])
    expect(liens[0]).toHaveAttribute('aria-current', 'page')
    expect(liens[1]).toHaveAttribute('href', '/saisir/dimanche?date=2026-09-20')
  })

  it('le dimanche matin : la phrase visible, seul l’indicateur du matin', () => {
    afficher('matin')
    expect(
      screen.getByText('Avant 12 h, ce dimanche reçoit seulement les chiffres saisis le matin.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('STARs au service ce dimanche')).toBeNull()
    expect(screen.getByLabelText('Présents la nuit de prière', { exact: true })).toBeInTheDocument()
  })

  it('le lien « Signaler une difficulté » est en bas, sous le bouton, et aucun tiret', () => {
    afficher(null)
    const lien = screen.getByRole('link', { name: 'Signaler une difficulté' })
    expect(lien).toHaveAttribute('href', '/signaler?ecran=saisie_dimanche')
    expect(document.body.textContent).not.toMatch(TIRETS)
  })
})
