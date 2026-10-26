import { describe, expect, it } from 'vitest'
import type { LigneEtatCompte } from '@/data/comptes'
import type { MinistereListe } from '@/data/ministeres'
import { actionsDeLaLigne } from '@/features/comptes/actionsLigne'
import {
  construireComptes,
  numeroDuLibelle,
  prochainLibelle,
} from '@/features/comptes/construireComptes'
import {
  complementMinisteres,
  confirmationDesactiverMinistere,
  confirmationSupprimerMinistere,
  libelleEtat,
  libelleIndicateurs,
  TEXTES_COMPTES,
} from '@/features/comptes/textes'

const m = (n: number) => `10000000-0000-4000-8000-00000000000${n}`
const u = (n: number) => `20000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`

function compte(n: number, valeurs: Partial<LigneEtatCompte>): LigneEtatCompte {
  return {
    user_id: u(n),
    type: 'conseil',
    libelle: `Conseil, compte ${n}`,
    ministere_id: null,
    email: `compte${n}@exemple.test`,
    desactive_le: null,
    etat: 'activee',
    ...valeurs,
  }
}

const MINISTERES: MinistereListe[] = [
  { id: m(1), code: null, nom: 'Social', desactive_le: null },
  { id: m(2), code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: m(3), code: 'fij', nom: 'FIJ', desactive_le: null },
  { id: m(4), code: null, nom: 'Merch', desactive_le: '2026-10-02T07:30:00Z' },
  { id: m(5), code: null, nom: 'Ancien', desactive_le: '2026-01-02T07:30:00Z' },
  { id: m(6), code: null, nom: 'Communication', desactive_le: null },
  { id: m(7), code: null, nom: 'Tech', desactive_le: '2026-10-20T07:30:00Z' },
]

const COMPTES: LigneEtatCompte[] = [
  compte(1, {
    type: 'ministere',
    libelle: 'Ministère Social',
    ministere_id: m(1),
    etat: 'a_activer',
  }),
  compte(3, { type: 'ministere', libelle: 'Ministère FIJ', ministere_id: m(3) }),
  // Merch : deux comptes désactivés, le plus récent compte.
  compte(4, {
    type: 'ministere',
    libelle: 'Ministère Merch',
    ministere_id: m(4),
    etat: 'desactive',
    desactive_le: '2026-09-01T07:30:00Z',
  }),
  compte(5, {
    type: 'ministere',
    libelle: 'Ministère Merch',
    ministere_id: m(4),
    etat: 'desactive',
    // 23 h 30 à Paris le 1er octobre, en UTC : le jour de Paris est le 2.
    desactive_le: '2026-10-01T22:30:00Z',
  }),
  compte(6, { type: 'ministere', libelle: 'Ministère Communication', ministere_id: m(6) }),
  // Tech : désactivé sans avoir jamais été activé (T74).
  compte(7, {
    type: 'ministere',
    libelle: 'Ministère Tech',
    ministere_id: m(7),
    etat: 'desactive',
    desactive_le: '2026-10-20T07:30:00Z',
  }),
  compte(11, {
    type: 'berger',
    libelle: 'Berger',
    etat: 'desactive',
    desactive_le: '2026-05-01T08:00:00Z',
  }),
  compte(12, { libelle: 'Conseil, compte 2' }),
  compte(13, { libelle: 'Conseil, compte 10', etat: 'invitation_envoyee' }),
  compte(14, {
    libelle: 'Conseil, compte 3',
    etat: 'desactive',
    desactive_le: '2026-09-30T10:00:00Z',
  }),
  compte(21, { type: 'admin_eglise', libelle: "Administration de l'église" }),
  compte(31, { type: 'admin_plateforme', libelle: 'EJP Tech, compte 2' }),
  compte(32, { type: 'admin_plateforme', libelle: 'EJP Tech, compte 1' }),
]

