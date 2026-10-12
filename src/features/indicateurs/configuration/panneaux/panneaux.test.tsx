import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import {
  ID_COMMUNICATION,
  ID_EAGLES,
  ID_JEUNESSE,
  ID_KUMI,
  ID_PROTOCOLE,
  lecturesExemple,
  termesExemple,
} from '@/features/indicateurs/configuration/apercu/exemples'
import { construireMinistere } from '@/features/indicateurs/configuration/construire'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import { VueIndicateursMinistere } from '@/features/indicateurs/configuration/VueIndicateursMinistere'
import type { TypeCompte } from '@/lib/base'

// Les panneaux et les fenêtres de la configuration d'un ministère (lot L3b), avec de fausses
// écritures : ce que chacun montre avant l'envoi, ce qu'il envoie, ce que la base peut refuser.

const creation: CreationPrevus = {
  creer: vi.fn(() => Promise.resolve()),
  enCours: null,
  dernier: null,
  reussite: null,
  envoi: 0,
  refus: null,
}

/** Les écritures, chacune une fausse fonction dont on lit les appels. */
type FausseEcritures = { [Cle in keyof EcrituresIndicateurs]: Mock<EcrituresIndicateurs[Cle]> }

function ecrituresDe(surcharge: Partial<EcrituresIndicateurs> = {}): FausseEcritures {
  return {
    semaine: vi.fn(() => Promise.resolve({ aujourdhui: '2026-10-12', dimanche: '2026-10-11' })),
    ajouter: vi.fn(() => Promise.resolve()),
    ajouterCalcul: vi.fn(() => Promise.resolve()),
    corriger: vi.fn(() => Promise.resolve()),
    retirer: vi.fn(() => Promise.resolve(0)),
    verifier: vi.fn(() => Promise.resolve([])),
    limites: vi.fn(() => Promise.resolve({ ajouts: 1, ajouts_max: 3, lignes: 5, lignes_max: 30 })),
    termes: vi.fn(() => Promise.resolve([])),
    ...surcharge,
  } as unknown as FausseEcritures
}

function afficher(
  ministereId: string,
  ecritures: EcrituresIndicateurs | null = ecrituresDe(),
  profil: TypeCompte = 'admin_eglise',
) {
  const donnees = construireMinistere(ministereId, lecturesExemple())
  if (donnees === null) throw new Error('ministère d’exemple absent')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VueIndicateursMinistere
          titre="Indicateurs d'un ministère"
          profil={profil}
          ministere={{ etat: 'pret', donnees }}
          creation={creation}
          ecritures={ecritures ?? undefined}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const bouton = (nom: string) => screen.getByRole('button', { name: nom })

describe('actions du ministère', () => {
  it('l’administration ajoute un indicateur ou un calcul, sans « Voir la fiche »', () => {
    afficher(ID_COMMUNICATION)
    expect(bouton('Ajouter un indicateur')).toBeInTheDocument()
    expect(bouton('Ajouter un calcul')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Voir la fiche' })).not.toBeInTheDocument()
  })

  it('EJP Tech a en plus « Voir la fiche », qui mène à la fiche du ministère', () => {
    afficher(ID_COMMUNICATION, ecrituresDe(), 'admin_plateforme')
    expect(bouton('Ajouter un indicateur')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir la fiche' })).toHaveAttribute(
      'href',
      `/ministeres/${ID_COMMUNICATION}`,
    )
  })

  it('un ministère sans indicateur (Protocole) peut en recevoir un', () => {
    afficher(ID_PROTOCOLE)
    expect(screen.getByText(/Aucun indicateur pour Protocole/)).toBeInTheDocument()
    expect(bouton('Ajouter un indicateur')).toBeInTheDocument()
  })

  it('sans écritures, l’écran reste en lecture seule ; EJP Tech garde « Voir la fiche »', () => {
    afficher(ID_COMMUNICATION, null)
    expect(screen.queryByRole('button', { name: /^Ajouter/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Retirer/ })).not.toBeInTheDocument()
  })

  it('des boutons de 44 px au moins (classes de cible)', () => {
    afficher(ID_COMMUNICATION)
    expect(bouton('Ajouter un indicateur').className).toContain('min-h-13')
    expect(bouton('Retirer « Publications »').className).toContain('min-h-cible')
  })
})

describe('actions d’une ligne', () => {
  it('« Corriger » seulement tant que rien n’est saisi, jamais sur une suggestion', () => {
    afficher(ID_COMMUNICATION)
    // Jamais saisi : « Demandes reçues ». Saisi : « Publications ». Suggestion : « Projets en cours ».
    expect(bouton('Corriger « Demandes reçues »')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Corriger « Publications »' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Corriger « Projets en cours »' })).toBeNull()
    // Un calcul se propose toujours : la base dit si ses sources ont des valeurs.
    expect(bouton('Corriger « Taux de demandes traitées »')).toBeInTheDocument()
  })

  it('chaque ligne a « Remplacer », « Retirer » et « Retirer pour confidentialité »', () => {
    afficher(ID_COMMUNICATION)
    for (const libelle of ['Publications', 'Projets en cours', 'Taux de demandes traitées']) {
      expect(bouton(`Remplacer « ${libelle} »`)).toBeInTheDocument()
      expect(bouton(`Retirer « ${libelle} »`)).toBeInTheDocument()
      expect(bouton(`Retirer pour confidentialité « ${libelle} »`)).toBeInTheDocument()
    }
  })
})

