import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exempleAccueil,
  MINISTERE_EXEMPLE,
  POINTS_EXEMPLE,
} from '@/features/accueil-ministere/exempleAccueil'
import { BlocVosPoints } from '@/features/accueil-ministere/BlocVosPoints'
import { lecturesExempleFiche, SOCIAL } from '@/features/fiche/apercu/exemplesFiche'
import { BlocPointsFiche } from '@/features/fiche/BlocPointsFiche'
import { construireFiche, construirePointsFiche } from '@/features/fiche/construireFiche'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { VueFiche } from '@/features/fiche/VueFiche'
import { AvecRequetes } from '@/test/AvecRequetes'
import { CartePointFiche } from '@/features/fiche/CartePointFiche'
import { EmplacementNouveauPoint } from '@/features/fiche/EmplacementNouveauPoint'
import type { CompteDesActions, PointDesActions } from '@/features/points-actions/ActionsPoint'
import { simulerLargeur } from '@/test/largeur'
import { ADecider } from './ADecider'
import { exempleCetteSemaine, pointsOuvertsExemple } from './exemple'
import { VueCetteSemaine } from './VueCetteSemaine'

// `ActionsPoint` est remplacé par un témoin qui écrit les propriétés reçues : ces tests vérifient
// la pose (quels points, quel compte, quels identifiants), pas les droits ni les fenêtres, qui
// sont ceux du lot P1 (`droitsPoint.test.ts`, `ActionsPoint.test.tsx`).
vi.mock('@/features/points-actions/ActionsPoint', () => ({
  ActionsPoint: ({ point, compte }: { point: unknown; compte: unknown }) => (
    <div
      data-testid="actions-point"
      data-point={JSON.stringify(point)}
      data-compte={JSON.stringify(compte)}
    />
  ),
}))

const BERGER: CompteDesActions = { type: 'berger', ministereId: null }
const MINISTERE: CompteDesActions = { type: 'ministere', ministereId: MINISTERE_EXEMPLE }

function dans(enfant: ReactNode) {
  return render(<MemoryRouter>{enfant}</MemoryRouter>)
}

/** Les propriétés `point` et `compte` reçues par chaque témoin d'`ActionsPoint`, dans l'ordre. */
function posees(racine: HTMLElement = document.body) {
  return within(racine)
    .queryAllByTestId('actions-point')
    .map((temoin) => ({
      point: JSON.parse(temoin.dataset.point ?? 'null') as PointDesActions,
      compte: JSON.parse(temoin.dataset.compte ?? 'null') as CompteDesActions | null,
    }))
}

beforeEach(() => {
  simulerLargeur(1440)
})

describe('« À décider » pose « Marquer traité » sous chaque point', () => {
  const { lienTousLesPoints } = exempleCetteSemaine('berger').aDecider

  it('chaque point reçoit son id, son titre, son statut, son créateur et ses mentions par identifiants', () => {
    dans(
      <ADecider
        points={pointsOuvertsExemple}
        lienTousLesPoints={lienTousLesPoints}
        compte={BERGER}
      />,
    )
    const region = screen.getByRole('region', { name: 'À décider' })
    const recues = posees(region)
    expect(recues).toHaveLength(3)
    expect(recues.map((recue) => recue.compte)).toEqual([BERGER, BERGER, BERGER])
    expect(recues[0]?.point).toEqual({
      id: 'financement-welcome',
      titre: { texte: 'Financement de Welcome Prodiges', masque: false },
      statut: 'attente_decision',
      ministereId: 'int',
      mentions: [],
    })
    // Les mentions sont des identifiants, jamais les noms affichés (« @Coordination »).
    expect(recues[2]?.point).toMatchObject({
      id: 'salle-louange',
      ministereId: 'com',
      mentions: ['coo'],
    })
  })

  it('le bouton se pose dans l’article du point, après ses mentions', () => {
    dans(
      <ADecider
        points={pointsOuvertsExemple}
        lienTousLesPoints={lienTousLesPoints}
        compte={BERGER}
      />,
    )
    const [premier] = within(screen.getByRole('region', { name: 'À décider' })).getAllByRole(
      'article',
    )
    expect(within(premier as HTMLElement).getByTestId('actions-point')).toBeInTheDocument()
  })

  it('sans compte (EJP Tech, lecture seule), aucun bouton n’est posé', () => {
    dans(
      <ADecider
        points={pointsOuvertsExemple}
        lienTousLesPoints={lienTousLesPoints}
        compte={null}
      />,
    )
    expect(posees()).toHaveLength(0)
    dans(<ADecider points={pointsOuvertsExemple} lienTousLesPoints={lienTousLesPoints} />)
    expect(posees()).toHaveLength(0)
  })

  it('le bloc porte le repère de focus de la page', () => {
    dans(
      <ADecider
        points={pointsOuvertsExemple}
        lienTousLesPoints={lienTousLesPoints}
        compte={BERGER}
      />,
    )
    expect(screen.getByRole('region', { name: 'À décider' })).toHaveAttribute('data-repli-focus')
  })
})

