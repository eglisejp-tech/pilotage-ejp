import { render } from '@testing-library/react'
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
 * Le seul élément (balise donnée) dont le texte entier est exactement `texte` : l'expression
 * régulière est ancrée au début et à la fin du texte de l'élément. Parcours direct du DOM, plus
 * rapide que les requêtes par rôle sur une longue page.
 */
function elementExact(balise: 'p' | 'li', texte: string) {
  const motif = new RegExp(`^${litteral(texte)}$`)
  const trouves = Array.from(document.body.querySelectorAll(balise)).filter((element) =>
    motif.test(texteDe(element)),
  )
  expect(trouves).toHaveLength(1)
  return trouves[0] as HTMLElement
}

/** La partie de la page qui porte ce titre de niveau 2. */
function partie(titre: string) {
  const h2 = Array.from(document.body.querySelectorAll('h2')).find(
    (element) => texteDe(element) === titre,
  )
  expect(h2).toBeDefined()
  return (h2 as HTMLElement).closest('section') as HTMLElement
}

function textePage() {
  return texteDe(document.body)
}

describe('PageConfidentialite (étape 4, lot I)', () => {
  it('donne la date de la dernière mise à jour en haut de la page', () => {
    afficher()
    elementExact(
      'p',
      "Ce que l'outil fait des données, et à qui s'adresser. Dernière mise à jour : 7 octobre 2026.",
    )
  })

  it('dit ce qui se saisit pour les chiffres sensibles, et ce que la « Précision » ne doit pas contenir', () => {
    afficher()
    const sensibles = partie('Chiffres sensibles')
    for (const phrase of [
      "Onze indicateurs sont sensibles : ceux de la santé, de l'accompagnement et de l'écoute, et, pour Prodiges Junior, les nouveaux enfants et les enfants déjà venus. Pour chacun, le ministère concerné saisit un total par mois, le mois en cours compris : un nombre, jamais un nom.",
      "Les autres chiffres ne sont pas sensibles. Ils se saisissent chaque dimanche, chaque mois ou à ce jour, selon l'indicateur, et ne contiennent jamais de nom. Par exemple, Prodiges Junior saisit chaque dimanche le nombre d'enfants présents, en un seul total, sans âge ni nom.",
      'Le ministère peut répartir ce total entre quelques catégories larges, quand la coordination en a fixé la liste. Il peut aussi joindre à ce total une « Précision » de 280 caractères au plus.',
      "La « Précision » ne doit contenir aucune information sur une personne. L'outil refuse un texte qui contient une adresse email, un lien, une suite de 5 chiffres ou plus, ou une civilité suivie d'un nom. EJP Tech relit chaque précision et peut la masquer.",
    ]) {
      expect(sensibles).toContainElement(elementExact('p', phrase))
    }
    expect(textePage()).not.toMatch(/seuls des totaux/)
    expect(textePage()).not.toMatch(/ne contient jamais/)
  })

  it('dit que le berger, le conseil et EJP Tech lisent les valeurs exactes, sans « moins de 3 »', () => {
    afficher()
    expect(partie('Chiffres sensibles')).toContainElement(
      elementExact(
        'p',
        "Les valeurs exactes de ces indicateurs, leur répartition et la « Précision » sont lues par le ministère qui les saisit, le berger, le conseil et EJP Tech. L'administration de l'église voit la date de chaque saisie, jamais sa valeur. Les autres ministères ne voient pas ces valeurs, et la vue de l'église ne les affiche jamais. Le journal de l'outil ne garde jamais ces valeurs.",
      ),
    )
    expect(textePage()).not.toMatch(/moins de 3/)
    expect(textePage()).not.toMatch(/1 ou 2/)
  })

  it('place les signalements dans « Données traitées », avant la règle des champs libres', () => {
    afficher()
    const donnees = partie('Données traitées')
    const signalements = elementExact(
      'li',
      "Les signalements (« Signaler une difficulté ») : un court message qu'un ministère adresse à EJP Tech pour obtenir de l'aide avec l'outil. Seuls ce ministère et EJP Tech les lisent.",
    )
    const champsLibres = elementExact(
      'li',
      "Ce qui est écrit dans les champs libres. N'y écrivez aucune information sur une personne : ce qui y est écrit par erreur est masqué.",
    )
    expect(donnees).toContainElement(signalements)
    expect(donnees).toContainElement(champsLibres)
    expect(signalements.nextElementSibling).toBe(champsLibres)
    // « Qui voit les données » ne cite les signalements que pour les exclure de « l'ensemble » (T49).
    expect(texteDe(partie('Qui voit les données'))).toMatch(
      /le berger et le conseil voient l'ensemble, sauf les signalements ;/,
    )
  })

  it("parle d'une seule boîte Gmail, celle d'EJP Tech, et des transferts propres à Google et à Netlify", () => {
    afficher()
    elementExact(
      'li',
      "Google : connexion avec Google, et envoi des emails de l'outil depuis la boîte Gmail gratuite d'EJP Tech.",
    )
    elementExact(
      'li',
      "Copies des emails envoyés : dans la boîte Gmail gratuite d'EJP Tech qui les envoie, supprimées au plus tard à l'arrêt de l'outil.",
    )
    elementExact(
      'p',
      "Supabase et Netlify agissent sous contrat. Pour Google, il n'y a pas de contrat de sous-traitance : la boîte Gmail gratuite d'EJP Tech relève des conditions grand public de Google. Google et Netlify sont établis aux États-Unis. Les transferts vers Google s'appuient sur le cadre de protection des données entre l'Union européenne et les États-Unis ; ceux vers Netlify, sur les clauses contractuelles types de la Commission européenne.",
    )
    expect(textePage()).not.toMatch(/Gmail de l'église/)
    expect(textePage()).not.toMatch(/messagerie Gmail/)
    expect(textePage()).not.toMatch(/Ils agissent sous contrat/)
    expect(textePage()).not.toMatch(/boîte d'envoi/)
    expect(textePage().match(/Gmail/g)).toHaveLength(3)
    expect(textePage().match(/clauses contractuelles types/g)).toHaveLength(1)
  })

  it('garde les phrases validées le 5 octobre 2026 sur les profils et les champs libres', () => {
    afficher()
    expect(partie('Qui voit les données')).toContainElement(
      elementExact(
        'p',
        "Les comptes de l'église, chacun selon son profil : un ministère voit sa fiche, la vue de l'église et les points qui le concernent ; le berger et le conseil voient l'ensemble, sauf les signalements ; EJP Tech voit l'ensemble en lecture, pour administrer l'outil, et relit les champs libres.",
      ),
    )
    elementExact(
      'p',
      "Une saisie ne se modifie pas : une correction s'ajoute comme une nouvelle saisie. Un texte qui contient une information personnelle est masqué.",
    )
  })

  it('garde le responsable du traitement et le contact', () => {
    afficher()
    elementExact(
      'p',
      "L'Église des Jeunes Prodiges (EJP), par son ministère EJP Tech, 21 rue des Vieilles Vignes, 77183 Croissy-Beaubourg. Contact pour toute question sur vos données : EJP Tech, eglisejp.tech@gmail.com.",
    )
  })
})
