import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  COMMUNICATION,
  COORDINATION,
  LECTURES_EXEMPLE_POINTS,
  lecturesDuMinistere,
  lecturesSansPoint,
} from '@/features/points/apercu/exemplesPoints'
import { construirePoints } from '@/features/points/construirePoints'
import type { ProfilPoints } from '@/features/points/textesPoints'
import { VuePoints } from '@/features/points/VuePoints'
import type { ProprietesActionsPoint } from '@/features/points-actions/ActionsPoint'

// Les boutons sont ceux du lot P1 : ici, un témoin qui montre ce que l'écran lui donne.
vi.mock('@/features/points-actions/ActionsPoint', () => ({
  ActionsPoint: ({ point, compte }: ProprietesActionsPoint) => (
    <span data-testid="actions">{`${point.id}|${compte.type}|${compte.ministereId ?? ''}`}</span>
  ),
}))

/** Boutons et liens d'action qu'EJP Tech ne voit jamais (T29). */
const ACTIONS = /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/

function Adresse() {
  const { search } = useLocation()
  return <p data-testid="adresse">{search}</p>
}

function afficher(
  profil: ProfilPoints,
  options: { adresse?: string; vide?: boolean; lectures?: typeof LECTURES_EXEMPLE_POINTS } = {},
) {
  const base = options.vide
    ? lecturesSansPoint(LECTURES_EXEMPLE_POINTS)
    : (options.lectures ?? LECTURES_EXEMPLE_POINTS)
  const lectures = profil === 'ministere' ? lecturesDuMinistere(base, COMMUNICATION) : base
  const adresse = options.adresse ?? '/points'
  const ministere = new URLSearchParams(adresse.split('?')[1] ?? '').get('ministere')
  return render(
    <MemoryRouter initialEntries={[adresse]}>
      <VuePoints
        titre={profil === 'ministere' ? 'Mes points' : "Points d'attention"}
        profil={profil}
        donnees={construirePoints(lectures, profil, ministere)}
        compte={{ type: profil, ministereId: profil === 'ministere' ? COMMUNICATION : null }}
      />
      <Adresse />
    </MemoryRouter>,
  )
}

const rangees = () => screen.getAllByRole('heading', { level: 3 }).map((titre) => titre.textContent)

