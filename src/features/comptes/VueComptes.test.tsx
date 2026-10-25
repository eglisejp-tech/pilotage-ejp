import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErreurCompte } from '@/data/comptes'
import { ApercuComptes } from '@/features/comptes/apercu/ApercuComptes'
import { donneesExemple, lecturesGestionApercu } from '@/features/comptes/apercu/exemples'
import { construireComptes } from '@/features/comptes/construireComptes'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import { VueComptes } from '@/features/comptes/VueComptes'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { simulerLargeur } from '@/test/largeur'

function donnees(): EtatBloc<DonneesComptes> {
  const exemple = donneesExemple()
  return {
    etat: 'donnees',
    donnees: construireComptes(
      exemple.comptes.map((compte) => compte.ligne),
      exemple.ministeres,
      exemple.indicateurs,
      lecturesGestionApercu(exemple),
    ),
  }
}

function actionsFausses(): {
  [K in keyof ActionsComptes]: ReturnType<typeof vi.fn>
} & ActionsComptes {
  return {
    creer: vi.fn(() => Promise.resolve()),
    relancer: vi.fn(() => Promise.resolve()),
    desactiver: vi.fn(() => Promise.resolve()),
    reactiver: vi.fn(() => Promise.resolve()),
    refaireActivation: vi.fn(() => Promise.resolve()),
    corriger: vi.fn(() => Promise.resolve()),
    supprimer: vi.fn(() => Promise.resolve()),
  }
}

/** Ouvre la section repliée des ministères désactivés (Merch et Tech, T74). */
async function afficherDesactives() {
  await userEvent.click(bouton('Afficher les 2 ministères désactivés'))
}

function afficher(etat: EtatBloc<DonneesComptes>, actions: ActionsComptes = actionsFausses()) {
  render(
    <MemoryRouter>
      <VueComptes titre="Ministères et comptes" donnees={etat} actions={actions} />
    </MemoryRouter>,
  )
  return actions
}

const bouton = (nom: string) => screen.getByRole('button', { name: nom })

/** La ligne (tableau) ou le bloc (téléphone) qui contient un élément. */
function ligneDe(element: HTMLElement): HTMLElement {
  const ligne = element.closest<HTMLElement>('[data-cle]')
  if (!ligne) throw new Error('Élément hors de toute ligne.')
  return ligne
}

