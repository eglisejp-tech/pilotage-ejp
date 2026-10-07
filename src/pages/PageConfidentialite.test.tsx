import { render, screen, within } from '@testing-library/react'
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
function texteDe(element: Element) {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Échappe un texte pour l'insérer tel quel dans une expression régulière. */
function litteral(texte: string) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * L'élément (balise donnée) dont le texte entier est exactement `texte` : l'expression régulière
 * est ancrée au début et à la fin du texte de l'élément.
 */
function elementExact(balise: 'P' | 'LI', texte: string) {
  const motif = new RegExp(`^${litteral(texte)}$`)
  return screen.getByText(
    (_, element) => element?.tagName === balise && motif.test(texteDe(element)),
  )
}

function textePage() {
  return texteDe(document.body)
}

describe('PageConfidentialite (étape 4, lot I)', () => {
  it('donne la date de la dernière mise à jour en haut de la page', () => {
    afficher()
    expect(
      elementExact(
        'P',
        "Ce que l'outil fait des données, et à qui s'adresser. Dernière mise à jour : 7 octobre 2026.",
      ),
    ).toBeInTheDocument()
  })

  it('dit ce qui se saisit pour les chiffres sensibles, et ce que la « Précision » ne doit pas contenir', () => {
    afficher()
    expect(screen.getByRole('heading', { level: 2, name: 'Chiffres sensibles' })).toBeVisible()
    for (const phrase of [
      "Certains indicateurs de la santé, de l'accompagnement, de l'écoute et de l'accueil des enfants sont sensibles (onze en tout). Pour chacun, le ministère concerné saisit un total par mois, le mois en cours compris : un nombre, jamais un nom.",
      'Le ministère peut répartir ce total entre quelques catégories larges, quand la coordination en a fixé la liste. Il peut aussi joindre à ce total une « Précision » de 280 caractères au plus.',
      "La « Précision » ne doit contenir aucune information sur une personne. L'outil refuse un texte qui contient une adresse email, un lien, une suite de 5 chiffres ou plus, ou une civilité suivie d'un nom. EJP Tech relit chaque précision et peut la masquer.",
    ]) {
      expect(elementExact('P', phrase)).toBeInTheDocument()
    }
    expect(textePage()).not.toMatch(/seuls des totaux/)
  })

  it('dit que le berger, le conseil et EJP Tech lisent les valeurs exactes, sans « moins de 3 »', () => {
    afficher()
    expect(
      elementExact(
        'P',
        "Les valeurs exactes de ces indicateurs, leur répartition et la « Précision » sont lues par le ministère qui les saisit, le berger, le conseil et EJP Tech. L'administration de l'église voit la date de chaque saisie, jamais sa valeur. Les autres ministères ne voient pas ces valeurs, et la vue de l'église ne les affiche jamais. Le journal de l'outil ne garde jamais ces valeurs.",
      ),
    ).toBeInTheDocument()
    expect(textePage()).not.toMatch(/moins de 3/)
    expect(textePage()).not.toMatch(/1 ou 2/)
  })

  it('place les signalements dans « Données traitées », hors de « Qui voit les données »', () => {
    afficher()
    const signalements = elementExact(
      'LI',
      "Les signalements (« Signaler une difficulté ») qu'un ministère adresse à EJP Tech. Seuls ce ministère et EJP Tech les lisent.",
    )
    const partie = signalements.closest('section')
    expect(partie).not.toBeNull()
    expect(within(partie as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Données traitées',
    )
    const quiVoit = screen
      .getByRole('heading', { level: 2, name: 'Qui voit les données' })
      .closest('section')
    expect(quiVoit).not.toBeNull()
    expect(texteDe(quiVoit as HTMLElement)).not.toMatch(/signalement/i)
  })

  it("parle d'une seule boîte Gmail, celle d'EJP Tech, et des transferts propres à Google et à Netlify", () => {
    afficher()
    expect(
      elementExact(
        'LI',
        "Google : connexion avec Google, et envoi des emails de l'outil depuis l'adresse Gmail gratuite d'EJP Tech.",
      ),
    ).toBeInTheDocument()
    expect(
      elementExact(
        'LI',
        "Copies des emails envoyés : dans la boîte d'envoi Gmail d'EJP Tech, supprimées au plus tard à l'arrêt de l'outil.",
      ),
    ).toBeInTheDocument()
    expect(
      elementExact(
        'P',
        "Supabase et Netlify agissent sous contrat. Pour Google, il n'y a pas de contrat de sous-traitance : le Gmail gratuit d'EJP Tech relève des conditions grand public de Google. Google et Netlify sont établis aux États-Unis. Les transferts vers Google s'appuient sur le cadre de protection des données entre l'Union européenne et les États-Unis ; ceux vers Netlify, sur les clauses contractuelles types de la Commission européenne.",
      ),
    ).toBeInTheDocument()
    expect(textePage()).not.toMatch(/Gmail de l'église/)
    expect(textePage()).not.toMatch(/messagerie Gmail/)
    expect(textePage()).not.toMatch(/Ils agissent sous contrat/)
  })

  it('garde le responsable du traitement et le contact', () => {
    afficher()
    expect(
      elementExact(
        'P',
        "L'Église des Jeunes Prodiges (EJP), par son ministère EJP Tech, 21 rue des Vieilles Vignes, 77183 Croissy-Beaubourg. Contact pour toute question sur vos données : EJP Tech, eglisejp.tech@gmail.com.",
      ),
    ).toBeInTheDocument()
  })
})
