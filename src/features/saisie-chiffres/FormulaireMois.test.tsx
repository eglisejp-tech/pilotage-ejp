import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  CATEGORIES_EXEMPLE,
  indicateursMoisExemple,
  PRECISION_EXEMPLE,
} from '@/features/saisie-chiffres/apercu/exemples'
import { etatApercuMois } from '@/features/saisie-chiffres/apercu/etatsApercu'
import { champsMois } from '@/features/saisie-chiffres/champs'
import type { ChampChiffre } from '@/features/saisie-chiffres/champs'
import { FormulaireMois } from '@/features/saisie-chiffres/FormulaireMois'
import type { LigneMois } from '@/features/saisie-chiffres/schemas'
import { RAPPEL_DONNEES_PERSONNELLES } from '@/features/saisie/textes'

type Enregistrer = (lignes: LigneMois[]) => Promise<void>

function afficher(
  etat: string | null,
  enregistrer: Enregistrer = vi.fn<Enregistrer>(() => Promise.resolve()),
  champs?: ChampChiffre[],
) {
  const apercu = etatApercuMois(etat)
  if (apercu.etat !== 'pret') throw new Error('état d’aperçu sans formulaire')
  render(
    <MemoryRouter>
      <FormulaireMois
        mois={apercu.mois}
        champs={champs ?? apercu.champs}
        proposes={apercu.proposes}
        rattrapage={apercu.rattrapage}
        enregistrer={enregistrer}
      />
    </MemoryRouter>,
  )
  return enregistrer
}

const total = () => screen.getByLabelText('Bénéficiaires (passages)', { exact: true })
const categorie = (libelle: string) => screen.getByLabelText(libelle, { exact: true })
const precision = () => screen.getByLabelText('Précision (facultatif)', { exact: true })
const bouton = () => screen.getByRole('button', { name: 'Enregistrer les chiffres du mois' })