describe('VueComptes (écran 13)', () => {
  it('chargement : le titre, puis « Chargement des ministères et des comptes » sans bouton d’ajout', async () => {
    afficher({ etat: 'chargement' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ministères et comptes')
    expect(await screen.findByText('Chargement des ministères et des comptes')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter un ministère' })).toBeNull()
  })

  it('problème passager : bandeau et « Réessayer »', async () => {
    const reessayer = vi.fn()
    afficher({ etat: 'erreur', reessayer })
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(bouton('Réessayer'))
    expect(reessayer).toHaveBeenCalled()
  })

  it('premier usage : chaque section garde son titre, sa phrase courte et son bouton d’ajout', () => {
    afficher({
      etat: 'donnees',
      donnees: construireComptes([], [], []),
    })
    expect(screen.getByRole('region', { name: 'Ministères' })).toHaveTextContent('Aucun ministère.')
    expect(screen.getByRole('region', { name: 'EJP Tech' })).toHaveTextContent(
      'Aucun compte EJP Tech.',
    )
    expect(screen.getByRole('region', { name: 'Berger et conseil' })).toHaveTextContent(
      'Aucun compte pour le berger ni le conseil.',
    )
    expect(bouton('Ajouter un compte EJP Tech')).toBeInTheDocument()
    // EJP Tech, qui gère (T60), n'est pas renvoyé vers lui-même.
    expect(screen.getByRole('region', { name: 'EJP Tech' })).not.toHaveTextContent(
      'Le premier compte EJP Tech',
    )
    expect(bouton('Ajouter le compte du berger')).toBeInTheDocument()
  })

  it('« Renvoyer l’invitation » : appel avec l’identifiant, puis le message de réussite', async () => {
    const actions = afficher(donnees())
    await userEvent.click(bouton("Renvoyer l'invitation Conseil, compte 3"))
    expect(actions.relancer).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000014')
    const message = await screen.findByText('Invitation renvoyée à conseil3@exemple.test.')
    // Dans la ligne du compte, sous ses boutons : visible là où la personne a cliqué.
    expect(ligneDe(message)).toContainElement(bouton("Renvoyer l'invitation Conseil, compte 3"))
  })

  it('un refus d’une action directe se dit en français, sous les boutons de sa ligne', async () => {
    const actions = actionsFausses()
    actions.reactiver.mockRejectedValue(new ErreurCompte('ministere_a_deja_un_compte'))
    afficher(donnees(), actions)
    await afficherDesactives()
    await userEvent.click(bouton('Réactiver Merch'))
    const refus = await screen.findByRole('alert')
    expect(refus).toHaveTextContent('Ce ministère a déjà un compte actif. Rechargez la page.')
    expect(ligneDe(refus)).toContainElement(bouton('Réactiver Merch'))
    expect(bouton('Réactiver Merch')).toHaveFocus()
  })

  it('le bouton cliqué disparaît : le focus va au premier bouton de la même ligne', async () => {
    render(
      <MemoryRouter initialEntries={['/apercu/comptes?profil=admin_plateforme']}>
        <ApercuComptes />
      </MemoryRouter>,
    )
    await afficherDesactives()
    await userEvent.click(bouton('Réactiver Merch'))
    expect(await screen.findByText('Ministère Merch réactivé.')).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toHaveAccessibleName(/ Merch$/))
    expect(document.activeElement).not.toHaveAccessibleName('Réactiver Merch')
  })

  it('sans ministère, l’en-tête de la section ne compte pas « 0 actif »', () => {
    afficher({ etat: 'donnees', donnees: construireComptes([], [], []) })
    expect(screen.getByRole('region', { name: 'Ministères' })).not.toHaveTextContent('0 actif')
  })

  it('désactiver passe par la fenêtre ; « Annuler » n’appelle rien', async () => {
    const actions = afficher(donnees())
    await userEvent.click(bouton('Désactiver Communication'))
    const fenetre = screen.getByRole('alertdialog', { name: 'Désactiver Communication ?' })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Annuler' }))
    expect(actions.desactiver).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()

    await userEvent.click(bouton('Désactiver Communication'))
    await userEvent.click(screen.getByRole('button', { name: 'Désactiver le ministère' }))
    expect(actions.desactiver).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000001')
    expect(await screen.findByText('Ministère Communication désactivé.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('refus dans la fenêtre : elle reste ouverte avec le message', async () => {
    const actions = actionsFausses()
    actions.refaireActivation.mockRejectedValue(new ErreurCompte('propre_compte'))
    afficher(donnees(), actions)
    await userEvent.click(bouton("Refaire l'activation Berger"))
    const fenetre = screen.getByRole('alertdialog', { name: "Refaire l'activation de Berger ?" })
    await userEvent.click(within(fenetre).getByRole('button', { name: "Refaire l'activation" }))
    expect(await within(fenetre).findByRole('alert')).toHaveTextContent(
      'Cette action ne se fait pas sur votre propre compte. Demandez-la à un autre compte EJP Tech.',
    )
  })

  it('« Ajouter un ministère » : la demande du panneau, puis le message sur la page', async () => {
    const actions = afficher(donnees())
    await userEvent.click(bouton('Ajouter un ministère'))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nom du ministère' }), 'Tech')
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Email partagé du ministère' }),
      'ejptech1+ministere@exemple.test',
    )
    // L'email d'un ministère porte son indication visible (T66, t277).
    expect(
      screen.getByRole('textbox', { name: 'Email partagé du ministère' }),
    ).toHaveAccessibleDescription(
      "Une boîte mail partagée par le ministère, pas l'adresse d'une personne.",
    )
    await userEvent.click(bouton("Créer et envoyer l'invitation"))
    expect(actions.creer).toHaveBeenCalledWith({
      type: 'ministere',
      nom: 'Tech',
      description: '',
      email: 'ejptech1+ministere@exemple.test',
    })
    expect(
      await screen.findByText(
        'Ministère Tech créé. Invitation envoyée à ejptech1+ministere@exemple.test.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ajouter un ministère' })).toBeNull()
  })

  it('la ligne du compte connecté (EJP Tech) n’a aucun bouton : « Votre compte » (T60)', () => {
    const exemple = donnees()
    const moi = exemple.etat === 'donnees' ? (exemple.donnees.ejpTech[0]?.userId ?? null) : null
    render(
      <MemoryRouter>
        <VueComptes
          titre="Ministères et comptes"
          donnees={exemple}
          actions={actionsFausses()}
          moi={moi}
        />
      </MemoryRouter>,
    )
    const section = screen.getByRole('region', { name: 'EJP Tech' })
    expect(within(section).getByText('Votre compte')).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /EJP Tech, compte 1$/ })).toBeNull()
    // Les autres lignes gardent leurs boutons.
    expect(bouton('Désactiver Communication')).toBeInTheDocument()
  })

  it('« Listes » : EJP Tech, qui gère, ne se demande rien à lui-même (T60)', () => {
    afficher(donnees())
    const listes = screen.getByRole('region', { name: 'Listes' })
    expect(within(listes).getByText("Liste commune à toute l'église.")).toBeInTheDocument()
    expect(within(listes).queryByText(/faites une demande à EJP Tech/)).toBeNull()
  })

  it('les désactivés sont repliés sous la liste ; « Réactiver » et « Supprimer » y restent (T74)', async () => {
    afficher(donnees())
    const ministeres = screen.getByRole('region', { name: 'Ministères' })
    expect(within(ministeres).queryByText('Merch')).toBeNull()
    const ouvrir = bouton('Afficher les 2 ministères désactivés')
    expect(ouvrir).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(ouvrir)
    expect(bouton('Masquer les 2 ministères désactivés')).toHaveAttribute('aria-expanded', 'true')
    expect(bouton('Réactiver Merch')).toBeInTheDocument()
    expect(bouton('Réactiver EJP TECH')).toBeInTheDocument()
    // Tech est vide : « Supprimer » ; Merch a des données : pas de « Supprimer ».
    expect(bouton('Supprimer EJP TECH')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Supprimer Merch' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Supprimer Communication' })).toBeNull()
  })

  it('« Corriger l’adresse » : adresse actuelle, refus d’une adresse identique, puis l’appel', async () => {
    const actions = afficher(donnees())
    // Social : adresse confirmée, code jamais activé (« À activer »).
    await userEvent.click(bouton("Corriger l'adresse Social"))
    expect(
      screen.getByRole('heading', { name: "Corriger l'adresse de Social" }),
    ).toBeInTheDocument()
    expect(screen.getByText('Adresse actuelle : social@exemple.test')).toBeInTheDocument()
    const champ = screen.getByRole('textbox', { name: 'Nouvelle adresse email' })
    expect(champ).toHaveValue('social@exemple.test')
    await userEvent.click(bouton("Corriger et envoyer l'invitation"))
    expect(champ).toHaveAccessibleDescription(
      expect.stringContaining("Saisissez une adresse différente de l'adresse actuelle."),
    )
    expect(actions.corriger).not.toHaveBeenCalled()
    await userEvent.clear(champ)
    await userEvent.type(champ, 'Social.Partage@exemple.test ')
    await userEvent.click(bouton("Corriger et envoyer l'invitation"))
    expect(actions.corriger).toHaveBeenCalledWith(
      '20000000-0000-4000-8000-000000000005',
      'social.partage@exemple.test',
    )
    expect(
      await screen.findByText(
        'Adresse corrigée. Invitation envoyée à social.partage@exemple.test.',
      ),
    ).toBeInTheDocument()
  })

  it('« Réactiver » un compte jamais activé propose de corriger l’adresse au passage (T74)', async () => {
    const actions = actionsFausses()
    afficher(donnees(), actions)
    await afficherDesactives()
    await userEvent.click(bouton('Réactiver EJP TECH'))
    expect(screen.getByRole('heading', { name: 'Réactiver EJP TECH' })).toBeInTheDocument()
    const champ = screen.getByRole('textbox', { name: 'Adresse email' })
    expect(champ).toHaveValue('ejptech1+ministre@exemple.test')
    expect(bouton('Réactiver le ministère')).toBeInTheDocument()
    await userEvent.clear(champ)
    await userEvent.type(champ, 'ejptech1+ministere@exemple.test')
    await userEvent.click(bouton("Réactiver et envoyer l'invitation"))
    expect(actions.reactiver).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000010')
    expect(actions.corriger).toHaveBeenCalledWith(
      '20000000-0000-4000-8000-000000000010',
      'ejptech1+ministere@exemple.test',
    )
    // L'adresse se corrige d'abord, compte encore désactivé, puis le compte se réactive.
    expect(actions.corriger.mock.invocationCallOrder[0]).toBeLessThan(
      actions.reactiver.mock.invocationCallOrder[0] ?? 0,
    )
    expect(
      await screen.findByText(
        'Ministère EJP TECH réactivé. Invitation envoyée à ejptech1+ministere@exemple.test.',
      ),
    ).toBeInTheDocument()
  })

  it('adresse corrigée, mais la réactivation refusée : un nouvel essai ne refait que la réactivation', async () => {
    const actions = actionsFausses()
    actions.reactiver.mockRejectedValueOnce(new ErreurCompte('ministere_a_deja_un_compte'))
    afficher(donnees(), actions)
    await afficherDesactives()
    await userEvent.click(bouton('Réactiver EJP TECH'))
    const champ = screen.getByRole('textbox', { name: 'Adresse email' })
    await userEvent.clear(champ)
    await userEvent.type(champ, 'ejptech1+ministere@exemple.test')
    await userEvent.click(bouton("Réactiver et envoyer l'invitation"))
    expect(
      await screen.findByText('Ce ministère a déjà un compte actif. Rechargez la page.'),
    ).toBeInTheDocument()
    await userEvent.click(bouton("Réactiver et envoyer l'invitation"))
    expect(actions.corriger).toHaveBeenCalledTimes(1)
    expect(actions.reactiver).toHaveBeenCalledTimes(2)
  })

  it('« Supprimer » : la fenêtre dit ce qui disparaît, puis le message en haut de la page', async () => {
    render(
      <MemoryRouter initialEntries={['/apercu/comptes?profil=admin_plateforme']}>
        <ApercuComptes />
      </MemoryRouter>,
    )
    await afficherDesactives()
    await userEvent.click(bouton('Supprimer EJP TECH'))
    const fenetre = screen.getByRole('alertdialog', { name: 'Supprimer EJP TECH ?' })
    expect(fenetre).toHaveTextContent(
      "EJP TECH, ses 8 indicateurs et son compte (ejptech1+ministre@exemple.test) disparaissent de l'outil. Le journal garde la trace de la suppression. C'est définitif.",
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Supprimer le ministère' }))
    expect(await screen.findByText('Ministère EJP TECH supprimé.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    // Seul Merch reste dans la section, encore ouverte.
    expect(bouton('Masquer le ministère désactivé')).toBeInTheDocument()
  })

  it('adresse déjà utilisée : sous le champ, le panneau reste ouvert', async () => {
    const actions = actionsFausses()
    actions.creer.mockRejectedValue(new ErreurCompte('adresse_deja_utilisee'))
    afficher(donnees(), actions)
    await userEvent.click(bouton('Ajouter un membre du conseil'))
    expect(screen.getByText('Nom affiché : Conseil, compte 5')).toBeInTheDocument()
    const champ = screen.getByRole('textbox', { name: 'Email personnel' })
    await userEvent.type(champ, 'conseil1@exemple.test')
    await userEvent.click(bouton("Créer et envoyer l'invitation"))
    expect(actions.creer).toHaveBeenCalledWith({ type: 'conseil', email: 'conseil1@exemple.test' })
    expect(champ).toHaveAccessibleDescription(
      'Cette adresse a déjà un compte. Choisissez une autre adresse.',
    )
  })
})

describe('VueComptes : passage du palier de 600 px pendant une saisie', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    [390, 834],
    [834, 390],
  ])(
    'de %s à %s px : le panneau reste le même, la saisie et le focus sont gardés',
    async (avant, apres) => {
      simulerLargeur(avant)
      const etat = donnees()
      const actions = actionsFausses()
      const ecran = () => (
        <MemoryRouter>
          <VueComptes titre="Ministères et comptes" donnees={etat} actions={actions} />
        </MemoryRouter>
      )
      const { rerender } = render(ecran())
      const utilisateur = userEvent.setup()
      await utilisateur.click(bouton('Ajouter un ministère'))
      const champ = screen.getByRole('textbox', { name: 'Nom du ministère' })
      await utilisateur.type(champ, 'Louange')
      // Téléphone tourné ou fenêtre redimensionnée : le panneau change de forme, pas de contenu.
      simulerLargeur(apres)
      rerender(ecran())
      expect(screen.queryByRole('dialog') !== null).toBe(apres >= 600)
      expect(screen.getByRole('textbox', { name: 'Nom du ministère' })).toBe(champ)
      expect(champ).toHaveValue('Louange')
      expect(champ).toHaveFocus()
      await utilisateur.click(bouton('Retour'))
      expect(screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })).toBeVisible()
    },
  )
})
