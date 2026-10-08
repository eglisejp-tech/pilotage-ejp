import { describe, expect, it } from 'vitest'
import {
  actionsDuProfil,
  CODES_ACTIONS,
  LIBELLE_ACTION_INCONNUE,
  libelleAction,
} from '@/features/journal/libellesActions'

describe('libellés des actions (BRIEF, section 6)', () => {
  it('reprend mot pour mot la colonne « Action » du tableau du brief', () => {
    expect(libelleAction('mesure_saisie')).toBe('A saisi des chiffres')
    expect(libelleAction('fij_saisie')).toBe('A saisi la carte des FIJ')
    expect(libelleAction('participation_saisie')).toBe('A saisi une présence')
    expect(libelleAction('evenement_ajoute')).toBe('A ajouté un événement')
    expect(libelleAction('evenement_modifie')).toBe('A mis à jour un événement')
    expect(libelleAction('reunion_saisie')).toBe('A renseigné la prochaine réunion')
    expect(libelleAction('point_cree')).toBe('A créé un point')
    expect(libelleAction('point_statut')).toBe("A changé le statut d'un point")
    expect(libelleAction('point_traite')).toBe('A marqué traité')
    expect(libelleAction('session_declaree')).toBe('A déclaré une session')
    expect(libelleAction('session_modifiee')).toBe('A modifié une session')
    expect(libelleAction('session_supprimee')).toBe('A supprimé une session')
    expect(libelleAction('ministere_cree')).toBe('A créé un ministère')
    expect(libelleAction('compte_cree')).toBe('A créé un compte')
    expect(libelleAction('invitation_relancee')).toBe('A relancé une invitation')
    expect(libelleAction('compte_desactive')).toBe('A désactivé un compte')
    expect(libelleAction('compte_reactive')).toBe('A réactivé un compte')
    expect(libelleAction('double_auth_reinitialisee')).toBe("A refait l'activation")
    expect(libelleAction('texte_relu')).toBe('A relu un texte')
    expect(libelleAction('texte_masque')).toBe('A masqué un texte')
  })

  it('chaque code de `journal_action_check` a un libellé : 20 codes du brief, 9 de l’étape 4', () => {
    expect(CODES_ACTIONS).toHaveLength(29)
    expect(new Set(CODES_ACTIONS.map(libelleAction)).size).toBe(29)
    for (const code of CODES_ACTIONS) expect(libelleAction(code)).toMatch(/^A /)
  })

  it('un code inconnu garde un libellé neutre, jamais le code', () => {
    expect(libelleAction('action_de_demain')).toBe(LIBELLE_ACTION_INCONNUE)
  })

  it('aucun libellé ne contient de tiret cadratin ni demi-cadratin', () => {
    const tirets = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
    for (const code of CODES_ACTIONS) expect(libelleAction(code)).not.toMatch(tirets)
  })
})

describe('actions que chaque profil peut filtrer', () => {
  it('EJP Tech les lit toutes', () => {
    expect(actionsDuProfil('admin_plateforme')).toEqual(CODES_ACTIONS)
  })

  it('le berger et le conseil ne lisent aucun signalement (T39)', () => {
    for (const profil of ['berger', 'conseil'] as const) {
      const actions = actionsDuProfil(profil)
      expect(actions).toHaveLength(27)
      expect(actions).not.toContain('difficulte_signalee')
      expect(actions).not.toContain('signalement_clos')
    }
  })

  it('un ministère ne déclare aucune session', () => {
    const actions = actionsDuProfil('ministere')
    expect(actions).not.toContain('session_declaree')
    expect(actions).not.toContain('session_modifiee')
    expect(actions).not.toContain('session_supprimee')
    expect(actions).toContain('difficulte_signalee')
  })

  it('l’administration de l’église : sa liste fermée, ni point, ni événement, ni signalement', () => {
    const actions = actionsDuProfil('admin_eglise')
    for (const code of [
      'point_cree',
      'point_statut',
      'point_traite',
      'evenement_ajoute',
      'evenement_modifie',
      'reunion_saisie',
      'fij_statistiques_saisies',
      'difficulte_signalee',
      'signalement_clos',
    ] as const) {
      expect(actions, code).not.toContain(code)
    }
    expect(actions).toEqual(
      expect.arrayContaining([
        'mesure_saisie',
        'fij_saisie',
        'participation_saisie',
        'session_declaree',
        'compte_cree',
        'indicateur_valide',
        'texte_relu',
      ]),
    )
  })
})