describe('panneau « Ajouter un indicateur »', () => {
  async function ouvrir(ecritures = ecrituresDe()) {
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Ajouter un indicateur'))
    const panneau = await screen.findByRole('dialog', { name: 'Ajouter un indicateur' })
    return { utilisateur, panneau, ecritures }
  }

  it('montre la place qui reste, un seul rappel, les choix et ce qui change', async () => {
    const { panneau } = await ouvrir()
    expect(
      await within(panneau).findByText('La fiche compte 5 indicateurs sur 30 au plus.'),
    ).toBeVisible()
    expect(
      within(panneau).getAllByText(/N'écrivez aucun nom ni information personnelle/),
    ).toHaveLength(1)
    expect(
      within(panneau).getByRole('radio', { name: /Un compte \(jusqu'à 9 999\)/ }),
    ).toBeChecked()
    expect(within(panneau).getByRole('radio', { name: /Un grand compte/ })).not.toBeChecked()
    expect(within(panneau).getByRole('radio', { name: 'Des euros' })).not.toBeChecked()
    expect(within(panneau).getByText('Ce qui change')).toBeVisible()
    expect(
      within(panneau).getByText('Un indicateur de plus sur la fiche de Communication.'),
    ).toBeVisible()
    expect(within(panneau).getByText('Ce qui ne change pas')).toBeVisible()
    expect(
      within(panneau).getByText('Les autres indicateurs et toutes leurs saisies.'),
    ).toBeVisible()
  })

  it('envoyé vide : chaque champ dit ce qui manque, rien n’est envoyé, le focus va au premier', async () => {
    const { utilisateur, panneau, ecritures } = await ouvrir()
    await utilisateur.click(within(panneau).getByRole('button', { name: "Ajouter l'indicateur" }))
    expect(within(panneau).getByText('Donnez un libellé de 2 à 60 caractères.')).toBeVisible()
    expect(
      within(panneau).getByText("Expliquez ce qu'on compte en 10 à 140 caractères."),
    ).toBeVisible()
    expect(
      within(panneau).getByText(
        'Choisissez le rythme : chaque dimanche, chaque mois ou à ce jour.',
      ),
    ).toBeVisible()
    expect(ecritures.ajouter).not.toHaveBeenCalled()
    expect(within(panneau).getByLabelText('Ce que vous comptez')).toHaveFocus()
  })

  it('envoie l’indicateur, ferme le panneau et annonce « Indicateur ajouté. »', async () => {
    const { utilisateur, panneau, ecritures } = await ouvrir()
    await utilisateur.type(within(panneau).getByLabelText('Ce que vous comptez'), 'Tournages')
    await utilisateur.type(
      within(panneau).getByLabelText("Ce qu'on compte exactement"),
      'Tournages réalisés dans le mois.',
    )
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque mois/ }))
    await utilisateur.click(within(panneau).getByRole('button', { name: "Ajouter l'indicateur" }))
    await waitFor(() => expect(ecritures.ajouter).toHaveBeenCalledTimes(1))
    expect(ecritures.ajouter).toHaveBeenCalledWith(
      ID_COMMUNICATION,
      {
        libelle: 'Tournages',
        definition: 'Tournages réalisés dans le mois.',
        nature: 'mois',
        unite: 'nombre',
        sensible: false,
        pasSensible: false,
      },
      null,
    )
    expect(await screen.findByText('Indicateur ajouté.')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('l’aperçu cite le dernier mois fini, puis le dimanche de référence', async () => {
    const { utilisateur, panneau } = await ouvrir()
    await utilisateur.type(within(panneau).getByLabelText('Ce que vous comptez'), 'Tournages')
    expect(within(panneau).getByText('Tournages : __')).toBeVisible()
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque mois/ }))
    expect(await within(panneau).findByText('Tournages, septembre 2026 : __')).toBeVisible()
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque dimanche/ }))
    expect(await within(panneau).findByText('Tournages, dimanche 11 oct. : __')).toBeVisible()
    await utilisateur.click(within(panneau).getByRole('radio', { name: 'Des euros' }))
    expect(within(panneau).getByText(/Tournages, dimanche 11 oct\. : __.€/)).toBeVisible()
  })

  it('le domaine sensible impose « chaque mois » et un compte simple, et le dit', async () => {
    const { utilisateur, panneau, ecritures } = await ouvrir()
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque dimanche/ }))
    await utilisateur.click(within(panneau).getByRole('radio', { name: 'Des euros' }))
    await utilisateur.click(
      within(panneau).getByRole('checkbox', { name: /Domaine sensible \(santé/ }),
    )
    expect(within(panneau).getByText('Saisi chaque mois, mois en cours compris.')).toBeVisible()
    expect(within(panneau).getByRole('radio', { name: /Chaque mois/ })).toBeChecked()
    expect(within(panneau).getByRole('radio', { name: /Chaque mois/ })).toBeDisabled()
    expect(within(panneau).getByRole('radio', { name: /Un compte/ })).toBeChecked()
    expect(within(panneau).getByRole('radio', { name: 'Des euros' })).toBeDisabled()
    await utilisateur.type(
      within(panneau).getByLabelText('Ce que vous comptez'),
      'Prises en charge',
    )
    await utilisateur.type(
      within(panneau).getByLabelText("Ce qu'on compte exactement"),
      'Prises en charge dans le mois.',
    )
    await utilisateur.click(within(panneau).getByRole('button', { name: "Ajouter l'indicateur" }))
    await waitFor(() => expect(ecritures.ajouter).toHaveBeenCalled())
    expect(ecritures.ajouter.mock.calls[0]?.[1]).toMatchObject({
      sensible: true,
      nature: 'mois',
      unite: 'nombre',
    })
  })

  it('un libellé qui touche au domaine sensible demande la case, ou la confirmation du contraire', async () => {
    const ecritures = ecrituresDe({
      verifier: vi.fn(() =>
        Promise.resolve([
          {
            famille: 'sensible' as const,
            message:
              'Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n’est pas le cas.',
            bloquant: true,
          },
        ]),
      ),
    })
    const { utilisateur, panneau } = await ouvrir(ecritures)
    await utilisateur.type(
      within(panneau).getByLabelText('Ce que vous comptez'),
      'Enfants accueillis',
    )
    expect(
      await within(panneau).findByText(/Ce chiffre semble sensible/, {}, { timeout: 3000 }),
    ).toBeVisible()
    await utilisateur.click(
      within(panneau).getByRole('checkbox', { name: "Ce n'est pas un domaine sensible" }),
    )
    await utilisateur.type(
      within(panneau).getByLabelText("Ce qu'on compte exactement"),
      'Enfants accueillis à la garderie.',
    )
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque mois/ }))
    await utilisateur.click(within(panneau).getByRole('button', { name: "Ajouter l'indicateur" }))
    await waitFor(() => expect(ecritures.ajouter).toHaveBeenCalled())
    expect(ecritures.ajouter.mock.calls[0]?.[1]).toMatchObject({
      sensible: false,
      pasSensible: true,
    })
  })

  it('les refus de la base pendant la frappe s’affichent sous le libellé', async () => {
    const ecritures = ecrituresDe({
      verifier: vi.fn(() =>
        Promise.resolve([
          {
            famille: 'calcul' as const,
            message: 'Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas.',
            bloquant: true,
          },
        ]),
      ),
    })
    const { utilisateur, panneau } = await ouvrir(ecritures)
    await utilisateur.type(
      within(panneau).getByLabelText('Ce que vous comptez'),
      'Taux de présence',
    )
    expect(
      await within(panneau).findByText(
        /Un taux, une moyenne ou une évolution se calcule/,
        {},
        { timeout: 3000 },
      ),
    ).toBeVisible()
    expect(ecritures.verifier).toHaveBeenCalledWith('Taux de présence', 'mois', ID_COMMUNICATION)
  })

  it('le refus de la base à l’envoi reste sous le bouton, ce qui est écrit est gardé', async () => {
    const ecritures = ecrituresDe({
      ajouter: vi.fn(() =>
        Promise.reject({ code: 'P0001', message: 'Cette fiche a déjà « Tournages ».' }),
      ),
    })
    const { utilisateur, panneau } = await ouvrir(ecritures)
    await utilisateur.type(within(panneau).getByLabelText('Ce que vous comptez'), 'Tournages')
    await utilisateur.type(
      within(panneau).getByLabelText("Ce qu'on compte exactement"),
      'Tournages réalisés dans le mois.',
    )
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque mois/ }))
    await utilisateur.click(within(panneau).getByRole('button', { name: "Ajouter l'indicateur" }))
    expect(await within(panneau).findByRole('alert')).toHaveTextContent(
      'Cette fiche a déjà « Tournages ».',
    )
    expect(within(panneau).getByLabelText('Ce que vous comptez')).toHaveValue('Tournages')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('une connexion perdue le dit sans effacer le formulaire', async () => {
    const ecritures = ecrituresDe({ ajouter: vi.fn(() => Promise.reject(new Error('réseau'))) })
    const { utilisateur, panneau } = await ouvrir(ecritures)
    await utilisateur.type(within(panneau).getByLabelText('Ce que vous comptez'), 'Tournages')
    await utilisateur.type(
      within(panneau).getByLabelText("Ce qu'on compte exactement"),
      'Tournages réalisés dans le mois.',
    )
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque mois/ }))
    await utilisateur.click(within(panneau).getByRole('button', { name: "Ajouter l'indicateur" }))
    expect(await within(panneau).findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Ce que vous avez écrit est encore dans le formulaire : réessayez.',
    )
  })

  it('la fiche pleine le dit avant l’envoi, avec le message de la base', async () => {
    const ecritures = ecrituresDe({
      limites: vi.fn(() =>
        Promise.resolve({ ajouts: 0, ajouts_max: 3, lignes: 30, lignes_max: 30 }),
      ),
    })
    const { panneau } = await ouvrir(ecritures)
    expect(
      await within(panneau).findByText(
        'Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.',
      ),
    ).toBeVisible()
  })

  it('Annuler et Échap ferment le panneau sans rien envoyer', async () => {
    const { utilisateur, panneau, ecritures } = await ouvrir()
    await utilisateur.click(within(panneau).getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await utilisateur.click(bouton('Ajouter un indicateur'))
    await screen.findByRole('dialog')
    await utilisateur.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(ecritures.ajouter).not.toHaveBeenCalled()
  })
})