describe('la vue « Cette semaine » donne son compte à chaque profil', () => {
  it.each(['berger', 'conseil'] as const)('%s : un bouton par point de « À décider »', (profil) => {
    dans(<VueCetteSemaine donnees={exempleCetteSemaine(profil)} />)
    const recues = posees(screen.getByRole('region', { name: 'À décider' }))
    expect(recues).toHaveLength(3)
    expect(recues.every((recue) => recue.compte?.type === profil)).toBe(true)
    expect(recues.every((recue) => recue.compte?.ministereId === null)).toBe(true)
  })

  it('EJP Tech : « À décider » est lu sans aucun bouton (T29)', () => {
    dans(<VueCetteSemaine donnees={exempleCetteSemaine('admin_plateforme')} />)
    expect(screen.getByRole('region', { name: 'À décider' })).toBeInTheDocument()
    expect(posees()).toHaveLength(0)
  })

  it('l’administration de l’église n’a ni « À décider » ni bouton', () => {
    dans(<VueCetteSemaine donnees={exempleCetteSemaine('admin_eglise')} />)
    expect(posees()).toHaveLength(0)
  })

  it('ministère : « Vos points » reçoit le compte du ministère, pas « À décider »', () => {
    dans(<VueCetteSemaine donnees={exempleCetteSemaine('ministere')} accueil={exempleAccueil()} />)
    expect(screen.queryByRole('region', { name: 'À décider' })).not.toBeInTheDocument()
    const recues = posees(screen.getByRole('region', { name: 'Vos points' }))
    expect(recues).toHaveLength(POINTS_EXEMPLE.length)
    expect(recues.every((recue) => recue.compte?.ministereId === MINISTERE_EXEMPLE)).toBe(true)
  })
})