describe('FormulaireMois (« Chiffres du mois »)', () => {
  it('le choix du mois et quatre aides : période, sensible, à valider, répartition', () => {
    afficher(null)
    expect(screen.getByText("Chiffres d'août")).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Août 2026' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Septembre 2026 (en cours)' })).toHaveAttribute(
      'href',
      '/saisir/mois?mois=2026-09',
    )
    expect(
      screen.getByText('Lue par votre ministère, le berger, le conseil et EJP Tech.'),
    ).toBeInTheDocument()
    expect(screen.getByText('0 sur 280')).toBeInTheDocument()
  })

  it('« Non réparti » en direct ; une somme trop grande se dit sous la grille et rien ne part', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher(null)
    await utilisateur.type(total(), '7')
    await utilisateur.type(categorie('Malaise'), '4')
    await utilisateur.type(categorie('Blessure'), '2')
    expect(screen.getByText('Non réparti : 1')).toBeInTheDocument()
    await utilisateur.clear(categorie('Malaise'))
    await utilisateur.type(categorie('Malaise'), '9')
    expect(
      screen.getByText('La somme des catégories (11) dépasse le total du mois (7).'),
    ).toBeInTheDocument()
    await utilisateur.click(bouton())
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('une somme trop grande : le message est relié au groupe et aux cases, le focus va à la première case', async () => {
    const utilisateur = userEvent.setup()
    afficher(null)
    const grille = screen.getByRole('group', { name: 'Répartition (facultatif)' })
    expect(grille).not.toHaveAttribute('aria-describedby')
    expect(categorie('Malaise')).not.toHaveAttribute('aria-invalid')
    await utilisateur.type(total(), '7')
    await utilisateur.type(categorie('Malaise'), '9')
    expect(grille).toHaveAccessibleDescription(
      'La somme des catégories (9) dépasse le total du mois (7).',
    )
    for (const libelle of ['Malaise', 'Blessure', 'Autre']) {
      expect(categorie(libelle)).toHaveAttribute('aria-invalid', 'true')
      expect(categorie(libelle)).toHaveAccessibleDescription(
        'La somme des catégories (9) dépasse le total du mois (7).',
      )
    }
    await utilisateur.click(bouton())
    expect(categorie('Malaise')).toHaveFocus()
    await utilisateur.clear(categorie('Malaise'))
    await utilisateur.type(categorie('Malaise'), '4')
    expect(grille).not.toHaveAttribute('aria-describedby')
    expect(categorie('Malaise')).not.toHaveAttribute('aria-invalid')
  })

  it('la ligne du bas dit que la dernière saisie compte quand « Déjà saisi » est affiché', () => {
    afficher(null)
    expect(
      screen.getByText("Votre saisie s'ajoute à l'historique, elle ne remplace rien."),
    ).toBeInTheDocument()
    cleanup()
    afficher('correction')
    expect(
      screen.getByText(
        "Votre saisie s'ajoute à l'historique. Dans les totaux, c'est la dernière qui compte.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/elle ne remplace rien/)).toBeNull()
  })

  it('une précision de 9 caractères est refusée sous le champ ; 10 caractères partent', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher(null)
    await utilisateur.type(total(), '3')
    await utilisateur.type(precision(), 'a'.repeat(9))
    await utilisateur.click(bouton())
    expect(
      screen.getByText('Écrivez au moins 10 caractères, ou laissez la précision vide.'),
    ).toBeInTheDocument()
    expect(precision()).toHaveFocus()
    expect(enregistrer).not.toHaveBeenCalled()
    await utilisateur.type(precision(), 'b')
    await utilisateur.click(bouton())
    expect(enregistrer).toHaveBeenCalledWith([
      { indicateur_id: 'mois-passages', valeur: 3, precision: `${'a'.repeat(9)}b` },
    ])
    expect(await screen.findByText("Chiffres d'août 2026 enregistrés.")).toBeInTheDocument()
  })

  it('le rappel sur les données personnelles, une seule fois, sous le premier champ « Précision »', () => {
    const indicateurs = indicateursMoisExemple(true)
    const second = { ...indicateurs[0]!, id: 'mois-ecoutes', libelle: 'Écoutes', ordre: 5 }
    const champs = champsMois({
      mois: '2026-08',
      indicateurs: [...indicateurs, second],
      mesuresMois: [],
      categories: CATEGORIES_EXEMPLE,
      details: [],
    })
    afficher(null, undefined, champs)
    expect(screen.getAllByLabelText('Précision (facultatif)')).toHaveLength(2)
    expect(screen.getAllByText(RAPPEL_DONNEES_PERSONNELLES)).toHaveLength(1)
    const [premier] = screen.getAllByLabelText('Précision (facultatif)')
    expect(premier?.getAttribute('aria-describedby')).toContain('rappel')
  })

  it('correction : total, précision et grille repris ; sans y toucher, rien ne part', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher('correction')
    expect(total()).toHaveValue('7')
    expect(precision()).toHaveValue(PRECISION_EXEMPLE)
    expect(categorie('Malaise')).toHaveValue('4')
    expect(categorie('Blessure')).toHaveValue('3')
    expect(categorie('Autre')).toHaveValue('0')
    expect(screen.getByText('Non réparti : 0')).toBeInTheDocument()
    expect(screen.getByText('Videz le champ pour retirer cette précision.')).toBeInTheDocument()
    await utilisateur.click(bouton())
    expect(enregistrer).not.toHaveBeenCalled()
    expect(
      screen.getByText('Cette saisie est déjà enregistrée. Changez un chiffre pour la corriger.'),
    ).toBeInTheDocument()
  })

  it('correction du total : la précision et la répartition reprises partent avec lui', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher('correction')
    await utilisateur.clear(total())
    await utilisateur.type(total(), '9')
    expect(screen.getByText('Non réparti : 2')).toBeInTheDocument()
    await utilisateur.click(bouton())
    expect(enregistrer).toHaveBeenCalledWith([
      {
        indicateur_id: 'mois-passages',
        valeur: 9,
        categories: { malaise: 4, blessure: 3, autre: 0 },
        precision: PRECISION_EXEMPLE,
      },
    ])
  })

  it('une précision vidée : le total repart sans précision (elle disparaît de l’affichage)', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher('correction')
    await utilisateur.clear(precision())
    await utilisateur.click(bouton())
    expect(enregistrer).toHaveBeenCalledWith([
      {
        indicateur_id: 'mois-passages',
        valeur: 7,
        categories: { malaise: 4, blessure: 3, autre: 0 },
      },
    ])
  })

  it('une précision masquée par EJP Tech n’est pas reprise, et le champ le dit', () => {
    afficher('masquee')
    expect(precision()).toHaveValue('')
    expect(
      screen.getByText('Votre précision de ce mois a été masquée par EJP Tech.'),
    ).toBeInTheDocument()
  })

  it('un refus de la base sur le texte s’affiche sous le champ « Précision », tel quel', async () => {
    const utilisateur = userEvent.setup()
    const refus = vi.fn<Enregistrer>(() =>
      Promise.reject({ code: 'P0001', message: "N'écrivez aucun nom ni information personnelle." }),
    )
    afficher('correction', refus)
    await utilisateur.clear(precision())
    await utilisateur.type(precision(), 'Texte modifié pour ce mois.')
    await utilisateur.click(bouton())
    // Le rappel sous le champ contient la même phrase : l'erreur se trouve par son identifiant.
    const message = await waitFor(() => {
      const erreur = document.querySelector('[id^="precision-"][id$="-erreur"]')
      expect(erreur).not.toBeNull()
      return erreur as HTMLElement
    })
    expect(message).toHaveTextContent("N'écrivez aucun nom ni information personnelle.")
    expect(precision().getAttribute('aria-describedby')).toContain(message.id)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(precision()).toHaveValue('Texte modifié pour ce mois.')
    // Le focus va au champ : le lecteur d'écran lit l'erreur avec lui.
    expect(precision()).toHaveFocus()
    // Modifier le champ retire l'erreur de la base.
    await utilisateur.type(precision(), ' Suite.')
    expect(document.querySelector('[id^="precision-"][id$="-erreur"]')).toBeNull()
  })

  it('premier usage sans rien saisir : « Saisissez au moins un chiffre. »', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = afficher(null)
    await utilisateur.click(bouton())
    expect(screen.getByRole('alert')).toHaveTextContent('Saisissez au moins un chiffre.')
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('l’unité en suffixe, sans la lire deux fois, et le lien « Signaler une difficulté »', () => {
    afficher(null)
    expect(screen.getByText('€')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('jours')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_mois',
    )
  })
})
