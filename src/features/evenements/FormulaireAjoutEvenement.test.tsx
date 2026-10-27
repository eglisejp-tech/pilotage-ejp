import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { MESSAGE_ENVOI_AUTRES_VALEURS, MESSAGES_COMMUNS } from '@/data/messagesBase'
import { FormulaireAjoutEvenement } from '@/features/evenements/FormulaireAjoutEvenement'
import type { AjoutEvenement, AjoutSerie } from '@/features/evenements/schemas'
import { MESSAGES_BASE, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { RAPPEL_DONNEES_PERSONNELLES } from '@/features/saisie/textes'

const MINISTERES = [
  { id: '10000000-0000-4000-8000-000000000002', nom: 'Coordination' },
  { id: '10000000-0000-4000-8000-000000000005', nom: 'Intégration' },
]

function afficher(
  envoyer: (evenement: AjoutEvenement, numero: string) => Promise<void> = () => Promise.resolve(),
  ministeres = MINISTERES,
  envoyerSerie: (serie: AjoutSerie, numero: string) => Promise<void> = () => Promise.resolve(),
) {
  render(
    <MemoryRouter>
      <FormulaireAjoutEvenement
        aujourdhui="2026-10-06"
        ministereId="10000000-0000-4000-8000-000000000001"
        ministeres={ministeres}
        envoyer={envoyer}
        envoyerSerie={envoyerSerie}
      />
    </MemoryRouter>,
  )
}

async function remplir(date: string) {
  const utilisateur = userEvent.setup()
  await utilisateur.type(screen.getByLabelText('Date'), date)
  await utilisateur.type(screen.getByLabelText("Nom de l'événement"), '  Soirée de louange ')
  await utilisateur.click(screen.getByRole('radio', { name: 'En attente de validation' }))
  await utilisateur.click(screen.getByRole('checkbox', { name: 'Coordination' }))
  return utilisateur
}

const bouton = () => screen.getByRole('button', { name: 'Ajouter au calendrier' })

/** Numéro anti-doublon (T76) : un uuid de version 4. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('« Ajouter un événement » (maquette 11)', () => {
  it('champs, une aide, rappel une seule fois sous le nom, note des mentions et lien', () => {
    afficher()
    // T66 : seule la bulle du statut reste (t128 et t132).
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Aide : Statut' })).toBeInTheDocument()
    expect(screen.getAllByText(RAPPEL_DONNEES_PERSONNELLES)).toHaveLength(1)
    expect(screen.getByLabelText("Nom de l'événement")).toHaveAccessibleDescription(
      RAPPEL_DONNEES_PERSONNELLES,
    )
    expect(screen.queryByText(/Ici, on reporte/)).not.toBeInTheDocument()
    expect(screen.getByText('Le ministère mentionné verra cet événement.')).toBeInTheDocument()
    expect(
      screen.getByText("Vous pourrez les changer jusqu'à la date de l'événement."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveAttribute('min', '2026-10-06')
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
  })

  it('aucun autre ministère actif : une phrase, sans case', () => {
    afficher(undefined, [])
    expect(screen.getByText('Aucun autre ministère à mentionner.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(1)
  })

  it('formulaire vide : un message sous chaque champ obligatoire, rien n’est envoyé', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(envoyer)
    await userEvent.click(bouton())
    expect(await screen.findByText('Choisissez une date.')).toBeInTheDocument()
    expect(screen.getByText("Donnez un nom à l'événement.")).toBeInTheDocument()
    expect(screen.getByText('Choisissez un statut.')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('date passée : refusée avant l’envoi, sous le champ, avec le lien « Signaler une difficulté »', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(envoyer)
    await remplir('2026-10-05')
    await userEvent.click(bouton())
    const message = await screen.findByText(/Cette date est passée\./)
    expect(message).toHaveTextContent(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
    )
    expect(within(message).getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription(message.textContent ?? '')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('envoi : valeurs nettoyées, message de réussite, formulaire vidé', async () => {
    const envoyer = vi.fn<(evenement: AjoutEvenement) => Promise<void>>(() => Promise.resolve())
    afficher(envoyer)
    await remplir('2026-10-10')
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement ajouté au calendrier.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith(
      {
        date: '2026-10-10',
        titre: 'Soirée de louange',
        statut: 'attente_validation',
        mentions: ['10000000-0000-4000-8000-000000000002'],
        heure_prevue: null,
        // « Un jour » (T78, lot 2) : ni dernier jour ni heure de fin.
        date_fin: null,
        heure_fin: null,
      },
      expect.stringMatching(UUID),
    )
    expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Coordination' })).not.toBeChecked()
  })

  it('heure prévue (T68) : facultative, sous la date, avec l’indication sur les cultes', () => {
    afficher()
    const champ = screen.getByLabelText('Heure prévue (facultatif)')
    expect(champ).toHaveAttribute('type', 'time')
    expect(champ).toHaveValue('')
    expect(champ).toHaveAccessibleDescription('Les cultes du dimanche ne se déclarent pas ici.')
    // Jamais d'heure de début à l'ajout.
    expect(screen.queryByLabelText('Heure de début (facultatif)')).toBeNull()
    // Sous la date, avant le nom : l'ordre du formulaire.
    const date = screen.getByLabelText('Date')
    const nom = screen.getByLabelText("Nom de l'événement")
    expect(date.compareDocumentPosition(champ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(champ.compareDocumentPosition(nom) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('heure prévue saisie : elle part en minutes depuis minuit, puis le champ se vide', async () => {
    const envoyer = vi.fn<(evenement: AjoutEvenement) => Promise<void>>(() => Promise.resolve())
    afficher(envoyer)
    const utilisateur = await remplir('2026-10-10')
    await utilisateur.type(screen.getByLabelText('Heure prévue (facultatif)'), '19:05')
    await utilisateur.click(bouton())
    expect(await screen.findByText('Événement ajouté au calendrier.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith(
      expect.objectContaining({ heure_prevue: 1145 }),
      expect.stringMatching(UUID),
    )
    expect(screen.getByLabelText('Heure prévue (facultatif)')).toHaveValue('')
  })

  it('refus de la base sur l’heure prévue (E3) : la phrase du guide, sous le champ', async () => {
    afficher(() => Promise.reject({ code: 'P0001', message: MESSAGES_BASE.heurePrevueInvalide }))
    const utilisateur = await remplir('2026-10-10')
    await utilisateur.type(screen.getByLabelText('Heure prévue (facultatif)'), '19:05')
    await utilisateur.click(bouton())
    expect(await screen.findByText('Choisissez une heure valide.')).toBeInTheDocument()
    expect(screen.getByLabelText('Heure prévue (facultatif)')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Heure prévue (facultatif)')).toHaveFocus()
  })

  it('refus de la base sur la date : sous le champ, avec le lien, valeurs gardées', async () => {
    afficher(() => Promise.reject({ code: 'P0001', message: MESSAGES_BASE.datePasseeAjout }))
    await remplir('2026-10-06')
    await userEvent.click(bouton())
    const message = await screen.findByText(/Cette date est passée\./)
    expect(
      within(message).getByRole('link', { name: 'Signaler une difficulté' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('  Soirée de louange ')
    expect(screen.getByLabelText('Date')).toHaveFocus()
  })

  it('autre refus de la base : traduit sous le bouton ; connexion perdue : valeurs gardées', async () => {
    const envoyer = vi
      .fn<(evenement: AjoutEvenement) => Promise<void>>()
      .mockRejectedValueOnce({ code: 'P0001', message: 'Ce ministère ne peut pas être mentionné.' })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    afficher(envoyer)
    await remplir('2026-10-10')
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(TEXTES_EVENEMENT.erreurMention)
    expect(screen.queryByText(/Référence/)).toBeNull()
    await userEvent.click(bouton())
    // Un ajout parti sans réponse a peut-être été enregistré (T76) : vérifier avant de réessayer.
    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES_COMMUNS.peutEtreFait)
    expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('  Soirée de louange ')
    expect(screen.getByRole('radio', { name: 'En attente de validation' })).toBeChecked()
  })

  // Erreurs d'envoi (T76) : le cas réel du 26 octobre 2026. Coordination, sur iPhone, ajoute un
  // événement avec huit mentions dont FIJ ; la base enregistre, la réponse se perd (Safari :
  // « Load failed », que postgrest-js rend avec un code vide). Réessayer ferait un doublon.
  describe('erreurs d’envoi (T76), cas réel de Coordination', () => {
    const COORDINATION = '10000000-0000-4000-8000-000000000003'
    const HUIT = [
      'FIJ',
      'Communication',
      'Intégration',
      'Louange',
      'Accueil',
      'Média',
      'Social',
      'Prodiges Academy',
    ].map((nom, rang) => ({ id: `10000000-0000-4000-8000-00000000010${rang}`, nom }))
    const REFERENCE = /Référence pour EJP Tech : [2-9A-HJKMNP-Z]{6}/

    function afficherCoordination(
      envoyer: (evenement: AjoutEvenement, numero: string) => Promise<void>,
    ) {
      render(
        <MemoryRouter>
          <FormulaireAjoutEvenement
            aujourdhui="2026-10-26"
            ministereId={COORDINATION}
            ministeres={HUIT}
            envoyer={envoyer}
            envoyerSerie={() => Promise.resolve()}
          />
        </MemoryRouter>,
      )
    }

    async function remplirHuitMentions() {
      const utilisateur = userEvent.setup()
      await utilisateur.type(screen.getByLabelText('Date'), '2026-10-26')
      await utilisateur.type(
        screen.getByLabelText("Nom de l'événement"),
        'Réunion des responsables',
      )
      await utilisateur.click(screen.getByRole('radio', { name: 'En attente de validation' }))
      for (const { nom } of HUIT)
        await utilisateur.click(screen.getByRole('checkbox', { name: nom }))
    }

    it('réponse perdue (« Load failed ») : « Vérifiez la liste », une référence, saisie gardée', async () => {
      const envoyer = vi.fn<(evenement: AjoutEvenement) => Promise<void>>(() =>
        Promise.reject({ code: '', message: 'TypeError: Load failed', details: '', hint: '' }),
      )
      afficherCoordination(envoyer)
      await remplirHuitMentions()
      await userEvent.click(bouton())
      const alerte = await screen.findByRole('alert')
      expect(alerte).toHaveTextContent(MESSAGES_COMMUNS.peutEtreFait)
      expect(alerte).not.toHaveTextContent('encore dans le formulaire')
      expect(alerte).toHaveTextContent(REFERENCE)
      expect(envoyer).toHaveBeenCalledWith(
        expect.objectContaining({ mentions: HUIT.map((ministere) => ministere.id) }),
        expect.stringMatching(UUID),
      )
      expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('Réunion des responsables')
      for (const { nom } of HUIT) expect(screen.getByRole('checkbox', { name: nom })).toBeChecked()
    })

    it('bogue de l’application : le repli et une référence, jamais « La connexion a échoué »', async () => {
      const envoyer = vi.fn(() =>
        Promise.reject({
          code: '',
          message: "TypeError: undefined is not an object (evaluating 'x.y')",
        }),
      )
      afficherCoordination(envoyer)
      await remplirHuitMentions()
      await userEvent.click(bouton())
      const alerte = await screen.findByRole('alert')
      expect(alerte).toHaveTextContent(MESSAGES_COMMUNS.repliSaisie)
      expect(alerte).not.toHaveTextContent('La connexion a échoué')
      expect(alerte).toHaveTextContent(REFERENCE)
    })

    it('passerelle en panne (502, page HTML) : issue inconnue, « Vérifiez la liste », sans le HTML', async () => {
      const envoyer = vi.fn(() =>
        Promise.reject({ message: '<html><body>502 Bad Gateway</body></html>' }),
      )
      afficherCoordination(envoyer)
      await remplirHuitMentions()
      await userEvent.click(bouton())
      const alerte = await screen.findByRole('alert')
      expect(alerte).toHaveTextContent(MESSAGES_COMMUNS.peutEtreFait)
      expect(alerte).not.toHaveTextContent('Bad Gateway')
      expect(alerte).toHaveTextContent(REFERENCE)
    })

    // Lot B : le numéro anti-doublon (Proposé, Q3). Tiré au premier envoi, renvoyé à chaque
    // nouvel essai, oublié après la réussite ou le refus « déjà enregistré ».
    it('nouvel essai à la main après la réponse perdue : le même numéro, puis la réussite', async () => {
      const envoyer = vi
        .fn<(evenement: AjoutEvenement, numero: string) => Promise<void>>()
        .mockRejectedValueOnce({
          code: '',
          message: 'TypeError: Load failed',
          details: '',
          hint: '',
        })
        .mockResolvedValueOnce(undefined)
      afficherCoordination(envoyer)
      await remplirHuitMentions()
      await userEvent.click(bouton())
      expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES_COMMUNS.peutEtreFait)
      await userEvent.click(bouton())
      expect(await screen.findByText('Événement ajouté au calendrier.')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
      const [premier, second] = envoyer.mock.calls.map(([, numero]) => numero)
      expect(premier).toMatch(UUID)
      expect(second).toBe(premier)
      expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('')
    })

    it('après une réussite, un autre événement tire un autre numéro', async () => {
      const envoyer = vi.fn<(evenement: AjoutEvenement, numero: string) => Promise<void>>(() =>
        Promise.resolve(),
      )
      afficherCoordination(envoyer)
      await remplirHuitMentions()
      await userEvent.click(bouton())
      expect(await screen.findByText('Événement ajouté au calendrier.')).toBeInTheDocument()
      await remplirHuitMentions()
      await userEvent.click(bouton())
      await vi.waitFor(() => expect(envoyer).toHaveBeenCalledTimes(2))
      const [premier, second] = envoyer.mock.calls.map(([, numero]) => numero)
      expect(second).toMatch(UUID)
      expect(second).not.toBe(premier)
    })

    it('même numéro, nom corrigé : « Votre premier envoi est déjà enregistré », le numéro oublié', async () => {
      const envoyer = vi
        .fn<(evenement: AjoutEvenement, numero: string) => Promise<void>>()
        .mockRejectedValueOnce({
          code: '',
          message: 'TypeError: Load failed',
          details: '',
          hint: '',
        })
        .mockRejectedValueOnce({ code: 'P0001', message: MESSAGE_ENVOI_AUTRES_VALEURS })
        .mockResolvedValueOnce(undefined)
      afficherCoordination(envoyer)
      await remplirHuitMentions()
      await userEvent.click(bouton())
      await screen.findByRole('alert')
      await userEvent.type(screen.getByLabelText("Nom de l'événement"), ', corrigé')
      await userEvent.click(bouton())
      const alerte = await screen.findByRole('alert')
      expect(alerte).toHaveTextContent(
        'Votre premier envoi est déjà enregistré. Vérifiez la liste avant de réessayer.',
      )
      expect(alerte).not.toHaveTextContent(REFERENCE)
      expect(screen.getByLabelText("Nom de l'événement")).toHaveValue(
        'Réunion des responsables, corrigé',
      )
      // Un nouvel envoi volontaire tire un autre numéro : il créera un autre événement.
      await userEvent.click(bouton())
      await vi.waitFor(() => expect(envoyer).toHaveBeenCalledTimes(3))
      const [premier, second, troisieme] = envoyer.mock.calls.map(([, numero]) => numero)
      expect(second).toBe(premier)
      expect(troisieme).not.toBe(premier)
    })

    it('après un refus (date passée), le numéro reste : la base n’a rien gardé', async () => {
      const envoyer = vi
        .fn<(evenement: AjoutEvenement, numero: string) => Promise<void>>()
        .mockRejectedValueOnce({ code: 'P0001', message: MESSAGES_BASE.datePasseeAjout })
        .mockResolvedValueOnce(undefined)
      afficherCoordination(envoyer)
      await remplirHuitMentions()
      await userEvent.click(bouton())
      await screen.findByText(/Cette date est passée\./)
      await userEvent.click(bouton())
      await vi.waitFor(() => expect(envoyer).toHaveBeenCalledTimes(2))
      const [premier, second] = envoyer.mock.calls.map(([, numero]) => numero)
      expect(second).toBe(premier)
    })
  })

  it('mentions facultatives : le titre du groupe le dit', () => {
    afficher()
    expect(screen.getByRole('group', { name: 'Ministères mentionnés (facultatif)' })).toBeVisible()
  })

  it('la date choisie s’écrit en toutes lettres sous le champ', async () => {
    afficher()
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-10')
    expect(screen.getByText('samedi 10 octobre 2026')).toBeInTheDocument()
  })

  it('statut manquant : l’erreur est reliée à chaque bouton radio', async () => {
    afficher()
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-10')
    await userEvent.type(screen.getByLabelText("Nom de l'événement"), 'Soirée')
    await userEvent.click(bouton())
    const erreur = await screen.findByText('Choisissez un statut.')
    // Les boutons du statut seulement (« Quand ? » a les siens, T78 lot 2).
    for (const radio of within(screen.getByRole('group', { name: 'Statut' })).getAllByRole(
      'radio',
    )) {
      expect(radio).toHaveAttribute('aria-invalid', 'true')
      expect(radio).toHaveAccessibleDescription(
        expect.stringContaining(erreur.textContent ?? 'absent'),
      )
    }
  })

  it('aides au clavier : Entrée ouvre, Échap ferme, le focus reste sur le bouton', async () => {
    afficher()
    const utilisateur = userEvent.setup()
    const aide = screen.getByRole('button', { name: 'Aide : Statut' })
    aide.focus()
    await utilisateur.keyboard('{Enter}')
    expect(aide).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByText('Mettez le statut à jour dès que vous connaissez la décision.'),
    ).toBeInTheDocument()
    await utilisateur.keyboard('{Escape}')
    expect(aide).toHaveAttribute('aria-expanded', 'false')
    expect(aide).toHaveFocus()
  })
})