describe('« Vos points » (accueil du ministère)', () => {
  it('chaque point porte son créateur et ses mentions par identifiants', () => {
    dans(<BlocVosPoints bloc={{ etat: 'donnees', donnees: POINTS_EXEMPLE }} compte={MINISTERE} />)
    const recues = posees()
    expect(recues.map((recue) => recue.point)).toEqual([
      {
        id: 'p1',
        titre: { texte: 'Salle pour la soirée de louange', masque: false },
        statut: 'a_traiter',
        ministereId: MINISTERE_EXEMPLE,
        mentions: ['coordination'],
      },
      {
        id: 'p2',
        titre: { texte: 'Visuels pour Welcome Prodiges', masque: false },
        statut: 'a_traiter',
        ministereId: 'integration',
        mentions: [MINISTERE_EXEMPLE],
      },
    ])
    expect(recues.every((recue) => recue.compte?.ministereId === MINISTERE_EXEMPLE)).toBe(true)
    expect(screen.getByRole('region', { name: 'Vos points' })).toHaveAttribute('data-repli-focus')
  })

  it('un point mentionné garde « Mentionné par Intégration. » avant ses boutons', () => {
    dans(<BlocVosPoints bloc={{ etat: 'donnees', donnees: POINTS_EXEMPLE }} compte={MINISTERE} />)
    const [, mentionne] = within(screen.getByRole('region', { name: 'Vos points' })).getAllByRole(
      'article',
    )
    const texte = mentionne as HTMLElement
    const mention = within(texte).getByText('Mentionné par Intégration.')
    const boutons = within(texte).getByTestId('actions-point')
    expect(mention.compareDocumentPosition(boutons) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sans point, aucun bouton', () => {
    dans(<BlocVosPoints bloc={{ etat: 'donnees', donnees: [] }} compte={MINISTERE} />)
    expect(posees()).toHaveLength(0)
  })
})

describe('les points de la fiche (04 et 12)', () => {
  const [point] = POINTS_EXEMPLE
  if (point === undefined) throw new Error('Exemple sans point.')

  it('CartePointFiche pose les boutons avec le compte reçu', () => {
    dans(<CartePointFiche point={point} compte={MINISTERE} />)
    expect(posees()).toEqual([
      {
        point: {
          id: 'p1',
          titre: { texte: 'Salle pour la soirée de louange', masque: false },
          statut: 'a_traiter',
          ministereId: MINISTERE_EXEMPLE,
          mentions: ['coordination'],
        },
        compte: MINISTERE,
      },
    ])
  })

  it('CartePointFiche sans compte : aucun bouton', () => {
    dans(<CartePointFiche point={point} />)
    expect(posees()).toHaveLength(0)
  })

  const lire = (profil: 'ministere' | 'berger' | 'conseil' | 'admin_plateforme') =>
    dans(
      <BlocPointsFiche
        bloc={{ etat: 'donnees', donnees: POINTS_EXEMPLE }}
        profil={profil}
        ministereId={MINISTERE_EXEMPLE}
        nomMinistere="Communication"
      />,
    )

  it('le ministère lit sa fiche : son compte porte son ministère', () => {
    lire('ministere')
    expect(posees().map((recue) => recue.compte)).toEqual([MINISTERE, MINISTERE])
    expect(screen.getByRole('region', { name: "Points d'attention" })).toHaveAttribute(
      'data-repli-focus',
    )
  })

  it.each(['berger', 'conseil'] as const)(
    '%s lit la fiche d’un ministère : son compte n’a pas de ministère',
    (profil) => {
      lire(profil)
      expect(posees().map((recue) => recue.compte)).toEqual([
        { type: profil, ministereId: null },
        { type: profil, ministereId: null },
      ])
    },
  )

  it('EJP Tech lit la fiche sans aucun bouton (T29)', () => {
    lire('admin_plateforme')
    expect(screen.getAllByRole('article')).toHaveLength(POINTS_EXEMPLE.length)
    expect(posees()).toHaveLength(0)
  })
})

describe('la vue de la fiche pose un bouton par point, pour chaque profil qui peut agir', () => {
  function lireFiche(profil: ProfilFiche) {
    const lectures = lecturesExempleFiche(false)
    return render(
      <AvecRequetes>
        <MemoryRouter>
          <VueFiche
            donnees={construireFiche(lectures, { profil })}
            points={{ etat: 'donnees', donnees: construirePointsFiche(lectures, { profil }) }}
            dernieresSaisies={{ etat: 'donnees', donnees: [] }}
            reessayerDetailsSensibles={null}
            rendreEmplacement={null}
          />
        </MemoryRouter>
      </AvecRequetes>,
    )
  }

  it.each(['berger', 'conseil', 'ministere'] as const)(
    '%s : un bouton par point de la fiche, avec le bon compte',
    (profil) => {
      lireFiche(profil)
      const region = screen.getByRole('region', { name: "Points d'attention" })
      const recues = posees(region)
      expect(recues).toHaveLength(within(region).getAllByRole('article').length)
      expect(recues).toHaveLength(3)
      expect(recues.every((recue) => recue.compte?.type === profil)).toBe(true)
      expect(
        recues.every(
          (recue) => recue.compte?.ministereId === (profil === 'ministere' ? SOCIAL : null),
        ),
      ).toBe(true)
    },
  )

  it('EJP Tech : aucun bouton (T29)', () => {
    lireFiche('admin_plateforme')
    expect(posees()).toHaveLength(0)
  })
})

describe('après la fusion de P1 (boutons réels), à ajouter au point de contrôle de la fusion', () => {
  it.todo(
    'berger et conseil : autant de « Marquer traité » que de points ouverts, sous « À décider » et sur la fiche 04',
  )
  it.todo(
    'ministère : « Changer le statut » et « Marquer traité » sur un point créé et sur un point mentionné, dans « Vos points » (07) et sur « Ma fiche » (12)',
  )
  it.todo(
    'aperçus (Cette semaine, fiche, accueil du ministère) : entourés de ContexteEcrituresPoint avec des écritures simulées, aucun appel à supabase().rpc',
  )
})

describe('« Nouveau point » sur « Ma fiche » (12)', () => {
  const fiche = { ministereId: MINISTERE_EXEMPLE, ministereCode: null }

  it('le ministère a un lien vers /saisir/point', () => {
    dans(<EmplacementNouveauPoint {...fiche} profil="ministere" />)
    expect(screen.getByRole('link', { name: 'Nouveau point' })).toHaveAttribute(
      'href',
      '/saisir/point',
    )
  })

  it.each(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const)(
    '%s : rien',
    (profil) => {
      dans(<EmplacementNouveauPoint {...fiche} profil={profil} />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    },
  )
})
