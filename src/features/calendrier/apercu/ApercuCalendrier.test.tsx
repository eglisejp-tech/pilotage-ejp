import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ApercuCalendrier } from '@/features/calendrier/apercu/ApercuCalendrier'
import { AvecRequetes } from '@/test/AvecRequetes'
import { simulerLargeur } from '@/test/largeur'

function afficher(requete: string) {
  simulerLargeur(1440)
  // Le cache de requêtes sert aux boutons des points de la fiche (`ActionsPoint`, étape 5).
  return render(
    <MemoryRouter initialEntries={[`/apercu/calendrier${requete}`]}>
      <ApercuCalendrier />
    </MemoryRouter>,
    { wrapper: AvecRequetes },
  )
}

describe('aperçu du calendrier et de l’alerte', () => {
  it('par défaut : la fiche lue par le berger, calendrier et réunion, sans bandeau ni bouton de saisie', () => {
    const { container } = afficher('')
    expect(screen.getByRole('heading', { level: 1, name: 'Social' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Calendrier prévisionnel' })).toBeInTheDocument()
    expect(screen.getByText(/Prochaine réunion :/)).toHaveTextContent('lundi 12 oct., 20 h')
    expect(container.querySelector('[data-alerte-fiche]')).toBeNull()
    expect(
      screen.queryByRole('link', { name: /Ajouter un événement|Mettre à jour|Modifier/ }),
    ).toBeNull()
  })

  it('fiche-alerte, ministère : le bandeau, « Mettre à jour » sur ses quatre événements, jamais sur celui qui le mentionne', () => {
    const { container } = afficher('?ecran=fiche-alerte&profil=ministere')
    expect(container.querySelector('[data-alerte-fiche]')).not.toBeNull()
    expect(screen.getAllByRole('link', { name: /^Mettre à jour/ })).toHaveLength(4)
    expect(screen.getByText('Mentionné par Coordination.')).toBeInTheDocument()
    expect(screen.getByText('date passée depuis 11 jours')).toBeInTheDocument()
  })

  it('fiche-vide : « Aucun événement prévu. » et réunion « Renseigner » pour le ministère', () => {
    afficher('?ecran=fiche-vide&profil=ministere')
    expect(screen.getByText('Aucun événement prévu.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Renseigner' })).toBeInTheDocument()
  })

  it('l’administration de l’église : la page non disponible', () => {
    afficher('?profil=admin_eglise')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "Cette page n'est pas disponible avec votre compte.",
    )
  })

  it('a-confirmer : 5 lignes, puis « Voir les 8 événements à confirmer »', () => {
    afficher('?ecran=a-confirmer')
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Voir les 8 événements à confirmer' })).toBeVisible()
  })

  it('a-confirmer-vide : le bloc n’existe pas', () => {
    afficher('?ecran=a-confirmer-vide')
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })

  it.each(['ministere', 'admin_eglise'])('a-confirmer, profil %s : aucun bloc', (profil) => {
    afficher(`?ecran=a-confirmer&profil=${profil}`)
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
  })
})
