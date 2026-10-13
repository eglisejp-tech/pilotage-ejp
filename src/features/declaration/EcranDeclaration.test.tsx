import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EcranDeclaration } from '@/features/declaration/EcranDeclaration'
import type { ProprietesEcranDeclaration } from '@/features/declaration/EcranDeclaration'

function afficher(proprietes: Partial<ProprietesEcranDeclaration> = {}) {
  const onDeclare = vi.fn()
  const onSignOut = vi.fn()
  const utilisateur = userEvent.setup()
  render(
    <MemoryRouter>
      <EcranDeclaration
        libelleCompte="Ministère Communication"
        onDeclare={onDeclare}
        onSignOut={onSignOut}
        {...proprietes}
      />
    </MemoryRouter>,
  )
  return { onDeclare, onSignOut, utilisateur }
}

const champ = () => screen.getByRole('textbox', { name: 'Votre prénom' })
const bouton = () => screen.getByRole('button', { name: 'Continuer' })

describe('EcranDeclaration (T56)', () => {
  it('présente la question, le compte, le champ, l’information et « Se déconnecter »', () => {
    afficher()
    expect(screen.getByRole('heading', { level: 1, name: "Qui utilise l'outil ?" })).toBeVisible()
    expect(document.title).toBe("Qui utilise l'outil ?, Pilotage EJP")
    expect(screen.getByText('Ministère Communication')).toBeInTheDocument()
    expect(screen.getByText('Ce compte est partagé. Indiquez votre prénom.')).toBeInTheDocument()
    expect(champ()).toHaveValue('')
    expect(champ()).toHaveAttribute('autocomplete', 'given-name')
    expect(champ()).toHaveAccessibleDescription(
      /Vous pouvez ajouter l'initiale de votre nom : «\sMarie\sD\.\s».*EJP Tech le voit, pour suivre l'utilisation de l'outil\./,
    )
    const lien = screen.getByRole('link', { name: 'Confidentialité (nouvel onglet)' })
    expect(lien).toHaveAttribute('href', '/confidentialite')
    expect(lien).toHaveAttribute('target', '_blank')
    // « nouvel onglet » n'est lu que par les lecteurs d'écran.
    expect(lien).toHaveTextContent(/^Confidentialité \(nouvel onglet\)$/)
    expect(lien.querySelector('.sr-only')).toHaveTextContent('(nouvel onglet)')
    const deconnexion = screen.getByRole('button', { name: 'Se déconnecter' })
    expect(deconnexion).toBeVisible()
    // Le bouton suit le champ ; le lien vient en pied de colonne, après « Se déconnecter ».
    expect(bouton().compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(
      deconnexion.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    // Pas de rappel « N'écrivez aucun nom » : il contredirait la question.
    expect(screen.queryByText(/N'écrivez aucun nom/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument()
  })

  it('vide : le message, rien n’est envoyé, le bouton reste actif', async () => {
    const { onDeclare, utilisateur } = afficher()
    expect(bouton()).not.toBeDisabled()
    await utilisateur.click(bouton())
    expect(await screen.findByText('Indiquez votre prénom.')).toBeVisible()
    expect(champ()).toHaveAttribute('aria-invalid', 'true')
    expect(onDeclare).not.toHaveBeenCalled()
  })

  it.each([
    ['marie@exemple.test', 'Écrivez seulement votre prénom, en lettres.'],
    ['Marie2', 'Écrivez seulement votre prénom, en lettres.'],
    ['a'.repeat(31), '30 caractères au plus.'],
  ])('« %s » : « %s »', async (saisie, message) => {
    const { onDeclare, utilisateur } = afficher()
    await utilisateur.type(champ(), saisie)
    await utilisateur.click(bouton())
    expect(await screen.findByText(message)).toBeVisible()
    expect(onDeclare).not.toHaveBeenCalled()
  })

  it('un prénom avec l’initiale du nom : envoyé une fois, nettoyé', async () => {
    const { onDeclare, utilisateur } = afficher()
    await utilisateur.type(champ(), '  Marie   D. ')
    await utilisateur.click(bouton())
    await vi.waitFor(() => expect(onDeclare).toHaveBeenCalledTimes(1))
    expect(onDeclare).toHaveBeenCalledWith('Marie D.')
  })

  it('pendant l’envoi, un second clic est ignoré', async () => {
    const { onDeclare, utilisateur } = afficher({ enCours: true })
    await utilisateur.type(champ(), 'Marie')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrement en cours' }))
    expect(onDeclare).not.toHaveBeenCalled()
    expect(champ().closest('form')).toHaveAttribute('aria-busy', 'true')
  })

  it('affiche l’erreur de l’enregistrement dans un bandeau', () => {
    afficher({ erreur: 'La connexion a échoué. Réessayez.' })
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
  })

  it('« Ce n’est pas moi » : « Annuler » ramène à l’outil', async () => {
    const onCancel = vi.fn()
    const { utilisateur } = afficher({ onCancel })
    await utilisateur.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('« Se déconnecter » appelle la déconnexion', async () => {
    const { onSignOut, utilisateur } = afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Se déconnecter' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})

// Rappel du jour (T63) : le prénom de la dernière déclaration de cette connexion est proposé.
describe('EcranDeclaration : rappel du jour (T63)', () => {
  it('le prénom est déjà écrit : un seul appui sur « Continuer » le confirme', async () => {
    const { onDeclare, utilisateur } = afficher({ prenomPropose: 'Marie D.' })
    expect(
      screen.getByText('Ce compte est partagé. Confirmez votre prénom, ou changez-le.'),
    ).toBeInTheDocument()
    expect(champ()).toHaveValue('Marie D.')
    await utilisateur.click(bouton())
    await vi.waitFor(() => expect(onDeclare).toHaveBeenCalledTimes(1))
    expect(onDeclare).toHaveBeenCalledWith('Marie D.')
  })

  it('la personne peut le changer', async () => {
    const { onDeclare, utilisateur } = afficher({ prenomPropose: 'Marie D.' })
    await utilisateur.clear(champ())
    await utilisateur.type(champ(), 'Paul')
    await utilisateur.click(bouton())
    await vi.waitFor(() => expect(onDeclare).toHaveBeenCalledWith('Paul'))
  })

  it('sans prénom proposé (nouvelle connexion) : le champ part vide, la phrase de départ', () => {
    afficher({ prenomPropose: '' })
    expect(champ()).toHaveValue('')
    expect(screen.getByText('Ce compte est partagé. Indiquez votre prénom.')).toBeInTheDocument()
  })
})
