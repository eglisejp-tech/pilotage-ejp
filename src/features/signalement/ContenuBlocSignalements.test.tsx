import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import type { ContenuBloc } from '@/features/signalement/ContenuBlocSignalements'
import type { GestesEjpTech } from '@/features/signalement/LigneSignalementBloc'
import type { Masquage } from '@/features/moderation/schemas'
import type { EtapeSuivi } from '@/lib/base'

// Bloc « Signalements » d'EJP Tech (T77) : les cas réels des critères d'acceptation de la
// conception (section 6), avec le signalement de Coordination du lundi 26 octobre. Le statut,
// l'âge et la date limite viennent de la base (colonnes de `v_signalement`), jamais de l'horloge.

const RAPPEL = "N'écrivez aucun nom ni information personnelle."
const PRENDRE = 'Prendre en charge'
const REPONDRE = 'Répondre au ministère'
const CLORE = 'Clore le signalement'
const CHAMP_REPONSE = 'Votre réponse à Coordination'
const CHAMP_CLOTURE = 'Réponse au ministère'
const MASQUE = '[texte masqué par EJP Tech]'
/** Référence d'un échec technique (T76), sous la phrase. */
const REFERENCE = /Référence pour EJP Tech : [2-9A-HJKMNP-Z]{6}/

const TEXTE_COORDINATION = 'Problème au niveau de la saisie des événement dans le calendrier'
const QUESTION = 'Quel événement, à quelle date, et quel message s’affiche quand vous enregistrez ?'
const RETOUR = "L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche."

const COORDINATION = '43000000-0000-4000-8000-000000000006'

/** Un signalement tel que `v_signalement` le rend (Reçu aujourd'hui, compte actif). */
function signalement(numero: number, champs: Partial<LigneSignalement> = {}): LigneSignalement {
  return {
    id: `43000000-0000-4000-8000-00000000001${numero}`,
    ministere_id: '10000000-0000-4000-8000-000000000001',
    ministere_nom: 'Communication',
    ecran: 'saisie_evenement',
    texte: `Texte du signalement numéro ${numero}.`,
    saisi_le: '2026-10-26T10:15:00+01:00',
    suivi_id: null,
    commentaire: null,
    clos_le: null,
    ouvert: true,
    clos_recent: false,
    statut: 'recu',
    derniere_etape: null,
    statut_le: '2026-10-26T10:15:00+01:00',
    jours_depuis: 0,
    fin: null,
    reponse_possible_jusquau: null,
    compte_actif: true,
    ...champs,
  }
}

/** Critère 1 : le signalement de Coordination, Reçu, sans ligne de suivi. */
const RECU_COORDINATION = signalement(0, {
  id: COORDINATION,
  ministere_id: '10000000-0000-4000-8000-000000000003',
  ministere_nom: 'Coordination',
  texte: TEXTE_COORDINATION,
})

let numeroLigne = 0
function etape(
  signalementId: string,
  nom: EtapeSuivi,
  saisiLe: string,
  commentaire: string | null = null,
): EtapeDuSuivi {
  numeroLigne += 1
  return {
    id: `d1000000-0000-4000-8000-${String(numeroLigne).padStart(12, '0')}`,
    signalement_id: signalementId,
    etape: nom,
    commentaire,
    saisi_le: saisiLe,
    ordre: numeroLigne,
  }
}

/** Gestes d'EJP Tech, tous réussis par défaut. */
function gestes(champs: Partial<GestesEjpTech> = {}): GestesEjpTech {
  return {
    prendre: vi.fn<GestesEjpTech['prendre']>(() => Promise.resolve()),
    repondre: vi.fn<GestesEjpTech['repondre']>(() => Promise.resolve()),
    clore: vi.fn<GestesEjpTech['clore']>(() => Promise.resolve()),
    ...champs,
  }
}

