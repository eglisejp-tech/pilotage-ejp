import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Compteur } from '@/features/saisie/Compteur'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { RappelDonneesPersonnelles } from '@/features/saisie/RappelDonneesPersonnelles'
import {
  DUREE_REUSSITE_MS,
  erreurDeConnexion,
  RAPPEL_DONNEES_PERSONNELLES,
} from '@/features/saisie/textes'

const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

describe('RappelDonneesPersonnelles', () => {
  it('dit la phrase du BRIEF, une fois, sans tiret', () => {
    render(<RappelDonneesPersonnelles id="rappel" />)
    expect(
      screen.getByText(
        "N'écrivez aucun nom ni information personnelle. Les champs libres sont relus par EJP Tech.",
      ),
    ).toHaveAttribute('id', 'rappel')
    expect(RAPPEL_DONNEES_PERSONNELLES).not.toMatch(TIRETS)
  })
})

describe('Compteur', () => {
  it('écrit « 12 sur 80 » à partir du seuil, et rien avant', () => {
    const { rerender } = render(<Compteur valeur={59} max={80} afficherDes={60} />)
    expect(screen.queryByText(/sur 80/)).toBeNull()
    rerender(<Compteur valeur={60} max={80} afficherDes={60} />)
    expect(screen.getByText('60 sur 80')).toBeInTheDocument()
  })

  it('s’affiche dès 0 par défaut (« 0 sur 280 »)', () => {
    render(<Compteur valeur={0} max={280} />)
    expect(screen.getByText('0 sur 280')).toBeInTheDocument()
  })

  it('passe en couleur d’alerte au-delà de la limite, et garde les mots', () => {
    render(<Compteur valeur={300} max={280} />)
    expect(screen.getByText('300 sur 280')).toHaveClass('text-alerte')
  })
})

describe('ErreurFormulaire', () => {
  it('annonce la phrase de LISEZMOI : les chiffres restent dans le formulaire', () => {
    render(<ErreurFormulaire />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Vos chiffres sont encore dans le formulaire : réessayez.',
    )
  })

  it('parle du message pour un champ libre, ou donne le message du serveur', () => {
    const { rerender } = render(<ErreurFormulaire objet="message" />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre message est encore dans le formulaire : réessayez.',
    )
    rerender(<ErreurFormulaire message="Rien n'a changé." />)
    expect(screen.getByRole('alert')).toHaveTextContent("Rien n'a changé.")
    expect(erreurDeConnexion('chiffres')).not.toMatch(TIRETS)
  })
})

describe('MessageReussite', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('garde une région status, vide sans message', () => {
    render(<MessageReussite message={null} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('annonce le message pendant 6 secondes, puis le retire', () => {
    expect(DUREE_REUSSITE_MS).toBe(6000)
    render(<MessageReussite message="Chiffres du dimanche 27 sept. enregistrés." />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Chiffres du dimanche 27 sept. enregistrés.',
    )
    act(() => {
      vi.advanceTimersByTime(5999)
    })
    expect(screen.getByRole('status')).toHaveTextContent('enregistrés.')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('affiche de nouveau un message différent', () => {
    const { rerender } = render(<MessageReussite message="Réunion enregistrée." />)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    rerender(<MessageReussite message="Événement ajouté au calendrier." />)
    expect(screen.getByRole('status')).toHaveTextContent('Événement ajouté au calendrier.')
  })

  it('affiche de nouveau le même message après un nouvel envoi (correction du même dimanche)', () => {
    const message = 'Chiffres du dimanche 27 sept. enregistrés.'
    const { rerender } = render(<MessageReussite message={message} envoi={1} />)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    rerender(<MessageReussite message={message} envoi={1} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    rerender(<MessageReussite message={message} envoi={2} />)
    expect(screen.getByRole('status')).toHaveTextContent(message)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
