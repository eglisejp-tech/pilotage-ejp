import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { LigneSignalement } from '@/data/signalements'
import type { ContenuMesSignalements } from '@/features/signalement/MesSignalements'
import { PanneauSignalement } from '@/features/signalement/PanneauSignalement'
import type { Signalement } from '@/features/signalement/schemas'
import type { EcranSignalement } from '@/lib/base'

type Envoi = (signalement: Signalement) => Promise<void>

const RAPPEL =
  "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech."

const OUVERT: LigneSignalement = {
  id: '43000000-0000-4000-8000-000000000001',
  ministere_id: '10000000-0000-4000-8000-000000000001',
  ministere_nom: 'Communication',
  ecran: 'saisie_evenement',
  texte: 'Le formulaire refuse la date de notre soirée.',
  saisi_le: '2026-10-02T18:40:00+02:00',
  suivi_id: null,
  commentaire: null,
  clos_le: null,
  ouvert: true,
  clos_recent: false,
}

const CLOS: LigneSignalement = {
  ...OUVERT,
  id: '43000000-0000-4000-8000-000000000002',
  ecran: 'saisie_dimanche',
  texte: '[texte masqué par EJP Tech]',
  saisi_le: '2026-09-27T13:10:00+02:00',
  suivi_id: '43000000-0000-4000-8000-000000000011',
  commentaire: 'Réglé : le champ attendait un nombre entier.',
  // 0 h 30 à Paris le 30 sept., 22 h 30 UTC le 29 : le jour affiché est celui de Paris.
  clos_le: '2026-09-29T22:30:00Z',
  ouvert: false,
  clos_recent: true,
}

function afficher({
  ecran = 'saisie_evenement',
  envoyer = vi.fn<Envoi>(() => Promise.resolve()),
  mesSignalements = { etat: 'liste', signalements: [] },
  onFermer = vi.fn(),
}: {
  ecran?: EcranSignalement
  envoyer?: Envoi
  mesSignalements?: ContenuMesSignalements
  onFermer?: () => void
} = {}) {
  render(
    <MemoryRouter>
      <PanneauSignalement
        ecran={ecran}
        envoyer={envoyer}
        mesSignalements={mesSignalements}
        onFermer={onFermer}
        surtitre="Ministère Communication"
      />
    </MemoryRouter>,
  )
  return { envoyer, onFermer }
}

const champ = () => screen.getByLabelText('Quelle difficulté rencontrez-vous ?')
const envoyerLeFormulaire = () =>
  userEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))