const INDICATEURS = [
  { ministere_id: m(6) },
  { ministere_id: m(6) },
  { ministere_id: m(1) },
  { ministere_id: null },
]

// Lectures d'EJP Tech (T74, T75) : les raisons d'un refus de suppression, comme la base les rend
// (Social est vide, Tech n'a qu'une session à quitter, Communication a des chiffres et un compte
// activé, Merch des chiffres, Coordination et FIJ sont de référence) ; Tech, Social et le
// conseil 10 n'ont jamais été activés.
const GESTION = {
  raisons: [
    { ministere_id: m(2), code: 'ministere_de_reference', nombre: 1, bloque: true },
    { ministere_id: m(3), code: 'ministere_de_reference', nombre: 1, bloque: true },
    { ministere_id: m(4), code: 'chiffres', nombre: 30, bloque: true },
    { ministere_id: m(6), code: 'compte_deja_active', nombre: 1, bloque: true },
    { ministere_id: m(6), code: 'chiffres', nombre: 12, bloque: true },
    { ministere_id: m(7), code: 'sessions_attendues', nombre: 1, bloque: false },
  ],
  jamaisActives: [u(1), u(7), u(13)],
}

describe('construireComptes (écran 13)', () => {
  const donnees = construireComptes(COMPTES, MINISTERES, INDICATEURS, GESTION)

  it('ministères actifs par nom, ministère sans compte compris ; les désactivés à part (T74)', () => {
    expect(donnees.ministeres.map((ligne) => [ligne.nom, ligne.etat])).toEqual([
      ['Communication', 'activee'],
      ['Coordination', 'sans_compte'],
      ['FIJ', 'activee'],
      ['Social', 'a_activer'],
    ])
    expect(donnees.ministeresDesactives.map((ligne) => ligne.nom)).toEqual(['Merch', 'Tech'])
    expect(donnees.nbMinisteresActifs).toBe(4)
  })

  it('un ministère sans compte : aucune adresse, la seule action « Créer le compte »', () => {
    const coordination = donnees.ministeres[1]
    expect(coordination).toMatchObject({ userId: null, email: null, ministereId: m(2) })
    expect(actionsDeLaLigne({ etat: 'sans_compte', suppression: null })).toEqual(['creer'])
  })

  it('le dernier compte désactivé d’un ministère, avec le jour de Paris', () => {
    const merch = donnees.ministeresDesactives[0]
    expect(merch).toMatchObject({ userId: u(5), desactiveLe: '2026-10-02' })
    expect(libelleEtat('desactive', merch?.desactiveLe ?? null)).toBe('Désactivé le 2 oct.')
  })

  it('jamais activé : par son état pour un compte actif, par la lecture pour un désactivé', () => {
    const jamais = (nom: string) =>
      [
        ...donnees.ministeres,
        ...donnees.ministeresDesactives,
        ...donnees.bergerConseil,
        ...donnees.bergerConseilDesactives,
      ].find((ligne) => ligne.nom === nom)?.jamaisActive
    expect(jamais('Social')).toBe(true)
    expect(jamais('Conseil, compte 10')).toBe(true)
    expect(jamais('Tech')).toBe(true)
    expect(jamais('Merch')).toBe(false)
    expect(jamais('Communication')).toBe(false)
    expect(jamais('Conseil, compte 3')).toBe(false)
  })

  it('suppression (T75) : chaque ministère a ses raisons et ses sessions, jamais une personne', () => {
    const suppression = (nom: string) =>
      [...donnees.ministeres, ...donnees.ministeresDesactives].find((l) => l.nom === nom)
        ?.suppression
    expect(suppression('Social')).toEqual({ raisons: [], sessions: 0 })
    expect(suppression('Tech')).toEqual({ raisons: [], sessions: 1 })
    expect(suppression('Communication')).toEqual({
      raisons: [
        { code: 'compte_deja_active', nombre: 1 },
        { code: 'chiffres', nombre: 12 },
      ],
      sessions: 0,
    })
    expect(suppression('Merch')?.raisons).toEqual([{ code: 'chiffres', nombre: 30 }])
    expect(suppression('Coordination')?.raisons).toEqual([
      { code: 'ministere_de_reference', nombre: 1 },
    ])
    expect(suppression('FIJ')?.raisons.map((r) => r.code)).toEqual(['ministere_de_reference'])
    expect(
      [...donnees.bergerConseil, ...donnees.bergerConseilDesactives, ...donnees.ejpTech].every(
        (ligne) => ligne.suppression === null,
      ),
    ).toBe(true)
    // En lecture seule (administration), aucune suppression.
    const lecture = construireComptes(COMPTES, MINISTERES, INDICATEURS)
    expect(
      [...lecture.ministeres, ...lecture.ministeresDesactives].every((l) => l.suppression === null),
    ).toBe(true)
  })

  it('indicateurs propres comptés par ministère ; FIJ marqué', () => {
    expect(donnees.ministeres.map((ligne) => ligne.indicateurs)).toEqual([2, 0, 0, 1])
    expect(donnees.ministeres.find((ligne) => ligne.nom === 'FIJ')?.fij).toBe(true)
    expect(libelleIndicateurs(0)).toBe('Aucun')
    expect(libelleIndicateurs(1)).toBe('1 indicateur')
    expect(libelleIndicateurs(12)).toBe('12 indicateurs')
  })

  it('berger d’abord, puis le conseil par numéro, les désactivés à part ; jamais l’administration', () => {
    expect(donnees.bergerConseil.map((ligne) => ligne.nom)).toEqual([
      'Conseil, compte 2',
      'Conseil, compte 10',
    ])
    expect(donnees.bergerConseilDesactives.map((ligne) => ligne.nom)).toEqual([
      'Berger',
      'Conseil, compte 3',
    ])
    expect(donnees.ejpTech.map((ligne) => ligne.nom)).toEqual([
      'EJP Tech, compte 1',
      'EJP Tech, compte 2',
    ])
    expect(donnees.ejpTechDesactives).toEqual([])
    const toutes = [
      ...donnees.ministeres,
      ...donnees.ministeresDesactives,
      ...donnees.bergerConseil,
      ...donnees.bergerConseilDesactives,
      ...donnees.ejpTech,
    ]
    expect(toutes.some((ligne) => ligne.type === 'admin_eglise')).toBe(false)
  })

  it('aucun berger actif : « Ajouter le compte du berger » apparaît', () => {
    expect(donnees.bergerActif).toBe(false)
    const avecBerger = construireComptes(
      [...COMPTES, compte(15, { type: 'berger', libelle: 'Berger' })],
      MINISTERES,
      [],
    )
    expect(avecBerger.bergerActif).toBe(true)
  })

  it('prochain libellé : le plus grand numéro plus un, désactivés compris, jamais réutilisé', () => {
    expect(donnees.prochainConseil).toBe('Conseil, compte 11')
    expect(donnees.prochainEjpTech).toBe('EJP Tech, compte 3')
    expect(prochainLibelle([], 'conseil')).toBe('Conseil, compte 1')
    expect(numeroDuLibelle('Conseil, compte 12')).toBe(12)
    expect(numeroDuLibelle('Berger')).toBeNull()
  })
})

