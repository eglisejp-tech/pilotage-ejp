import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PanneauSignalement } from '@/features/signalement/PanneauSignalement'
import type { Signalement } from '@/features/signalement/schemas'
import type { EcranSignalement } from '@/lib/base'

type Envoi = (signalement: Signalement) => Promise<void>

const RAPPEL = "N'écrivez aucun nom ni information personnelle."
/** T77, conception 3.1 c : la réponse se suit dans « Mes signalements ». */
const CONFIRMATION = "Signalement envoyé. Suivez la réponse d'EJP Tech dans « Mes signalements »."

function afficher({
  ecran = 'saisie_evenement',
  envoyer = vi.fn<Envoi>(() => Promise.resolve()),
  onFermer = vi.fn(),
}: {
  ecran?: EcranSignalement
  envoyer?: Envoi
  onFermer?: () => void
} = {}) {
  render(
    <MemoryRouter>
      <PanneauSignalement
        ecran={ecran}
        envoyer={envoyer}
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
  it('titre, écran prérempli, rappel sous le champ et compteur « 0 sur 280 »', () => {
    afficher()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Signaler une difficulté')
    // Le libellé suffit : plus de phrase sur qui lit (T66, t149).
    expect(screen.queryByText(/lit votre signalement/)).toBeNull()
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
    expect(
      await screen.findByText('Raccourcissez le signalement : 280 caractères au plus.'),
    ).toBeInTheDocument()
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

  it('envoi réussi : l’écran et le texte partent, la confirmation dit la suite, champ vidé', async () => {
    const { envoyer } = afficher()
    await userEvent.type(champ(), '  Je ne peux pas choisir la date.  ')
    await envoyerLeFormulaire()
    expect(await screen.findByText(CONFIRMATION)).toBeInTheDocument()
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
    // Le message de la table de traduction, sous le champ, en plus du rappel : ce que la base
    // détecte, puis quoi faire (T66, t152 et m268).
    expect(
      await screen.findByText(
        'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
        { selector: '.text-alerte' },
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(champ()).toHaveFocus())
    expect(champ()).toHaveValue('Appelez le 06 12 34 56 78')
  })

  it('connexion perdue : « Vérifiez la liste » sous le bouton (T76), texte gardé', async () => {
    afficher({ envoyer: vi.fn<Envoi>(() => Promise.reject(new TypeError('Failed to fetch'))) })
    await userEvent.type(champ(), 'Je ne peux pas choisir la date.')
    await envoyerLeFormulaire()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Vérifiez la liste avant de réessayer.',
    )
    expect(champ()).toHaveValue('Je ne peux pas choisir la date.')
  })

  it('après l’envoi le bouton dit « Fermer », puis « Annuler » dès qu’on écrit de nouveau', async () => {
    const { onFermer } = afficher()
    await userEvent.type(champ(), 'Je ne peux pas choisir la date.')
    await envoyerLeFormulaire()
    await screen.findByText(CONFIRMATION)
    expect(screen.queryByRole('button', { name: 'Annuler' })).toBeNull()
    await userEvent.type(champ(), 'Autre')
    expect(screen.queryByRole('button', { name: 'Fermer' })).toBeNull()
    // Un nouveau texte n'est pas envoyé : « Annuler » demande avant de le perdre (m265).
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onFermer).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('après l’envoi, « Fermer » ferme sans question : le texte est parti', async () => {
    const { onFermer } = afficher()
    await userEvent.type(champ(), 'Je ne peux pas choisir la date.')
    await envoyerLeFormulaire()
    await screen.findByText(CONFIRMATION)
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onFermer).toHaveBeenCalledTimes(1)
  })

  it('« Annuler » ferme sans rien envoyer', async () => {
    const { envoyer, onFermer } = afficher()
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onFermer).toHaveBeenCalled()
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('un texte écrit : « Annuler » demande « Fermer sans enregistrer ? » (m265)', async () => {
    const { envoyer, onFermer } = afficher()
    await userEvent.type(champ(), 'Je ne peux pas choisir la date.')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(
      screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' }),
    ).toHaveAccessibleDescription('Ce que vous avez saisi sera perdu.')
    expect(onFermer).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
    expect(champ()).toHaveValue('Je ne peux pas choisir la date.')
    expect(envoyer).not.toHaveBeenCalled()
  })
})

describe('« Voir mes signalements » (T77, conception 3.1 c)', () => {
  it('un seul lien sous le formulaire, vers /signalements ; plus de liste ici', () => {
    afficher()
    expect(screen.getByRole('link', { name: 'Voir mes signalements' })).toHaveAttribute(
      'href',
      '/signalements',
    )
    expect(screen.queryByRole('heading', { name: 'Vos derniers signalements' })).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('après l’envoi, la confirmation renvoie à « Mes signalements », le lien reste', async () => {
    afficher()
    await userEvent.type(
      champ(),
      'Problème au niveau de la saisie des événement dans le calendrier',
    )
    await envoyerLeFormulaire()
    expect(await screen.findByText(CONFIRMATION)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir mes signalements' })).toBeInTheDocument()
  })
})
