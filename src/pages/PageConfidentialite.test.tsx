import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { PageConfidentialite } from '@/pages/PageConfidentialite'

function afficher() {
  render(
    <MemoryRouter>
      <PageConfidentialite />
    </MemoryRouter>,
  )
}

/** Texte d'un élément, espaces et retours à la ligne du JSX ramenés à une espace. */
function texteDe(element: HTMLElement) {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function paragraphe(debut: string) {
  return screen.getByText((_, element) => {
    return element?.tagName === 'P' && texteDe(element as HTMLElement).startsWith(debut)
  })
}

describe('PageConfidentialite (étape 4, lot I)', () => {
  it('donne la date de la dernière mise à jour en haut de la page', () => {
    afficher()
    expect(paragraphe("Ce que l'outil fait des données")).toHaveTextContent(
      "Ce que l'outil fait des données, et à qui s'adresser. Dernière mise à jour : 7 octobre 2026.",
    )
  })

  it('dit ce qui se saisit pour les chiffres sensibles, et qui les lit', () => {
    afficher()
    expect(screen.getByRole('heading', { level: 2, name: 'Chiffres sensibles' })).toBeVisible()
    expect(paragraphe('Pour la santé')).toHaveTextContent(
      "Pour la santé, l'accompagnement, l'écoute et les enfants, seuls des totaux par mois (le mois en cours compris), des répartitions par catégories larges fixées par la coordination et de courtes précisions sans information personnelle sont saisis.",
    )
    expect(paragraphe('Un nombre de 1 ou 2')).toHaveTextContent(
      "Un nombre de 1 ou 2 s'affiche « moins de 3 » : seul le ministère qui les saisit voit ses valeurs exactes. Une précision est lue par le ministère qui l'écrit, le berger, le conseil et EJP Tech.",
    )
  })

  it("dit qu'un signalement n'est lu que par son ministère et EJP Tech", () => {
    afficher()
    expect(paragraphe('Un signalement')).toHaveTextContent(
      "Un signalement (« Signaler une difficulté ») n'est lu que par le ministère qui l'écrit et par EJP Tech.",
    )
  })

  it("nuance « sous contrat » pour Google, qui envoie les emails depuis le Gmail gratuit d'EJP Tech", () => {
    afficher()
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'LI' &&
          texteDe(element as HTMLElement) ===
            "Google : connexion avec Google, et envoi des emails de l'outil depuis l'adresse Gmail gratuite d'EJP Tech.",
      ),
    ).toBeInTheDocument()
    const sousTraitance = paragraphe('Supabase et Netlify agissent sous contrat.')
    expect(sousTraitance).toHaveTextContent(
      "Supabase et Netlify agissent sous contrat. Pour Google, il n'y a pas de contrat de sous-traitance : le Gmail gratuit d'EJP Tech relève des conditions grand public de Google.",
    )
    expect(screen.queryByText(/Ils agissent sous contrat/)).not.toBeInTheDocument()
  })

  it('garde le responsable du traitement et le contact', () => {
    afficher()
    expect(
      paragraphe("L'Église des Jeunes Prodiges (EJP), par son ministère EJP Tech"),
    ).toHaveTextContent('eglisejp.tech@gmail.com')
  })
})
