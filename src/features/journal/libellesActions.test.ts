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
    // Revus par T66 (t377 à t380) : les verbes du glossaire.
    expect(libelleAction('reunion_saisie')).toBe('A enregistré la prochaine réunion')
    expect(libelleAction('point_cree')).toBe('A créé un point')
    expect(libelleAction('point_statut')).toBe("A changé le statut d'un point")
    expect(libelleAction('point_traite')).toBe('A marqué traité')
    expect(libelleAction('point_mention_ajoutee')).toBe('A ajouté une mention')
    expect(libelleAction('point_mention_retiree')).toBe('A retiré une mention')
    expect(libelleAction('session_declaree')).toBe('A ajouté une session')
    expect(libelleAction('session_modifiee')).toBe('A modifié une session')
    expect(libelleAction('session_supprimee')).toBe('A supprimé une session')
    expect(libelleAction('ministere_cree')).toBe('A créé un ministère')
    expect(libelleAction('compte_cree')).toBe('A créé un compte')
    expect(libelleAction('invitation_relancee')).toBe('A renvoyé une invitation')
    expect(libelleAction('compte_desactive')).toBe('A désactivé un compte')
    expect(libelleAction('compte_reactive')).toBe('A réactivé un compte')
    expect(libelleAction('double_auth_reinitialisee')).toBe("A refait l'activation")
    expect(libelleAction('texte_relu')).toBe('A relu un texte')
    expect(libelleAction('texte_masque')).toBe('A masqué un texte')
  })

  it('chaque code de `journal_action_check` a un libellé : 20 codes du brief, 9 de l’étape 4, 2 des mentions (T54), le choix de la liste (T72), la correction et la suppression (T74), 4 du suivi des signalements (T77)', () => {
    expect(CODES_ACTIONS).toHaveLength(38)
    expect(new Set(CODES_ACTIONS.map(libelleAction)).size).toBe(38)
    for (const code of CODES_ACTIONS) expect(libelleAction(code)).toMatch(/^A /)
    expect(libelleAction('modele_prevus_choisi')).toBe('A choisi la liste des prévus')
    expect(libelleAction('adresse_corrigee')).toBe("A corrigé l'adresse d'un compte")
    expect(libelleAction('ministere_supprime')).toBe('A supprimé un ministère')
    // T77, conception 3.1 d.
    expect(libelleAction('signalement_pris_en_charge')).toBe('A pris en charge un signalement')
    expect(libelleAction('signalement_repondu')).toBe('A répondu à un signalement')
    expect(libelleAction('signalement_regle')).toBe("A confirmé qu'un signalement est réglé")
    expect(libelleAction('signalement_reponse_ministere')).toBe(
      'A répondu à EJP Tech sur un signalement',
    )
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
      expect(actions).toHaveLength(32)
      for (const code of [
        'difficulte_signalee',
        'signalement_clos',
        'signalement_pris_en_charge',
        'signalement_repondu',
        'signalement_regle',
        'signalement_reponse_ministere',
      ] as const) {
        expect(actions).not.toContain(code)
      }
    }
  })

  it('un ministère ne déclare aucune session, et ne lit jamais sa propre suppression (T74)', () => {
    const actions = actionsDuProfil('ministere')
    expect(actions).not.toContain('ministere_supprime')
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
      'point_mention_ajoutee',
      'point_mention_retiree',
      'evenement_ajoute',
      'evenement_modifie',
      'reunion_saisie',
      'fij_statistiques_saisies',
      'difficulte_signalee',
      'signalement_clos',
      'signalement_pris_en_charge',
      'signalement_repondu',
      'signalement_regle',
      'signalement_reponse_ministere',
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
        // T72 : le choix de la liste, geste de configuration, comme dans journal_lisible_administration.
        'modele_prevus_choisi',
      ]),
    )
  })
})