describe('« Signaler une difficulté »', () => {
  it('titre, qui lit, écran prérempli, rappel sous le champ et compteur « 0 sur 280 »', () => {
    afficher()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Signaler une difficulté')
    expect(
      screen.getByText(
        'EJP Tech lit votre signalement. Décrivez ce qui vous bloque en une ou deux phrases.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Écran concerné : Ajouter un événement')).toBeInTheDocument()
    expect(champ()).toHaveAccessibleDescription(`${RAPPEL} 0 sur 280`)
    // Le rappel n'apparaît qu'une fois.
    expect(screen.getAllByText(RAPPEL)).toHaveLength(1)
    expect(screen.queryByText(/administration|berger|conseil/i)).toBeNull()
  })

  it('« autre » : « Écran concerné : Autre écran »', () => {
    afficher({ ecran: 'autre' })
    expect(screen.getByText('Écran concerné : Autre écran')).toBeInTheDocument()
  })

  it('le compteur suit le texte et passe en alerte au-delà de 280', async () => {
    afficher()
    await userEvent.type(champ(), 'Bonjour')
    expect(screen.getByText('7 sur 280')).toHaveClass('text-encre-3')
    await userEvent.clear(champ())
    await userEvent.click(champ())
    await userEvent.paste('a'.repeat(281))
    expect(screen.getByText('281 sur 280')).toHaveClass('text-alerte')
    await envoyerLeFormulaire()
    expect(await screen.findByText('Le signalement dépasse 280 caractères.')).toBeInTheDocument()
  })

  it('moins de 10 caractères : l’erreur sous le champ, rien n’est envoyé', async () => {
    const { envoyer } = afficher()
    await userEvent.type(champ(), 'Bloqué')
    await envoyerLeFormulaire()
    expect(
      await screen.findByText('Décrivez la difficulté (10 caractères au moins).'),
    ).toBeInTheDocument()
    expect(champ()).toHaveAttribute('aria-invalid', 'true')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('envoi réussi : l’écran et le texte partent, « Signalement envoyé. EJP Tech le lira. », champ vidé', async () => {
    const { envoyer } = afficher()
    await userEvent.type(champ(), '  Je ne peux pas choisir la date.  ')
    await envoyerLeFormulaire()
    expect(await screen.findByText('Signalement envoyé. EJP Tech le lira.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({
      ecran: 'saisie_evenement',
      texte: 'Je ne peux pas choisir la date.',
    })
    expect(champ()).toHaveValue('')
  })

  it('refus de la base (donnée personnelle) : son message sous le champ, texte gardé', async () => {
    const envoyer = vi.fn<Envoi>(() =>
      Promise.reject({
        code: 'P0001',
        message: "N'écrivez aucun nom ni information personnelle.",
      }),
    )
    afficher({ envoyer })
    await userEvent.type(champ(), 'Appelez le 06 12 34 56 78')
    await envoyerLeFormulaire()
    expect(
      await screen.findByText("N'écrivez aucun nom ni information personnelle."),
    ).toBeInTheDocument()
    await waitFor(() => expect(champ()).toHaveFocus())
    expect(champ()).toHaveValue('Appelez le 06 12 34 56 78')
  })

  it('connexion perdue : l’erreur de formulaire sous le bouton, texte gardé', async () => {
    afficher({ envoyer: vi.fn<Envoi>(() => Promise.reject(new TypeError('Failed to fetch'))) })
    await userEvent.type(champ(), 'Je ne peux pas choisir la date.')
    await envoyerLeFormulaire()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre message est encore dans le formulaire : réessayez.',
    )
    expect(champ()).toHaveValue('Je ne peux pas choisir la date.')
  })

  it('après l’envoi le bouton dit « Fermer », puis « Annuler » dès qu’on écrit de nouveau', async () => {
    const { onFermer } = afficher()
    await userEvent.type(champ(), 'Je ne peux pas choisir la date.')
    await envoyerLeFormulaire()
    await screen.findByText('Signalement envoyé. EJP Tech le lira.')
    expect(screen.queryByRole('button', { name: 'Annuler' })).toBeNull()
    await userEvent.type(champ(), 'Autre')
    expect(screen.queryByRole('button', { name: 'Fermer' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onFermer).toHaveBeenCalled()
  })

  it('« Annuler » ferme sans rien envoyer', async () => {
    const { envoyer, onFermer } = afficher()
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onFermer).toHaveBeenCalled()
    expect(envoyer).not.toHaveBeenCalled()
  })
})

describe('« Vos derniers signalements »', () => {
  it('premier usage : rien sous le formulaire', () => {
    afficher({ mesSignalements: { etat: 'liste', signalements: [] } })
    expect(screen.queryByRole('heading', { name: 'Vos derniers signalements' })).toBeNull()
  })

  it('pendant la lecture : rien non plus', () => {
    afficher({ mesSignalements: { etat: 'chargement' } })
    expect(screen.queryByRole('heading', { name: 'Vos derniers signalements' })).toBeNull()
  })

  it('« Ouvert », ou « Clos le 30 sept. » (jour de Paris) avec la réponse d’EJP Tech', () => {
    afficher({ mesSignalements: { etat: 'liste', signalements: [OUVERT, CLOS] } })
    const liste = screen.getByRole('region', { name: 'Vos derniers signalements' })
    const lignes = within(liste).getAllByRole('listitem')
    expect(lignes).toHaveLength(2)
    expect(lignes[0]).toHaveTextContent('Ajouter un événement, 2 oct.')
    expect(lignes[0]).toHaveTextContent('Ouvert')
    expect(lignes[1]).toHaveTextContent('Chiffres du dimanche, 27 sept.')
    expect(lignes[1]).toHaveTextContent('Clos le 30 sept.')
    expect(lignes[1]).toHaveTextContent(
      "Réponse d'EJP Tech : Réglé : le champ attendait un nombre entier.",
    )
    // Un texte masqué s'affiche en encre 3.
    expect(within(lignes[1]!).getByText('[texte masqué par EJP Tech]')).toHaveClass('text-encre-3')
  })

  it('lecture en échec : « La connexion a échoué. Réessayez. » avec « Réessayer »', async () => {
    const reessayer = vi.fn()
    afficher({ mesSignalements: { etat: 'probleme', reessayer } })
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalled()
  })
})