describe('écran 05 : le berger', () => {
  it('titre, phrase, onglets avec leur nombre, filtre et tableau', () => {
    afficher('berger')
    expect(screen.getByRole('heading', { level: 1, name: "Points d'attention" })).toBeVisible()
    expect(
      screen.getByText(
        'Triés par priorité, puis par échéance. Les décisions se prennent en conseil ; ici, on marque seulement ce qui est traité.',
      ),
    ).toBeVisible()
    const onglets = within(screen.getByRole('navigation', { name: 'Vues des points' }))
    expect(onglets.getAllByRole('link').map((lien) => lien.textContent)).toEqual([
      'Ouverts (5)',
      'Traités (4)',
      'Tous (9)',
    ])
    expect(onglets.getByRole('link', { name: 'Ouverts (5)' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('combobox', { name: 'Filtrer par ministère' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Aide : Filtrer par ministère' })).toBeVisible()
  })

  it('Ouverts : par priorité, puis échéance ; « Traités récemment » dessous', () => {
    afficher('berger')
    const liste = screen.getByRole('region', { name: 'Points ouverts' })
    expect(
      within(liste)
        .getAllByRole('heading', { level: 3 })
        .map((t) => t.textContent),
    ).toEqual([
      'Financement de Welcome Prodiges',
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
      'Visuels pour Welcome Prodiges',
      'Renfort de 4 STARs pour la sortie',
    ])
    const recents = screen.getByRole('region', { name: 'Traités récemment' })
    const lignes = within(recents).getAllByRole('listitem')
    expect(lignes).toHaveLength(4)
    expect(lignes[0]).toHaveTextContent(
      "Micros pour Bâtir l'ÉgliseCommunicationTraité le 26 sept. par Berger",
    )
    expect(lignes[1]).toHaveTextContent('Traité le 24 sept. par Conseil, compte 3')
  })

  it('une rangée : statut, échéance, ministère et mentions', () => {
    afficher('berger')
    const financement = screen.getByRole('article', { name: 'Financement de Welcome Prodiges' })
    expect(financement).toHaveTextContent('Priorité Urgente')
    expect(financement).toHaveTextContent('Statut : En attente de décision')
    expect(financement).toHaveTextContent('Échéance : 5 oct.')
    expect(financement).toHaveTextContent('Intégration, mentions :Aucune')
    const salle = screen.getByRole('article', { name: 'Salle pour la soirée de louange' })
    expect(salle).toHaveTextContent('Communication, mentions :@Coordination')
    expect(salle).toHaveTextContent('Attendu : Confirmer la salle')
    const renfort = screen.getByRole('article', { name: 'Renfort de 4 STARs pour la sortie' })
    expect(renfort).toHaveTextContent('@Social (désactivé)')
  })

  it('une échéance dépassée est en rouge et porte le mot « dépassée »', () => {
    afficher('berger')
    const planning = screen.getByRole('article', { name: 'Planning du trimestre à valider' })
    const echeance = within(planning).getByText('28 sept., dépassée')
    expect(echeance).toHaveClass('text-alerte')
    const financement = screen.getByRole('article', { name: 'Financement de Welcome Prodiges' })
    expect(within(financement).getByText('5 oct.')).not.toHaveClass('text-alerte')
  })

  it('Traités : « Traité le … par … » et le commentaire entre guillemets, sans « Traités récemment »', () => {
    afficher('berger', { adresse: '/points?vue=traites' })
    expect(screen.getByRole('link', { name: 'Traités (4)' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(rangees()).toEqual([
      "Micros pour Bâtir l'Église",
      'Transport des Prodiges Junior',
      'Clés de la salle annexe',
      'Lieu de stockage de la collecte',
    ])
    const transport = screen.getByRole('article', { name: 'Transport des Prodiges Junior' })
    expect(transport).toHaveTextContent(
      "Traité le 24 sept. par Conseil, compte 3 « Deux véhicules de l'église assurent le transport jusqu'à fin octobre. »",
    )
    expect(transport).not.toHaveTextContent('Échéance')
    expect(screen.queryByRole('region', { name: 'Traités récemment' })).toBeNull()
  })

  it('un texte masqué par EJP Tech reste en encre 3', () => {
    afficher('berger', { adresse: '/points?vue=traites' })
    expect(screen.getByText('[texte masqué par EJP Tech]')).toHaveClass('text-encre-3')
  })

  it('Tous : les ouverts, puis les traités', () => {
    afficher('berger', { adresse: '/points?vue=tous' })
    expect(rangees()).toHaveLength(9)
    expect(rangees()[0]).toBe('Financement de Welcome Prodiges')
    expect(rangees()[5]).toBe("Micros pour Bâtir l'Église")
    expect(screen.queryByRole('region', { name: 'Traités récemment' })).toBeNull()
  })

  it('une vue inconnue vaut Ouverts', () => {
    afficher('berger', { adresse: '/points?vue=n-importe-quoi' })
    expect(screen.getByRole('link', { name: 'Ouverts (5)' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('les onglets changent la vue dans l’adresse et gardent le ministère choisi', async () => {
    const utilisateur = userEvent.setup()
    afficher('berger', { adresse: `/points?ministere=${COORDINATION}` })
    await utilisateur.click(screen.getByRole('link', { name: /^Traités/ }))
    expect(screen.getByTestId('adresse')).toHaveTextContent(
      `?ministere=${COORDINATION}&vue=traites`,
    )
  })

  it('« Ouverts » retire le paramètre vue de l’adresse', () => {
    afficher('berger', { adresse: '/points?vue=traites' })
    expect(screen.getByRole('link', { name: /^Ouverts/ })).toHaveAttribute('href', '/points')
  })

  it('choisir un ministère met `ministere` dans l’adresse ; « Tous les ministères » le retire', async () => {
    const utilisateur = userEvent.setup()
    afficher('conseil', { adresse: '/points?vue=tous' })
    const filtre = screen.getByRole('combobox', { name: 'Filtrer par ministère' })
    await utilisateur.selectOptions(filtre, 'Coordination')
    expect(screen.getByTestId('adresse')).toHaveTextContent(`?vue=tous&ministere=${COORDINATION}`)
    await utilisateur.selectOptions(filtre, 'Tous les ministères')
    expect(screen.getByTestId('adresse')).toHaveTextContent('?vue=tous')
    expect(screen.getByTestId('adresse')).not.toHaveTextContent('ministere')
  })

  it('le ministère choisi : ses points, créés ou mentionnés, et les nombres des onglets', () => {
    afficher('berger', { adresse: `/points?ministere=${COORDINATION}` })
    expect(screen.getByRole('combobox', { name: 'Filtrer par ministère' })).toHaveValue(
      COORDINATION,
    )
    expect(rangees()).toEqual([
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
    ])
    expect(screen.getByRole('link', { name: 'Ouverts (2)' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Traités (2)' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Tous (4)' })).toBeVisible()
  })

  it('le choix du filtre garde les ministères désactivés qui ont un point', () => {
    afficher('berger')
    const filtre = screen.getByRole('combobox', { name: 'Filtrer par ministère' })
    expect(
      within(filtre)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Tous les ministères',
      'Communication',
      'Coordination',
      'Intégration',
      'Jeunesse',
      'Prodiges Junior',
      'Social (désactivé)',
    ])
  })
})

describe('écran 05 : les boutons de chaque rangée', () => {
  it('chaque rangée reçoit le point et le compte (le berger : sans ministère)', () => {
    afficher('berger')
    const temoins = screen.getAllByTestId('actions').map((temoin) => temoin.textContent)
    // Une rangée par point ouvert ; « Traités récemment » n'a pas de bouton.
    expect(temoins).toHaveLength(5)
    expect(temoins[0]).toBe('p-financement|berger|')
  })

  it('l’onglet Traités donne aussi les rangées à ActionsPoint, qui ne montre rien sur un point traité', () => {
    afficher('berger', { adresse: '/points?vue=traites' })
    expect(screen.getAllByTestId('actions')).toHaveLength(4)
  })
})

describe('« Mes points » du ministère', () => {
  it('même écran, ses points seulement, sans filtre de ministère', () => {
    afficher('ministere')
    expect(screen.getByRole('heading', { level: 1, name: 'Mes points' })).toBeVisible()
    expect(
      screen.getByText(
        'Les points créés par votre ministère ou qui le mentionnent, triés par priorité, puis par échéance.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Aide : / })).toBeNull()
    expect(rangees().slice(0, 2)).toEqual([
      'Salle pour la soirée de louange',
      'Visuels pour Welcome Prodiges',
    ])
    expect(screen.getByRole('link', { name: 'Ouverts (2)' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Traités (1)' })).toBeVisible()
  })

  it('un ministère mentionné lit « Intégration, mentions : @Communication » sur le point qui le mentionne', () => {
    afficher('ministere')
    const visuels = screen.getByRole('article', { name: 'Visuels pour Welcome Prodiges' })
    expect(visuels).toHaveTextContent('Intégration, mentions :@Communication')
  })

  it('les boutons savent le ministère du compte', () => {
    afficher('ministere')
    const temoins = screen.getAllByTestId('actions').map((temoin) => temoin.textContent)
    expect(temoins).toContain(`p-salle|ministere|${COMMUNICATION}`)
  })

  it('le ministère ne peut pas lire le filtre d’un autre : `ministere` est ignoré', () => {
    afficher('ministere', { adresse: `/points?ministere=${COORDINATION}` })
    expect(screen.getByRole('link', { name: 'Ouverts (2)' })).toBeVisible()
  })
})

describe('EJP Tech : lecture seule', () => {
  it('lit tous les points, sans aucun bouton ni lien d’action', () => {
    afficher('admin_plateforme')
    expect(screen.getByText(/vous lisez les points sans les modifier/)).toBeVisible()
    expect(rangees()).toHaveLength(5)
    expect(screen.queryByRole('button', { name: ACTIONS })).toBeNull()
    expect(screen.queryByRole('link', { name: ACTIONS })).toBeNull()
    // L'aide du filtre informe, elle n'agit pas.
    const boutons = screen
      .queryAllByRole('button')
      .map((bouton) => bouton.getAttribute('aria-label'))
    expect(boutons).toEqual(['Aide : Filtrer par ministère'])
  })
})

describe('états vides (T36)', () => {
  it('Ouverts sans point : « Aucun point ouvert. »', () => {
    afficher('berger', { vide: true })
    expect(screen.getByText('Aucun point ouvert.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ouverts (0)' })).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Traités récemment' })).toBeNull()
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('Traités sans point : « Aucun point traité pour l’instant. »', () => {
    afficher('berger', { vide: true, adresse: '/points?vue=traites' })
    expect(screen.getByText("Aucun point traité pour l'instant.")).toBeVisible()
  })

  it('Tous sans point : « Aucun point pour l’instant. » ; le ministère lit ce qui viendra', () => {
    afficher('ministere', { vide: true, adresse: '/points?vue=tous' })
    expect(screen.getByText("Aucun point pour l'instant.")).toBeVisible()
    expect(
      screen.getByText(
        'Les points que vous créez, et ceux qui vous mentionnent, apparaîtront ici.',
      ),
    ).toBeVisible()
  })

  it('un ministère choisi sans point dans la vue : le nom du ministère', () => {
    afficher('berger', { adresse: '/points?ministere=min-jeunesse&vue=traites' })
    expect(screen.getByText('Aucun point traité pour Jeunesse.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ouverts (1)' })).toBeVisible()
  })
})