describe('panneau « Ajouter un calcul »', () => {
  async function ouvrir(ministereId = ID_COMMUNICATION, ecritures = ecrituresDe()) {
    const utilisateur = afficher(ministereId, ecritures)
    await utilisateur.click(bouton('Ajouter un calcul'))
    const panneau = await screen.findByRole('dialog', { name: 'Ajouter un calcul' })
    return { utilisateur, panneau, ecritures }
  }

  it('le bas ne propose que les chiffres qui vont avec le haut, jamais le haut lui-même', async () => {
    const { utilisateur, panneau } = await ouvrir()
    await utilisateur.selectOptions(
      within(panneau).getByLabelText('Chiffre du haut'),
      'Publications',
    )
    const bas = within(within(panneau).getByLabelText('Chiffre du bas')).getAllByRole('option')
    expect(bas.map((option) => option.textContent)).toEqual([
      'Choisissez un chiffre',
      'Demandes reçues',
      'Visuels livrés',
    ])
  })

  it('un bas devenu incompatible est effacé quand on change le haut', async () => {
    const { utilisateur, panneau } = await ouvrir()
    const haut = within(panneau).getByLabelText('Chiffre du haut')
    const bas = within(panneau).getByLabelText('Chiffre du bas')
    await utilisateur.selectOptions(haut, 'Publications')
    await utilisateur.selectOptions(bas, 'Visuels livrés')
    await utilisateur.selectOptions(haut, 'Visuels livrés')
    expect(bas).toHaveValue('')
  })

  it('l’aperçu donne des nombres d’exemple, jamais une valeur lue', async () => {
    const { utilisateur, panneau } = await ouvrir()
    expect(within(panneau).getByText(/^Par exemple : 16 sur 20, soit 80.%$/)).toBeVisible()
    await utilisateur.click(within(panneau).getByRole('radio', { name: 'En moyenne' }))
    expect(within(panneau).getByText('Par exemple : 1 240 pour 53, soit 23,4')).toBeVisible()
  })

  it('envoie le calcul et annonce « Calcul ajouté. »', async () => {
    const { utilisateur, panneau, ecritures } = await ouvrir()
    await utilisateur.type(within(panneau).getByLabelText('Nom du calcul'), 'Part des publications')
    await utilisateur.type(
      within(panneau).getByLabelText("Ce qu'on calcule"),
      'Publications sur demandes reçues.',
    )
    await utilisateur.selectOptions(
      within(panneau).getByLabelText('Chiffre du haut'),
      'Publications',
    )
    await utilisateur.selectOptions(
      within(panneau).getByLabelText('Chiffre du bas'),
      'Demandes reçues',
    )
    await utilisateur.click(within(panneau).getByRole('radio', { name: 'En pourcentage' }))
    await utilisateur.click(within(panneau).getByRole('button', { name: 'Ajouter le calcul' }))
    await waitFor(() => expect(ecritures.ajouterCalcul).toHaveBeenCalledTimes(1))
    const lecture = lecturesExemple().indicateurs
    const idDe = (libelle: string) => lecture.find((ligne) => ligne.libelle === libelle)?.id
    expect(ecritures.ajouterCalcul).toHaveBeenCalledWith(
      ID_COMMUNICATION,
      {
        libelle: 'Part des publications',
        definition: 'Publications sur demandes reçues.',
        type: 'taux',
        hautId: idDe('Publications'),
        basId: idDe('Demandes reçues'),
      },
      null,
    )
    expect(await screen.findByText('Calcul ajouté.')).toBeVisible()
  })

  it('envoyé vide : les chiffres et le type manquants sont dits', async () => {
    const { utilisateur, panneau, ecritures } = await ouvrir()
    await utilisateur.click(within(panneau).getByRole('button', { name: 'Ajouter le calcul' }))
    expect(within(panneau).getByText('Choisissez le chiffre du haut.')).toBeVisible()
    expect(within(panneau).getByText('Choisissez le chiffre du bas.')).toBeVisible()
    expect(within(panneau).getByText('Choisissez un taux ou une moyenne.')).toBeVisible()
    expect(ecritures.ajouterCalcul).not.toHaveBeenCalled()
  })

  it('le nom d’un calcul peut dire « taux » : seule la saisie d’un chiffre l’interdit', async () => {
    const ecritures = ecrituresDe({
      verifier: vi.fn(() =>
        Promise.resolve([
          { famille: 'calcul' as const, message: 'Un taux se calcule.', bloquant: true },
          { famille: 'periode' as const, message: 'Inutile d’écrire la période.', bloquant: true },
        ]),
      ),
    })
    const { utilisateur, panneau } = await ouvrir(ID_COMMUNICATION, ecritures)
    await utilisateur.type(within(panneau).getByLabelText('Nom du calcul'), 'Taux du mois')
    expect(
      await within(panneau).findByText('Inutile d’écrire la période.', {}, { timeout: 3000 }),
    ).toBeVisible()
    expect(within(panneau).queryByText('Un taux se calcule.')).not.toBeInTheDocument()
  })

  it.each([
    ['Eagles : un chiffre du dimanche et un du mois ne se calculent pas ensemble', ID_EAGLES],
    ['Kumi : aucun indicateur encore', ID_KUMI],
  ])('%s : la fiche le dit, sans formulaire, et « Retour » ferme', async (_cas, ministere) => {
    const { utilisateur, panneau } = await ouvrir(ministere)
    expect(
      within(panneau).getByText(/Un calcul demande deux indicateurs saisis, actifs/),
    ).toBeVisible()
    expect(within(panneau).queryByLabelText('Nom du calcul')).not.toBeInTheDocument()
    expect(within(panneau).queryByRole('button', { name: 'Ajouter le calcul' })).toBeNull()
    await utilisateur.click(within(panneau).getByRole('button', { name: 'Retour' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('« Jeunesse » : un grand compte et des jours du même rythme se calculent', async () => {
    const { utilisateur, panneau } = await ouvrir(ID_JEUNESSE)
    const haut = within(panneau).getByLabelText('Chiffre du haut')
    await utilisateur.selectOptions(haut, 'Jeunes accompagnés')
    expect(
      within(within(panneau).getByLabelText('Chiffre du bas')).getByRole('option', {
        name: 'Jours de camp',
      }),
    ).toBeInTheDocument()
  })
})

describe('panneau « Corriger »', () => {
  it('prérempli, avec la règle visible, ce qui change et ce qui ne change pas', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Corriger « Demandes reçues »'))
    const panneau = await screen.findByRole('dialog', { name: "Corriger l'indicateur" })
    expect(within(panneau).getByLabelText('Ce que vous comptez')).toHaveValue('Demandes reçues')
    expect(within(panneau).getByLabelText("Ce qu'on compte exactement")).toHaveValue(
      "Demandes reçues : ce qu'on compte, dans l'exemple.",
    )
    expect(
      within(panneau).getByText(
        "Vous pouvez corriger le libellé et la définition tant que rien n'est saisi. Ensuite, remplacez l'indicateur.",
      ),
    ).toBeVisible()
    expect(
      within(panneau).getAllByText(/N'écrivez aucun nom ni information personnelle/),
    ).toHaveLength(1)
    expect(within(panneau).getByText('Le libellé et la définition.')).toBeVisible()
    await utilisateur.clear(within(panneau).getByLabelText('Ce que vous comptez'))
    await utilisateur.type(
      within(panneau).getByLabelText('Ce que vous comptez'),
      'Demandes reçues par mail',
    )
    await utilisateur.click(
      within(panneau).getByRole('button', { name: 'Enregistrer la correction' }),
    )
    await waitFor(() => expect(ecritures.corriger).toHaveBeenCalledTimes(1))
    expect(ecritures.corriger).toHaveBeenCalledWith(ID_COMMUNICATION, expect.any(String), {
      libelle: 'Demandes reçues par mail',
      definition: "Demandes reçues : ce qu'on compte, dans l'exemple.",
    })
    expect(await screen.findByText('Correction enregistrée.')).toBeVisible()
  })

  it('le refus d’un chiffre déjà saisi reste sous le bouton', async () => {
    const ecritures = ecrituresDe({
      corriger: vi.fn(() =>
        Promise.reject({
          code: 'P0001',
          message: 'Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.',
        }),
      ),
    })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Corriger « Taux de demandes traitées »'))
    const panneau = await screen.findByRole('dialog', { name: "Corriger l'indicateur" })
    await utilisateur.type(within(panneau).getByLabelText('Ce que vous comptez'), ' bis')
    await utilisateur.click(
      within(panneau).getByRole('button', { name: 'Enregistrer la correction' }),
    )
    expect(await within(panneau).findByRole('alert')).toHaveTextContent(
      'Ce chiffre a déjà des valeurs',
    )
  })
})

describe('panneau « Remplacer »', () => {
  it('un indicateur : prérempli, avec ce qu’il remplace, et ses saisies restent sous l’ancien', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Remplacer « Publications »'))
    const panneau = await screen.findByRole('dialog', { name: "Remplacer l'indicateur" })
    expect(
      within(panneau).getByText(
        "Remplace « Publications » (chaque mois). Ses saisies restent sous l'ancien indicateur.",
      ),
    ).toBeVisible()
    expect(within(panneau).getByLabelText('Ce que vous comptez')).toHaveValue('Publications')
    expect(within(panneau).getByRole('radio', { name: /Chaque mois/ })).toBeChecked()
    expect(
      within(panneau).getByText(
        "Les saisies de l'ancien indicateur restent sur la fiche, sous son nom. La courbe du nouveau repart de zéro.",
      ),
    ).toBeVisible()
    await utilisateur.click(within(panneau).getByRole('radio', { name: /Chaque dimanche/ }))
    await utilisateur.click(within(panneau).getByRole('button', { name: "Remplacer l'indicateur" }))
    await waitFor(() => expect(ecritures.ajouter).toHaveBeenCalledTimes(1))
    const [ministere, entree, remplace] = ecritures.ajouter.mock.calls[0] ?? []
    expect(ministere).toBe(ID_COMMUNICATION)
    expect(entree).toMatchObject({ libelle: 'Publications', nature: 'dimanche' })
    expect(remplace).toBe(
      lecturesExemple().indicateurs.find((ligne) => ligne.libelle === 'Publications')?.id,
    )
    expect(await screen.findByText('Indicateur remplacé.')).toBeVisible()
  })

  it('un calcul : ses deux chiffres sont relus, puis préremplis', async () => {
    const lectures = lecturesExemple()
    const termes = termesExemple(lectures)
    const ecritures = ecrituresDe({ termes: vi.fn(() => Promise.resolve(termes)) })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Remplacer « Taux de demandes traitées »'))
    const panneau = await screen.findByRole('dialog', { name: 'Remplacer le calcul' })
    expect(await within(panneau).findByLabelText('Chiffre du haut')).toHaveDisplayValue(
      'Visuels livrés',
    )
    expect(within(panneau).getByLabelText('Chiffre du bas')).toHaveDisplayValue('Demandes reçues')
    expect(within(panneau).getByRole('radio', { name: 'En pourcentage' })).toBeChecked()
    await utilisateur.click(within(panneau).getByRole('button', { name: 'Remplacer le calcul' }))
    await waitFor(() => expect(ecritures.ajouterCalcul).toHaveBeenCalledTimes(1))
    expect(ecritures.ajouterCalcul.mock.calls[0]?.[2]).toBe(
      lectures.indicateurs.find((ligne) => ligne.libelle === 'Taux de demandes traitées')?.id,
    )
    expect(await screen.findByText('Calcul remplacé.')).toBeVisible()
  })

  it('si les termes du calcul ne se lisent pas : un message et « Réessayer »', async () => {
    const ecritures = ecrituresDe({ termes: vi.fn(() => Promise.reject(new Error('réseau'))) })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Remplacer « Taux de demandes traitées »'))
    const panneau = await screen.findByRole('dialog', { name: 'Remplacer le calcul' })
    expect(await within(panneau).findByRole('alert')).toHaveTextContent(
      "Le calcul n'a pas pu être lu.",
    )
    expect(within(panneau).getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

describe('fenêtre « Retirer »', () => {
  it('dit ce qui change et ce qui reste, exige un motif, puis retire', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer « Publications »'))
    const fenetre = await screen.findByRole('alertdialog', { name: 'Retirer « Publications » ?' })
    expect(
      within(fenetre).getByText(
        'Il ne sera plus proposé à la saisie. Ses saisies restent sur la fiche. Un indicateur retiré ne revient pas.',
      ),
    ).toBeVisible()
    expect(within(fenetre).getByText('Ses saisies : rien ne se supprime.')).toBeVisible()
    expect(within(fenetre).getAllByRole('radio')).toHaveLength(7)
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Retirer l'indicateur" }))
    expect(within(fenetre).getByText('Choisissez le motif du retrait.')).toBeVisible()
    expect(ecritures.retirer).not.toHaveBeenCalled()
    await utilisateur.click(
      within(fenetre).getByRole('radio', { name: "Doublon d'un autre chiffre" }),
    )
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Retirer l'indicateur" }))
    await waitFor(() => expect(ecritures.retirer).toHaveBeenCalledTimes(1))
    expect(ecritures.retirer).toHaveBeenCalledWith(ID_COMMUNICATION, expect.any(String), 'doublon')
    expect(
      await screen.findByText('Indicateur retiré, ses saisies restent sur la fiche.'),
    ).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('un indicateur sans saisie disparaîtra de la fiche, et le dit', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer « Demandes reçues »'))
    const fenetre = await screen.findByRole('alertdialog')
    expect(
      within(fenetre).getByText(/Il n'a aucune saisie : il disparaîtra de la fiche/),
    ).toBeVisible()
    await utilisateur.click(within(fenetre).getByRole('radio', { name: 'Créé par erreur' }))
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Retirer l'indicateur" }))
    expect(await screen.findByText('Indicateur retiré.')).toBeVisible()
  })

  it('nomme les calculs qui partent avec lui et annonce leur nombre', async () => {
    const lectures = lecturesExemple()
    const termes = termesExemple(lectures)
    const ecritures = ecrituresDe({
      termes: vi.fn(() => Promise.resolve(termes.filter((terme) => terme.role === 'bas'))),
      retirer: vi.fn(() => Promise.resolve(1)),
    })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer « Demandes reçues »'))
    const fenetre = await screen.findByRole('alertdialog')
    expect(
      await within(fenetre).findByText(
        'Le calcul « Taux de demandes traitées » sera retiré aussi.',
      ),
    ).toBeVisible()
    await utilisateur.click(within(fenetre).getByRole('radio', { name: "N'est plus suivi" }))
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Retirer l'indicateur" }))
    expect(await screen.findByText('Indicateur retiré. 1 calcul retiré avec lui.')).toBeVisible()
  })

  it('tant que les calculs liés ne sont pas lus, la confirmation attend', async () => {
    const ecritures = ecrituresDe({ termes: vi.fn(() => new Promise<never>(() => undefined)) })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer « Publications »'))
    const fenetre = await screen.findByRole('alertdialog')
    expect(within(fenetre).getByText('Lecture des calculs liés.')).toBeVisible()
    await utilisateur.click(within(fenetre).getByRole('radio', { name: "N'est plus suivi" }))
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Retirer l'indicateur" }))
    expect(ecritures.retirer).not.toHaveBeenCalled()
  })

  it('un calcul se retire sans lire de dépendants', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer « Taux de demandes traitées »'))
    const fenetre = await screen.findByRole('alertdialog')
    expect(within(fenetre).getByText(/Il ne s'affichera plus sur la fiche/)).toBeVisible()
    expect(ecritures.termes).not.toHaveBeenCalled()
  })

  it('le refus de la base reste dans la fenêtre, qui reste ouverte', async () => {
    const ecritures = ecrituresDe({
      retirer: vi.fn(() =>
        Promise.reject({ code: 'P0001', message: 'Cet indicateur est déjà retiré.' }),
      ),
    })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer « Publications »'))
    const fenetre = await screen.findByRole('alertdialog')
    await utilisateur.click(within(fenetre).getByRole('radio', { name: "N'est plus suivi" }))
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Retirer l'indicateur" }))
    expect(await within(fenetre).findByRole('alert')).toHaveTextContent(
      'Cet indicateur est déjà retiré.',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('une connexion perdue le dit', async () => {
    const ecritures = ecrituresDe({ retirer: vi.fn(() => Promise.reject(new Error('réseau'))) })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer « Publications »'))
    const fenetre = await screen.findByRole('alertdialog')
    await utilisateur.click(within(fenetre).getByRole('radio', { name: "N'est plus suivi" }))
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Retirer l'indicateur" }))
    expect(await within(fenetre).findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
  })

  it('Échap annule et le focus revient au bouton d’origine', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    const ouvreur = bouton('Retirer « Publications »')
    await utilisateur.click(ouvreur)
    await screen.findByRole('alertdialog')
    await utilisateur.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(ouvreur).toHaveFocus()
    expect(ecritures.retirer).not.toHaveBeenCalled()
  })
})

describe('fenêtre « Retirer pour confidentialité »', () => {
  it('dit que le libellé et la définition seront masqués, avant de confirmer', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer pour confidentialité « Publications »'))
    const fenetre = await screen.findByRole('alertdialog', {
      name: 'Retirer « Publications » pour confidentialité ?',
    })
    expect(within(fenetre).getByText(/« \[retiré pour confidentialité\] »/)).toBeVisible()
    expect(within(fenetre).getByText(/Cette action est définitive\./)).toBeVisible()
    expect(
      within(fenetre).getByText(
        "Le libellé et la définition sont masqués. L'indicateur ne s'affiche plus sur aucune fiche.",
      ),
    ).toBeVisible()
    expect(within(fenetre).getByText(/rien ne se supprime/)).toBeVisible()
    expect(within(fenetre).queryAllByRole('radio')).toHaveLength(0)
  })

  it('confirme sans motif à choisir : le motif est « confidentialité »', async () => {
    const ecritures = ecrituresDe()
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer pour confidentialité « Publications »'))
    const fenetre = await screen.findByRole('alertdialog')
    await utilisateur.click(
      within(fenetre).getByRole('button', { name: 'Retirer pour confidentialité' }),
    )
    await waitFor(() => expect(ecritures.retirer).toHaveBeenCalledTimes(1))
    expect(ecritures.retirer).toHaveBeenCalledWith(
      ID_COMMUNICATION,
      expect.any(String),
      'confidentialite',
    )
    expect(await screen.findByText('Indicateur retiré pour confidentialité.')).toBeVisible()
  })

  it('un second clic pendant l’envoi n’envoie rien de plus', async () => {
    let terminer: (() => void) | undefined
    const ecritures = ecrituresDe({
      retirer: vi.fn(
        () =>
          new Promise<number>((resolve) => {
            terminer = () => resolve(0)
          }),
      ),
    })
    const utilisateur = afficher(ID_COMMUNICATION, ecritures)
    await utilisateur.click(bouton('Retirer pour confidentialité « Publications »'))
    const fenetre = await screen.findByRole('alertdialog')
    const confirmer = within(fenetre).getByRole('button', { name: 'Retirer pour confidentialité' })
    await utilisateur.click(confirmer)
    await utilisateur.click(within(fenetre).getByRole('button', { name: 'Envoi en cours' }))
    expect(ecritures.retirer).toHaveBeenCalledTimes(1)
    terminer?.()
    expect(await screen.findByText('Indicateur retiré pour confidentialité.')).toBeVisible()
  })
})