function liste(
  signalements: LigneSignalement[],
  options: {
    suivi?: EtapeDuSuivi[]
    gestes?: Partial<GestesEjpTech>
    avecMasquer?: boolean
  } = {},
) {
  const lesGestes = gestes(options.gestes)
  const relire = vi.fn()
  const masquer = vi.fn<(masquage: Masquage) => Promise<void>>(() => Promise.resolve())
  const contenu: ContenuBloc = {
    etat: 'liste',
    signalements,
    suivi: options.suivi ?? [],
    gestes: lesGestes,
    relire,
    ...(options.avecMasquer ? { masquer } : {}),
  }
  render(<ContenuBlocSignalements contenu={contenu} />)
  return { gestes: lesGestes, relire, masquer }
}

const groupe = (nom: string) => screen.getByRole('region', { name: nom })
const enTete = (ministere: string) => screen.getByRole('heading', { level: 4, name: ministere })

/** Une promesse qu'on résout à la main : l'état « en cours » se voit. */
function differee() {
  let resoudre: () => void = () => undefined
  const promesse = new Promise<void>((fin) => {
    resoudre = fin
  })
  return { promesse, resoudre }
}

describe('bloc « Signalements » (T77)', () => {
  const EN_COURS = signalement(1, {
    ministere_nom: 'Intégration',
    ecran: 'saisie_session',
    saisi_le: '2026-10-19T09:00:00+02:00',
    statut: 'en_cours',
    derniere_etape: 'en_cours',
    statut_le: '2026-10-20T09:00:00+02:00',
    jours_depuis: 8,
  })
  const REPONDU = signalement(2, {
    ministere_nom: 'Jeunesse',
    statut: 'repondu',
    derniere_etape: 'reponse',
    statut_le: '2026-10-27T09:05:00+01:00',
    reponse_possible_jusquau: '2026-11-03',
  })
  const CLOS = signalement(3, {
    ministere_nom: 'Social',
    ecran: 'saisie_dimanche',
    saisi_le: '2026-10-04T13:10:00+02:00',
    statut: 'clos',
    derniere_etape: 'clos',
    statut_le: '2026-10-08T15:00:00+02:00',
    clos_le: '2026-10-08T15:00:00+02:00',
    ouvert: false,
    clos_recent: true,
    fin: 'ejp_tech',
  })

  it('titre, « 2 signalements à traiter » (Reçu et En cours), puis les trois groupes dans l’ordre', () => {
    liste([EN_COURS, REPONDU, CLOS, RECU_COORDINATION])
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toBeInTheDocument()
    expect(screen.getByText('2 signalements à traiter')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((titre) => titre.textContent)).toEqual([
      'À traiter',
      'En attente du ministère',
      'Clos ces 30 derniers jours',
    ])
    // « À traiter » garde l'ordre de la lecture : du plus ancien au plus récent.
    const aTraiter = within(groupe('À traiter')).getAllByRole('article')
    expect(aTraiter.map((ligne) => ligne.getAttribute('aria-labelledby'))).toEqual([
      `ligne-${EN_COURS.id}`,
      `ligne-${COORDINATION}`,
    ])
    expect(aTraiter[0]).toHaveAccessibleName('Intégration')
    expect(aTraiter[0]).toHaveTextContent('Présence à une session, 19 oct.')
    expect(aTraiter[0]).toHaveTextContent('En cours')
    expect(within(groupe('En attente du ministère')).getAllByRole('article')).toHaveLength(1)
    expect(within(groupe('Clos ces 30 derniers jours')).getAllByRole('article')).toHaveLength(1)
  })

  it('critère 1 : Coordination « Reçu aujourd’hui. », trois gestes nommés par son ministère', () => {
    liste([RECU_COORDINATION])
    expect(screen.getByText('1 signalement à traiter')).toBeInTheDocument()
    const ligne = within(groupe('À traiter')).getByRole('article', { name: 'Coordination' })
    expect(ligne).toHaveTextContent('Ajouter un événement, 26 oct.')
    expect(ligne).toHaveTextContent('Reçu')
    expect(ligne).toHaveTextContent(`« ${TEXTE_COORDINATION} »`)
    expect(within(ligne).getByText("Reçu aujourd'hui.")).toBeInTheDocument()
    for (const nom of [PRENDRE, REPONDRE, CLORE]) {
      expect(within(ligne).getByRole('button', { name: nom })).toHaveAccessibleDescription(
        'Coordination',
      )
    }
    // Le suivi daté commence par l'envoi.
    expect(within(ligne).getByRole('list', { name: 'Suivi' })).toHaveTextContent(
      '26 oct. Signalement envoyé',
    )
    // Les groupes vides n'apparaissent pas.
    expect(screen.queryByRole('region', { name: 'En attente du ministère' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Clos ces 30 derniers jours' })).toBeNull()
  })

  it('l’âge vient de la base : hier, puis la date et le nombre de jours', () => {
    liste([
      signalement(4, { ministere_nom: 'FIJ', jours_depuis: 1 }),
      signalement(5, {
        ministere_nom: 'Social',
        saisi_le: '2026-10-17T10:00:00+02:00',
        statut_le: '2026-10-17T10:00:00+02:00',
        jours_depuis: 9,
      }),
      EN_COURS,
    ])
    expect(screen.getByRole('article', { name: 'FIJ' })).toHaveTextContent('Reçu hier.')
    expect(screen.getByRole('article', { name: 'Social' })).toHaveTextContent(
      'Reçu le 17 oct., il y a 9 jours.',
    )
    const enCours = screen.getByRole('article', { name: 'Intégration' })
    expect(enCours).toHaveTextContent('Pris en charge le 20 oct., il y a 8 jours.')
    // En cours : plus de « Prendre en charge ».
    expect(within(enCours).queryByRole('button', { name: PRENDRE })).toBeNull()
    expect(within(enCours).getByRole('button', { name: REPONDRE })).toBeInTheDocument()
    expect(within(enCours).getByRole('button', { name: CLORE })).toBeInTheDocument()
  })

  it('critère 3 : Répondu, « En attente du ministère » avec la date limite, sans geste', () => {
    const reponse = etape(REPONDU.id, 'reponse', '2026-10-27T09:05:00+01:00', QUESTION)
    liste([REPONDU], { suivi: [reponse] })
    expect(screen.getByText('Aucun signalement à traiter')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'À traiter' })).toBeNull()
    const ligne = within(groupe('En attente du ministère')).getByRole('article')
    expect(ligne).toHaveTextContent(
      "Réponse envoyée le 27 oct. Le ministère peut répondre jusqu'au 3 nov.",
    )
    expect(ligne).toHaveTextContent(`27 oct. Réponse d'EJP Tech : « ${QUESTION} »`)
    expect(within(ligne).queryByRole('button')).toBeNull()
  })

  it('critère 5 : le ministère a répondu, la ligne revient dans « À traiter » avec sa réponse', () => {
    const relance = signalement(0, {
      ...RECU_COORDINATION,
      statut: 'en_cours',
      derniere_etape: 'reponse_ministere',
      statut_le: '2026-10-28T19:40:00+01:00',
      jours_depuis: 7,
    })
    liste([relance], {
      suivi: [
        etape(COORDINATION, 'en_cours', '2026-10-27T09:00:00+01:00'),
        etape(COORDINATION, 'reponse', '2026-10-27T09:05:00+01:00', QUESTION),
        etape(COORDINATION, 'reponse_ministere', '2026-10-28T19:40:00+01:00', RETOUR),
      ],
    })
    const ligne = within(groupe('À traiter')).getByRole('article', { name: 'Coordination' })
    expect(ligne).toHaveTextContent('Le ministère a répondu le 28 oct., il y a 7 jours.')
    const etapes = within(within(ligne).getByRole('list', { name: 'Suivi' })).getAllByRole(
      'listitem',
    )
    // Les guillemets sont suivis et précédés d'espaces insécables.
    expect(etapes.map((item) => item.textContent?.replace(/\s+/g, ' '))).toEqual([
      '26 oct. Signalement envoyé',
      '27 oct. Pris en charge par EJP Tech',
      `27 oct. Réponse d'EJP Tech : « ${QUESTION} »`,
      `28 oct. Réponse du ministère : « ${RETOUR} »`,
    ])
    // Chaque date est un `<time>` au jour de Paris.
    expect(etapes[3]?.querySelector('time')).toHaveAttribute('datetime', '2026-10-28')
  })

  it('critère 14 : sans compte actif, « Clore le signalement » seul, en bouton ordinaire', async () => {
    const { gestes: lesGestes } = liste([{ ...RECU_COORDINATION, compte_actif: false }])
    const ligne = screen.getByRole('article', { name: 'Coordination' })
    expect(ligne).toHaveTextContent("Ce ministère n'a plus de compte actif.")
    expect(within(ligne).queryByRole('button', { name: PRENDRE })).toBeNull()
    expect(within(ligne).queryByRole('button', { name: REPONDRE })).toBeNull()
    await userEvent.click(within(ligne).getByRole('button', { name: CLORE }))
    await userEvent.type(screen.getByLabelText(CHAMP_CLOTURE), 'Le ministère n’a plus de compte.')
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await waitFor(() =>
      expect(lesGestes.clore).toHaveBeenCalledWith({
        signalementId: COORDINATION,
        commentaire: 'Le ministère n’a plus de compte.',
      }),
    )
  })

  it('les clos : les derniers clos d’abord, la fin dite, sans geste', () => {
    const confirme = signalement(6, {
      ministere_nom: 'Communication',
      statut: 'clos',
      derniere_etape: 'regle',
      statut_le: '2026-10-30T18:00:00+01:00',
      clos_le: '2026-10-30T18:00:00+01:00',
      ouvert: false,
      clos_recent: true,
      fin: 'confirme',
    })
    const automatique = signalement(7, {
      ministere_nom: 'Intégration',
      statut: 'clos',
      derniere_etape: 'reponse',
      statut_le: '2026-10-21T00:00:00+02:00',
      clos_le: '2026-10-21T00:00:00+02:00',
      ouvert: false,
      clos_recent: true,
      fin: 'automatique',
    })
    const cloture = etape(
      CLOS.id,
      'clos',
      '2026-10-08T15:00:00+02:00',
      'Transmis à l’administration.',
    )
    liste([CLOS, confirme, automatique], { suivi: [cloture] })
    const lignes = within(groupe('Clos ces 30 derniers jours')).getAllByRole('article')
    expect(lignes.map((ligne) => ligne.getAttribute('aria-labelledby'))).toEqual([
      `ligne-${confirme.id}`,
      `ligne-${automatique.id}`,
      `ligne-${CLOS.id}`,
    ])
    expect(lignes[0]).toHaveTextContent('Confirmé par le ministère le 30 oct.')
    expect(lignes[1]).toHaveTextContent('Clos le 21 oct., sans retour du ministère.')
    expect(lignes[1]).toHaveTextContent('21 oct. Clos, sans retour du ministère')
    // Critère 15 : clos par EJP Tech, avec la réponse que lit le ministère.
    expect(lignes[2]).toHaveTextContent('Clos par EJP Tech le 8 oct.')
    expect(lignes[2]).toHaveTextContent(
      '8 oct. Clos par EJP Tech : « Transmis à l’administration. »',
    )
    expect(within(groupe('Clos ces 30 derniers jours')).queryByRole('button')).toBeNull()
  })

  it('un clos plus ancien que 30 jours (clos_recent faux) n’est pas montré', () => {
    liste([{ ...CLOS, clos_recent: false }])
    expect(screen.queryByRole('region', { name: 'Clos ces 30 derniers jours' })).toBeNull()
  })

  it('rien du tout : « Aucun signalement. », sans groupe ni bouton', () => {
    liste([])
    expect(screen.getByText('Aucun signalement.').closest('[data-situation]')).toHaveAttribute(
      'data-situation',
      'tout_est_fait',
    )
    expect(screen.getByText('Aucun signalement à traiter')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('un texte sans espace (lien collé) se coupe au lieu de déborder', () => {
    const lien = `https://exemple.test/${'a'.repeat(90)}`
    liste([signalement(8, { texte: lien })])
    const texte = screen.getByText(lien, { exact: false })
    expect(texte.closest('p')).toHaveClass('wrap-anywhere', 'min-w-0')
  })

  it('problème passager : « Réessayer » ; chargement : ni compteur ni ligne', async () => {
    const reessayer = vi.fn()
    const { unmount } = render(
      <ContenuBlocSignalements contenu={{ etat: 'probleme', reessayer }} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(reessayer).toHaveBeenCalled()
    unmount()
    render(<ContenuBlocSignalements contenu={{ etat: 'chargement' }} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toBeInTheDocument()
    expect(screen.queryByText(/à traiter/)).toBeNull()
    expect(screen.queryByRole('article')).toBeNull()
  })
})

describe('« Prendre en charge » (critère 2)', () => {
  it('un clic : « Enregistrement en cours », puis le message annoncé et le focus sur l’en-tête', async () => {
    const attente = differee()
    const { gestes: lesGestes } = liste([RECU_COORDINATION], {
      gestes: { prendre: vi.fn(() => attente.promesse) },
    })
    await userEvent.click(screen.getByRole('button', { name: PRENDRE }))
    expect(lesGestes.prendre).toHaveBeenCalledWith(COORDINATION)
    expect(screen.getByRole('button', { name: 'Enregistrement en cours' })).toBeInTheDocument()
    attente.resoudre()
    expect(await screen.findByText('Signalement pris en charge.')).toBeInTheDocument()
    expect(
      screen.getByText('Signalement pris en charge.').closest('[role="status"]'),
    ).not.toBeNull()
    await waitFor(() => expect(enTete('Coordination')).toHaveFocus())
  })

  it('sans réseau : « L’envoi n’a pas abouti. Réessayez. » avec sa référence, sans relire', async () => {
    const { relire } = liste([RECU_COORDINATION], {
      gestes: { prendre: vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))) },
    })
    await userEvent.click(screen.getByRole('button', { name: PRENDRE }))
    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent("L'envoi n'a pas abouti. Réessayez.")
    expect(alerte).toHaveTextContent(REFERENCE)
    expect(relire).not.toHaveBeenCalled()
    // Le bouton redevient actif : on peut réessayer.
    expect(screen.getByRole('button', { name: PRENDRE })).toBeEnabled()
  })

  it('déjà pris en charge par une autre personne : la phrase traduite, puis la liste relue', async () => {
    const { relire } = liste([RECU_COORDINATION], {
      gestes: {
        prendre: vi.fn(() =>
          Promise.reject({ code: 'P0001', message: 'Ce signalement est déjà pris en charge.' }),
        ),
      },
    })
    await userEvent.click(screen.getByRole('button', { name: PRENDRE }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce signalement a déjà été pris en charge. La liste est à jour.',
    )
    expect(relire).toHaveBeenCalled()
  })
})

describe('« Répondre au ministère » (critère 3)', () => {
  it('ouvre le panneau : focus dans le champ, aide, rappel et compteur, note sur la lecture', async () => {
    liste([RECU_COORDINATION])
    const bouton = screen.getByRole('button', { name: REPONDRE })
    expect(bouton).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(bouton)
    expect(bouton).toHaveAttribute('aria-expanded', 'true')
    const champ = screen.getByRole('textbox', { name: CHAMP_REPONSE })
    expect(champ).toHaveFocus()
    expect(document.getElementById(bouton.getAttribute('aria-controls') ?? '')).toContainElement(
      champ,
    )
    expect(champ).toHaveAccessibleDescription(
      `Posez une question, ou dites ce que vous avez fait. ${RAPPEL} 0 sur 280`,
    )
    expect(
      screen.getByText('Coordination lit votre réponse dans Pilotage EJP.'),
    ).toBeInTheDocument()
  })

  it('la question d’EJP Tech : envoyée, « Réponse envoyée. » annoncé, focus sur l’en-tête', async () => {
    const { gestes: lesGestes } = liste([RECU_COORDINATION])
    await userEvent.click(screen.getByRole('button', { name: REPONDRE }))
    await userEvent.type(screen.getByLabelText(CHAMP_REPONSE), QUESTION)
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(lesGestes.repondre).toHaveBeenCalledWith({
      signalementId: COORDINATION,
      texte: QUESTION,
    })
    expect(await screen.findByText('Réponse envoyée.')).toBeInTheDocument()
    expect(screen.queryByLabelText(CHAMP_REPONSE)).toBeNull()
    await waitFor(() => expect(enTete('Coordination')).toHaveFocus())
  })

  it('9 caractères ou 281 : la consigne sous le champ, rien n’est envoyé', async () => {
    const { gestes: lesGestes } = liste([RECU_COORDINATION])
    await userEvent.click(screen.getByRole('button', { name: REPONDRE }))
    const champ = screen.getByLabelText(CHAMP_REPONSE)
    await userEvent.type(champ, 'Neuf lett')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(await screen.findByText('Écrivez au moins 10 caractères.')).toBeInTheDocument()
    await userEvent.clear(champ)
    await userEvent.click(champ)
    await userEvent.paste('a'.repeat(281))
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(
      await screen.findByText('Raccourcissez la réponse : 280 caractères au plus.'),
    ).toBeInTheDocument()
    expect(lesGestes.repondre).not.toHaveBeenCalled()
  })

  it('données personnelles refusées par la base : la phrase sous le champ, texte gardé', async () => {
    liste([RECU_COORDINATION], {
      gestes: {
        repondre: vi.fn(() =>
          Promise.reject({
            code: 'P0001',
            message: "N'écrivez aucun nom ni information personnelle.",
          }),
        ),
      },
    })
    await userEvent.click(screen.getByRole('button', { name: REPONDRE }))
    const champ = screen.getByLabelText(CHAMP_REPONSE)
    await userEvent.type(champ, 'Appelez Jean au 06 12 34 56 78')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(
      await screen.findByText(
        'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
      ),
    ).toBeInTheDocument()
    expect(champ).toHaveValue('Appelez Jean au 06 12 34 56 78')
    expect(champ).toHaveFocus()
  })

  it('EJP Tech a déjà répondu (deux personnes) : la phrase sous les boutons, la liste relue', async () => {
    const { relire } = liste([RECU_COORDINATION], {
      gestes: {
        repondre: vi.fn(() =>
          Promise.reject({
            code: 'P0001',
            message: 'Ce signalement attend le retour du ministère.',
          }),
        ),
      },
    })
    await userEvent.click(screen.getByRole('button', { name: REPONDRE }))
    await userEvent.type(screen.getByLabelText(CHAMP_REPONSE), QUESTION)
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'EJP Tech a déjà répondu à ce signalement. La liste est à jour.',
    )
    expect(relire).toHaveBeenCalled()
    expect(screen.queryByLabelText(CHAMP_REPONSE)).toBeNull()
  })

  it('« Annuler » : sans texte, le panneau se ferme ; avec un texte, « Fermer sans enregistrer ? »', async () => {
    const { gestes: lesGestes } = liste([RECU_COORDINATION])
    const bouton = screen.getByRole('button', { name: REPONDRE })
    await userEvent.click(bouton)
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByLabelText(CHAMP_REPONSE)).toBeNull()
    expect(bouton).toHaveFocus()
    expect(bouton).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(bouton)
    await userEvent.type(screen.getByLabelText(CHAMP_REPONSE), 'Une réponse commencée.')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    const fenetre = screen.getByRole('alertdialog', { name: 'Fermer sans enregistrer ?' })
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Continuer la saisie' }))
    expect(screen.getByLabelText(CHAMP_REPONSE)).toHaveValue('Une réponse commencée.')
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fermer sans enregistrer' }))
    expect(screen.queryByLabelText(CHAMP_REPONSE)).toBeNull()
    expect(screen.getByRole('button', { name: REPONDRE })).toHaveFocus()
    expect(lesGestes.repondre).not.toHaveBeenCalled()
  })
})

describe('« Clore le signalement » (critère 15)', () => {
  // Le même libellé ouvre le panneau et confirme (T66) : le bouton de la ligne laisse sa place au
  // bouton du panneau, qui envoie le formulaire (les autres lignes gardent le leur).
  const confirmer = () => {
    const bouton = screen
      .getAllByRole('button', { name: CLORE })
      .find((candidat) => candidat.getAttribute('type') === 'submit')
    if (!bouton) throw new Error('Aucun panneau de clôture ouvert.')
    return bouton
  }

  it('ouvre le panneau : la réponse au ministère, obligatoire, focus dans le champ', async () => {
    const { gestes: lesGestes } = liste([RECU_COORDINATION])
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    const champ = screen.getByRole('textbox', { name: CHAMP_CLOTURE })
    expect(champ).toHaveFocus()
    expect(champ).toHaveAccessibleDescription(`${RAPPEL} 0 sur 280`)
    expect(
      screen.getByText(
        'Le ministère lit cette réponse dans « Mes signalements ». Un signalement clos ne se rouvre pas.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: CLORE })).toHaveLength(1)
    expect(confirmer()).toHaveAttribute('type', 'submit')
    // Vide : refusé avant l'envoi.
    await userEvent.click(confirmer())
    expect(await screen.findByText('Écrivez au moins 10 caractères.')).toBeInTheDocument()
    expect(lesGestes.clore).not.toHaveBeenCalled()
  })

  it('transmis à l’administration : clos avec la réponse, « Signalement clos. », focus sur l’en-tête', async () => {
    const { gestes: lesGestes } = liste([RECU_COORDINATION])
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.type(
      screen.getByLabelText(CHAMP_CLOTURE),
      'Transmis à l’administration de l’église.',
    )
    await userEvent.click(confirmer())
    expect(lesGestes.clore).toHaveBeenCalledWith({
      signalementId: COORDINATION,
      commentaire: 'Transmis à l’administration de l’église.',
    })
    expect(await screen.findByText('Signalement clos.')).toBeInTheDocument()
    await waitFor(() => expect(enTete('Coordination')).toHaveFocus())
  })

  it('« Annuler » sans texte : le panneau se replie, le focus revient au bouton de la ligne', async () => {
    liste([RECU_COORDINATION])
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByLabelText(CHAMP_CLOTURE)).toBeNull()
    expect(screen.getByRole('button', { name: CLORE })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: CLORE })).toHaveFocus()
  })

  it('« Ce signalement est déjà clos. » : le bloc le dit et relit la liste', async () => {
    const { relire } = liste([RECU_COORDINATION], {
      gestes: {
        clore: vi.fn(() =>
          Promise.reject({ code: 'P0001', message: 'Ce signalement est déjà clos.' }),
        ),
      },
    })
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.type(screen.getByLabelText(CHAMP_CLOTURE), 'Transmis à l’administration.')
    await userEvent.click(confirmer())
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce signalement est déjà clos.')
    expect(relire).toHaveBeenCalled()
  })

  it('le refus « déjà clos » s’efface quand on ouvre un autre panneau', async () => {
    const autre = signalement(9, { saisi_le: '2026-10-26T12:00:00+01:00' })
    liste([RECU_COORDINATION, autre], {
      gestes: {
        clore: vi.fn(() =>
          Promise.reject({ code: 'P0001', message: 'Ce signalement est déjà clos.' }),
        ),
      },
    })
    const [premiere, seconde] = within(groupe('À traiter')).getAllByRole('article')
    await userEvent.click(within(premiere!).getByRole('button', { name: CLORE }))
    await userEvent.type(screen.getByLabelText(CHAMP_CLOTURE), 'Transmis à l’administration.')
    await userEvent.click(confirmer())
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce signalement est déjà clos.')
    await userEvent.click(within(seconde!).getByRole('button', { name: REPONDRE }))
    expect(screen.queryByText('Ce signalement est déjà clos.')).toBeNull()
  })

  it('connexion perdue : la phrase de connexion et sa référence sous le bouton, réponse gardée', async () => {
    liste([RECU_COORDINATION], {
      gestes: { clore: vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))) },
    })
    await userEvent.click(screen.getByRole('button', { name: CLORE }))
    await userEvent.type(screen.getByLabelText(CHAMP_CLOTURE), 'Transmis à l’administration.')
    await userEvent.click(confirmer())
    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent(
      'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
    )
    expect(alerte).toHaveTextContent(REFERENCE)
    expect(screen.getByLabelText(CHAMP_CLOTURE)).toHaveValue('Transmis à l’administration.')
  })
})

