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
  libelleEtat,
  libelleIndicateurs,
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

describe('construireComptes (écran 13)', () => {
  const donnees = construireComptes(COMPTES, MINISTERES, INDICATEURS)

  it('ministères actifs par nom, ministère sans compte compris, puis les désactivés', () => {
    expect(donnees.ministeres.map((ligne) => [ligne.nom, ligne.etat])).toEqual([
      ['Communication', 'activee'],
      ['Coordination', 'sans_compte'],
      ['FIJ', 'activee'],
      ['Social', 'a_activer'],
      ['Merch', 'desactive'],
    ])
    expect(donnees.nbMinisteresActifs).toBe(4)
  })

  it('un ministère sans compte : aucune adresse, la seule action « Créer le compte »', () => {
    const coordination = donnees.ministeres[1]
    expect(coordination).toMatchObject({ userId: null, email: null, ministereId: m(2) })
    expect(actionsDeLaLigne({ etat: 'sans_compte' })).toEqual(['creer'])
  })

  it('le dernier compte désactivé d’un ministère, avec le jour de Paris', () => {
    const merch = donnees.ministeres[4]
    expect(merch).toMatchObject({ userId: u(5), desactiveLe: '2026-10-02' })
    expect(libelleEtat('desactive', merch?.desactiveLe ?? null)).toBe('Désactivé le 2 oct.')
  })

  it('indicateurs propres comptés par ministère ; FIJ marqué', () => {
    expect(donnees.ministeres.map((ligne) => ligne.indicateurs)).toEqual([2, 0, 0, 1, 0])
    expect(donnees.ministeres.find((ligne) => ligne.nom === 'FIJ')?.fij).toBe(true)
    expect(libelleIndicateurs(0)).toBe('Aucun')
    expect(libelleIndicateurs(1)).toBe('1 indicateur')
    expect(libelleIndicateurs(12)).toBe('12 indicateurs')
  })

  it('berger d’abord, puis le conseil par numéro ; l’administration n’apparaît nulle part', () => {
    expect(donnees.bergerConseil.map((ligne) => ligne.nom)).toEqual([
      'Berger',
      'Conseil, compte 2',
      'Conseil, compte 3',
      'Conseil, compte 10',
    ])
    expect(donnees.ejpTech.map((ligne) => ligne.nom)).toEqual([
      'EJP Tech, compte 1',
      'EJP Tech, compte 2',
    ])
    const toutes = [...donnees.ministeres, ...donnees.bergerConseil, ...donnees.ejpTech]
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
  it('chaque état a ses boutons (BRIEF, section 9)', () => {
    expect(actionsDeLaLigne({ etat: 'invitation_envoyee' })).toEqual(['relancer', 'desactiver'])
    expect(actionsDeLaLigne({ etat: 'a_activer' })).toEqual(['desactiver'])
    expect(actionsDeLaLigne({ etat: 'activee' })).toEqual(['refaire', 'desactiver'])
    expect(actionsDeLaLigne({ etat: 'desactive' })).toEqual(['reactiver'])
  })

  it('libellés des états et de l’en-tête', () => {
    expect(libelleEtat('activee', null)).toBe('Activée')
    expect(libelleEtat('a_activer', null)).toBe('À activer')
    expect(libelleEtat('invitation_envoyee', null)).toBe('Invitation envoyée')
    expect(complementMinisteres(8)).toBe('8 actifs, un email partagé chacun')
    expect(complementMinisteres(1)).toBe('1 actif, un email partagé chacun')
  })

  it('confirmation de désactivation d’un ministère : le texte du BRIEF', () => {
    expect(confirmationDesactiverMinistere('Communication', 'communication@exemple.test')).toEqual({
      titre: 'Désactiver Communication ?',
      texte:
        "Plus personne ne pourra se connecter avec communication@exemple.test. À partir d'aujourd'hui, Communication ne compte plus dans les totaux ni dans la complétude. Ses saisies et son historique restent.",
      bouton: 'Désactiver le ministère',
    })
  })
})
