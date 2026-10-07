import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMMUNS_EXEMPLE,
  DERNIERES_SAISIES_EXEMPLE,
  lecturesExempleFiche,
} from '@/features/fiche/apercu/exemplesFiche'
import { construireDernieresSaisies } from '@/features/fiche/construireDernieresSaisies'
import { construireFiche, construirePointsFiche } from '@/features/fiche/construireFiche'
import type {
  DerniereSaisieFiche,
  EtatBloc,
  PointFiche,
  ProfilFiche,
} from '@/features/fiche/modeleFiche'
import { VueFiche } from '@/features/fiche/VueFiche'
import { simulerLargeur } from '@/test/largeur'

beforeEach(() => {
  simulerLargeur(1440)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Boutons et liens d'action qu'EJP Tech ne voit jamais (T29). */
const ACTIONS = /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/

function afficher(
  profil: ProfilFiche,
  options: {
    vide?: boolean
    dernieres?: EtatBloc<DerniereSaisieFiche[]>
    points?: EtatBloc<PointFiche[]>
    reessayerDetails?: () => void
  } = {},
) {
  const lectures = lecturesExempleFiche(profil, options.vide ?? false)
  return render(
    <MemoryRouter>
      <VueFiche
        donnees={construireFiche(lectures, { profil })}
        points={
          options.points ?? {
            etat: 'donnees',
            donnees: construirePointsFiche(lectures, { profil }),
          }
        }
        dernieresSaisies={
          options.dernieres ?? {
            etat: 'donnees',
            donnees: construireDernieresSaisies(DERNIERES_SAISIES_EXEMPLE, COMMUNS_EXEMPLE),
          }
        }
        reessayerDetailsSensibles={options.reessayerDetails ?? null}
        rendreEmplacement={null}
      />
    </MemoryRouter>,
  )
}

const aides = () => screen.queryAllByRole('button', { name: /^Aide : / })

describe('VueFiche, berger (04)', () => {
  it('le nom, le chemin vers la liste, la phrase surlignée et la fraîcheur avec son aide', () => {
    afficher('berger')
    expect(screen.getByRole('heading', { level: 1, name: 'Social' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ministères' })).toHaveAttribute('href', '/ministeres')
    expect(screen.getByText('Un point attend une décision').tagName).toBe('MARK')
    expect(screen.getByRole('button', { name: 'Aide : Mis à jour il y a 3 jours' })).toBeVisible()
  })

  it('« moins de 3 » avec son aide, le mois en cours « en cours », jamais un 0 pour une absence', () => {
    afficher('berger')
    // La valeur de la ligne (les autres « moins de 3 » sont dans la répartition repliée).
    expect(screen.getAllByText('moins de 3')[0]).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aide : Bénéficiaires (passages)' })).toBeVisible()
    expect(screen.getByText('Octobre en cours : 7')).toBeInTheDocument()
    expect(screen.getAllByText('Pas encore de saisie').length).toBeGreaterThan(0)
  })

  it('répartition repliée : « masqué » avec son aide, « moins de 3 », « Non réparti » et « Pas de répartition »', async () => {
    afficher('berger')
    await userEvent.click(screen.getByText('Répartition par catégorie'))
    expect(screen.getByText('Pas de répartition pour septembre.')).toBeVisible()
    expect(screen.getByText('masqué')).toBeVisible()
    expect(screen.getAllByText('moins de 3').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/Non réparti/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aide : Malaise : masqué' })).toBeVisible()
  })

  it('précision masquée en --encre-3, précision lisible telle quelle', () => {
    afficher('berger')
    const precision = screen.getByText(/^Précision de septembre/).closest('p')
    expect(precision).not.toBeNull()
    expect(within(precision as HTMLElement).getByText('[texte masqué par EJP Tech]')).toHaveClass(
      'text-encre-3',
    )
    expect(screen.getByText(/collecte de rentrée, tous orientés/)).toBeInTheDocument()
  })

  it('six aides au plus, chacune une fois ; aucun bouton de saisie', async () => {
    afficher('berger')
    await userEvent.click(screen.getByText('Répartition par catégorie'))
    const noms = aides().map((bouton) => bouton.getAttribute('aria-label'))
    expect(noms).toHaveLength(6)
    expect(new Set(noms).size).toBe(6)
    expect(screen.queryByRole('link', { name: ACTIONS })).toBeNull()
  })

  it('points en lecture, et le lien « Tout le journal » filtré sur le ministère', () => {
    afficher('berger')
    const points = screen.getByRole('region', { name: "Points d'attention" })
    expect(within(points).getAllByRole('article')).toHaveLength(3)
    expect(within(points).queryByRole('button')).toBeNull()
    expect(within(points).getByText(/dépassée/)).toHaveClass('text-alerte')
    expect(screen.getByRole('link', { name: 'Tout le journal' })).toHaveAttribute(
      'href',
      '/journal?ministere=10000000-0000-4000-8000-000000000005',
    )
  })
})

describe('VueFiche, EJP Tech en lecture seule (T29)', () => {
  it('aucun bouton ni lien d’action : seuls les boutons d’aide', () => {
    afficher('admin_plateforme')
    const main = document.body
    expect(within(main).queryByRole('link', { name: ACTIONS })).toBeNull()
    for (const bouton of within(main).queryAllByRole('button')) {
      expect(bouton.getAttribute('aria-label')).toMatch(/^Aide : /)
    }
    expect(screen.getByRole('link', { name: 'Tout le journal' })).toHaveAttribute(
      'href',
      '/journal-technique?ministere=10000000-0000-4000-8000-000000000005',
    )
  })
})

describe('VueFiche, ministère sur sa fiche (12)', () => {
  it('ses boutons de saisie, une seule action « Saisir les chiffres du mois »', () => {
    afficher('ministere')
    expect(screen.getByText('Votre ministère')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saisir les chiffres du dimanche' })).toHaveAttribute(
      'href',
      '/saisir/dimanche',
    )
    expect(screen.getByRole('link', { name: 'Saisir une session' })).toHaveAttribute(
      'href',
      '/saisir/session/choisir',
    )
    expect(screen.getAllByRole('link', { name: 'Saisir les chiffres du mois' })).toHaveLength(1)
  })

  it('ses valeurs exactes : ni « moins de 3 » ni « masqué », ni leurs aides', async () => {
    afficher('ministere')
    await userEvent.click(screen.getByText('Répartition par catégorie'))
    expect(screen.queryByText('moins de 3')).toBeNull()
    expect(screen.queryByText('masqué')).toBeNull()
    expect(screen.getByText('Malaise :', { exact: false })).toHaveTextContent('Malaise : 4')
    expect(aides().map((b) => b.getAttribute('aria-label'))).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/Bénéficiaires|masqué/)]),
    )
    expect(
      screen.getByText('À valider par EJP Tech depuis 2 jours. Vous pouvez déjà le saisir.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Mentionné par Intégration.')).toBeInTheDocument()
  })
})

describe('VueFiche, états vides (T36)', () => {
  it('premier usage, berger : les deux textes des indicateurs propres et des points', () => {
    afficher('berger', { vide: true, dernieres: { etat: 'donnees', donnees: [] } })
    expect(
      screen.getByText(
        "Ce ministère n'a pas encore d'indicateur à lui. Il saisit les chiffres communs.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Aucun point ouvert pour Social.')).toBeInTheDocument()
    expect(screen.getByText("Aucune saisie pour l'instant.")).toBeInTheDocument()
    expect(screen.getByText('Aucune saisie')).toBeInTheDocument()
    expect(screen.queryByText('Retirés (0)')).toBeNull()
    expect(screen.queryByText(/^0$/)).toBeNull()
  })

  it('premier usage, ministère : son texte de « Mes indicateurs » et de ses points', () => {
    afficher('ministere', { vide: true })
    expect(
      screen.getByText(
        "Votre ministère n'a pas encore d'indicateur à lui. Les STARs au service, actifs et en FIJ se saisissent déjà chaque dimanche.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Aucun point ouvert pour votre ministère.')).toBeInTheDocument()
  })

  it('« Retirés » : aucun résultat', async () => {
    const lectures = lecturesExempleFiche('berger', false)
    render(
      <MemoryRouter>
        <VueFiche
          donnees={construireFiche(
            { ...lectures, suivi: lectures.suivi.filter((l) => l.etat !== 'retire') },
            { profil: 'berger' },
          )}
          points={{ etat: 'donnees', donnees: [] }}
          dernieresSaisies={{ etat: 'chargement' }}
          rendreEmplacement={null}
        />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByText('Retirés (0)'))
    expect(screen.getByText('Aucun indicateur retiré.')).toBeVisible()
  })

  it('problème passager de « Dernières saisies » : le titre reste, « Réessayer » relance', async () => {
    const reessayer = vi.fn()
    afficher('berger', { dernieres: { etat: 'erreur', reessayer } })
    const bloc = screen.getByRole('region', { name: 'Dernières saisies' })
    expect(within(bloc).getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(within(bloc).getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
  })

  it('problème passager des points : le titre reste, le reste de la fiche aussi', async () => {
    const reessayer = vi.fn()
    afficher('berger', { points: { etat: 'erreur', reessayer } })
    const bloc = screen.getByRole('region', { name: "Points d'attention" })
    expect(within(bloc).getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(within(bloc).getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Social' })).toBeInTheDocument()
    expect(screen.getByText('Octobre en cours : 7')).toBeInTheDocument()
  })

  it('détail des sensibles en échec : « Réessayer » sous les chiffres, sans toucher les lignes', async () => {
    const reessayer = vi.fn()
    afficher('berger', { reessayerDetails: reessayer })
    const bloc = screen.getByRole('region', { name: 'Les chiffres du ministère' })
    expect(within(bloc).getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(within(bloc).getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalledTimes(1)
    expect(within(bloc).getByText('Octobre en cours : 7')).toBeInTheDocument()
  })

  it('un lecteur autre que le ministère lit « À valider par EJP Tech » sur un ajout à valider', () => {
    afficher('berger')
    expect(screen.getByText('À valider par EJP Tech')).toBeInTheDocument()
    expect(screen.queryByText(/Vous pouvez déjà le saisir/)).toBeNull()
  })
})

describe('VueFiche sur téléphone', () => {
  it('chaque rythme se replie ; la section reste ouverte au départ', async () => {
    simulerLargeur(390)
    afficher('berger')
    const resume = screen.getByText('Chaque mois')
    expect(resume.closest('details')).toHaveAttribute('open')
    await userEvent.click(resume)
    expect(resume.closest('details')).not.toHaveAttribute('open')
  })
})