describe('actions et textes d’une ligne', () => {
  it('chaque état a ses boutons (BRIEF, section 9 ; T74)', () => {
    const sans = { suppression: null }
    expect(actionsDeLaLigne({ etat: 'invitation_envoyee', ...sans })).toEqual([
      'relancer',
      'corriger',
      'desactiver',
    ])
    expect(actionsDeLaLigne({ etat: 'a_activer', ...sans })).toEqual(['corriger', 'desactiver'])
    expect(actionsDeLaLigne({ etat: 'activee', ...sans })).toEqual(['refaire', 'desactiver'])
    expect(actionsDeLaLigne({ etat: 'desactive', ...sans })).toEqual(['reactiver'])
  })

  it('« Supprimer » en dernier sur chaque ministère, qu’il se supprime ou non (T75)', () => {
    const vide = { suppression: { raisons: [], sessions: 0 } }
    const refuse = {
      suppression: { raisons: [{ code: 'chiffres' as const, nombre: 12 }], sessions: 0 },
    }
    for (const ministere of [vide, refuse]) {
      expect(actionsDeLaLigne({ etat: 'invitation_envoyee', ...ministere })).toEqual([
        'relancer',
        'corriger',
        'desactiver',
        'supprimer',
      ])
      expect(actionsDeLaLigne({ etat: 'a_activer', ...ministere })).toEqual([
        'corriger',
        'desactiver',
        'supprimer',
      ])
      // Un compte activé aussi : la fenêtre dira pourquoi il ne se supprime pas.
      expect(actionsDeLaLigne({ etat: 'activee', ...ministere })).toEqual([
        'refaire',
        'desactiver',
        'supprimer',
      ])
      expect(actionsDeLaLigne({ etat: 'desactive', ...ministere })).toEqual([
        'reactiver',
        'supprimer',
      ])
      expect(actionsDeLaLigne({ etat: 'sans_compte', ...ministere })).toEqual([
        'creer',
        'supprimer',
      ])
    }
  })

  it('libellés des états et de l’en-tête', () => {
    expect(libelleEtat('activee', null)).toBe('Activée')
    expect(libelleEtat('a_activer', null)).toBe('À activer')
    expect(libelleEtat('invitation_envoyee', null)).toBe('Invitation envoyée')
    expect(complementMinisteres(8)).toBe('8 actifs')
    expect(complementMinisteres(1)).toBe('1 actif')
  })

  it('section repliée des désactivés : le nombre, et le bouton au singulier comme au pluriel', () => {
    expect(TEXTES_COMPTES.desactives(2, true)).toBe('2 ministères désactivés')
    expect(TEXTES_COMPTES.afficherDesactives(2, true)).toBe('Afficher les 2 ministères désactivés')
    expect(TEXTES_COMPTES.afficherDesactives(1, false)).toBe('Afficher le compte désactivé')
    expect(TEXTES_COMPTES.masquerDesactives(1, true)).toBe('Masquer le ministère désactivé')
  })

  it('confirmation de désactivation d’un ministère : ce qui se passe, en deux phrases (T66)', () => {
    expect(confirmationDesactiverMinistere('Communication', 'communication@exemple.test')).toEqual({
      titre: 'Désactiver Communication ?',
      texte:
        "Plus personne ne pourra se connecter avec communication@exemple.test. Dès aujourd'hui, Communication ne compte plus dans les totaux.",
      bouton: 'Désactiver le ministère',
      enCours: 'Désactivation en cours',
    })
  })

  it('confirmation de suppression : ce qui disparaît, ce qui reste, définitif (T74)', () => {
    expect(confirmationSupprimerMinistere('Tech', 'tehc@exemple.test', 8)).toEqual({
      titre: 'Supprimer Tech ?',
      texte:
        "Tech, ses 8 indicateurs et son compte (tehc@exemple.test) disparaissent de l'outil. Le journal garde la trace de la suppression. C'est définitif.",
      bouton: 'Supprimer le ministère',
      enCours: 'Suppression en cours',
      definitif: true,
    })
    expect(confirmationSupprimerMinistere('Tech', null, 1).texte).toMatch(
      /^Tech et son indicateur disparaissent/,
    )
    expect(confirmationSupprimerMinistere('Tech', 'tehc@exemple.test', 0).texte).toMatch(
      /^Tech et son compte \(tehc@exemple\.test\) disparaissent/,
    )
    expect(confirmationSupprimerMinistere('Tech', null, 0).texte).toMatch(
      /^Tech disparaît de l'outil\./,
    )
  })
})