describe('« Masquer »', () => {
  const REPONDU = signalement(2, {
    ministere_nom: 'Jeunesse',
    statut: 'repondu',
    derniere_etape: 'reponse',
    statut_le: '2026-10-27T09:05:00+01:00',
    reponse_possible_jusquau: '2026-11-03',
  })

  it('sous le texte du signalement : la cible « signalement », puis « Texte masqué. »', async () => {
    const { masquer } = liste([RECU_COORDINATION], { avecMasquer: true })
    const bouton = screen.getByRole('button', { name: 'Masquer' })
    expect(bouton).toHaveAccessibleDescription('Coordination')
    await userEvent.click(bouton)
    const fenetre = screen.getByRole('dialog')
    expect(fenetre).toHaveTextContent(TEXTE_COORDINATION)
    await userEvent.click(within(fenetre).getByRole('radio', { name: "Nom d'une personne" }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    await waitFor(() =>
      expect(masquer).toHaveBeenCalledWith({
        cible: 'signalement',
        cibleId: COORDINATION,
        champ: 'texte',
        motif: 'nom_personne',
      }),
    )
    expect(await screen.findByText('Texte masqué.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toHaveFocus(),
    )
  })

  it('sous une réponse du suivi : la cible « signalement_suivi », champ « commentaire »', async () => {
    const reponse = etape(REPONDU.id, 'reponse', '2026-10-27T09:05:00+01:00', QUESTION)
    const { masquer } = liste([REPONDU], { suivi: [reponse], avecMasquer: true })
    const boutons = screen.getAllByRole('button', { name: 'Masquer' })
    // Un sous le texte, un sous la réponse d'EJP Tech.
    expect(boutons).toHaveLength(2)
    await userEvent.click(boutons[1]!)
    const fenetre = screen.getByRole('dialog')
    expect(fenetre).toHaveTextContent('Réponse à un signalement')
    expect(fenetre).toHaveTextContent(QUESTION)
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Autre information personnelle' }),
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    await waitFor(() =>
      expect(masquer).toHaveBeenCalledWith({
        cible: 'signalement_suivi',
        cibleId: reponse.id,
        champ: 'commentaire',
        motif: 'autre',
      }),
    )
  })

  it('un texte déjà masqué n’a plus de bouton, ni sous le texte, ni sous la réponse', () => {
    const masque = etape(REPONDU.id, 'reponse', '2026-10-27T09:05:00+01:00', MASQUE)
    liste([{ ...REPONDU, texte: MASQUE }], { suivi: [masque], avecMasquer: true })
    expect(screen.queryByRole('button', { name: 'Masquer' })).toBeNull()
    expect(screen.getAllByText('[texte masqué]', { exact: false })).toHaveLength(2)
  })

  it('sans fonction « masquer » : aucun bouton', () => {
    liste([RECU_COORDINATION])
    expect(screen.queryByRole('button', { name: 'Masquer' })).toBeNull()
    expect(screen.getByRole('button', { name: CLORE })).toBeInTheDocument()
  })
})
