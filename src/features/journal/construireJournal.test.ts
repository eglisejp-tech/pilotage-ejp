import { describe, expect, it } from 'vitest'
import type { LigneJournal } from '@/data/journal'
import {
  COMMUNS_EXEMPLE,
  LIGNES_EXEMPLE,
  MINISTERES_EXEMPLE,
  SESSIONS_EXEMPLE,
} from '@/features/journal/apercu/exemplesJournal'
import {
  construireJournal,
  construireLigne,
  contexteJournal,
  deMinistere,
} from '@/features/journal/construireJournal'

const CONTEXTE = contexteJournal(COMMUNS_EXEMPLE, MINISTERES_EXEMPLE, SESSIONS_EXEMPLE)

function ligne(ajout: Partial<LigneJournal>): LigneJournal {
  return {
    id: 1,
    le: '2026-09-27T12:41:00+02:00',
    compte: 'u1',
    ministere_id: null,
    auteur_ministere_id: null,
    action: 'mesure_saisie',
    cible: null,
    cible_id: null,
    detail: {},
    compte_libelle: 'Berger',
    ministere_nom: null,
    cible_texte: null,
    ...ajout,
  }
}

const texteDe = (ajout: Partial<LigneJournal>) =>
  construireLigne(ligne(ajout), CONTEXTE)
    .detail.map((segment) => segment.texte)
    .join('')

describe('une ligne du journal, en mots', () => {
  it('date et heure de Paris, compte, action', () => {
    const construite = construireLigne(
      ligne({ le: '2026-09-27T10:41:00Z', compte_libelle: 'Conseil, compte 3' }),
      CONTEXTE,
    )
    expect(construite.quand).toBe('27 sept., 12 h 41')
    expect(construite.compte).toBe('Conseil, compte 3')
    expect(construite.action).toBe('A saisi des chiffres')
  })

  it('une ligne sans compte est écrite par « Système »', () => {
    expect(construireLigne(ligne({ compte_libelle: null }), CONTEXTE).compte).toBe('Système')
  })

  it('une heure d’hiver et une heure d’été donnent l’heure de Paris', () => {
    expect(construireLigne(ligne({ le: '2026-12-15T22:30:00Z' }), CONTEXTE).quand).toBe(
      '15 déc., 23 h 30',
    )
    expect(construireLigne(ligne({ le: '2026-09-30T22:05:00Z' }), CONTEXTE).quand).toBe(
      '1 oct., 0 h 05',
    )
  })

  it('chiffres communs : « STARs au service du 27 sept. : 10, STARs actifs : 14, dont 11 en FIJ »', () => {
    expect(
      texteDe({
        detail: {
          lignes: [
            { indicateur_id: 'ind-fij', date_ref: '2026-09-27', valeur: 11, corrige: false },
            { indicateur_id: 'ind-service', date_ref: '2026-09-27', valeur: 10, corrige: false },
            { indicateur_id: 'ind-actifs', date_ref: '2026-09-27', valeur: 14, corrige: false },
          ],
        },
      }),
    ).toBe('STARs au service du 27 sept. : 10, STARs actifs : 14, dont 11 en FIJ')
  })

  it('une correction le dit ; un indicateur propre se compte sans nom ni valeur', () => {
    expect(
      texteDe({
        detail: {
          lignes: [
            { indicateur_id: 'ind-service', date_ref: '2026-09-27', valeur: 10, corrige: true },
            { indicateur_id: 'ind-propre', date_ref: '2026-09-27', corrige: false },
          ],
        },
      }),
    ).toBe('STARs au service du 27 sept. : 10, 1 autre chiffre (correction)')
    expect(
      texteDe({
        detail: {
          lignes: [
            { indicateur_id: 'ind-propre', date_ref: '2026-09-01', corrige: false },
            { indicateur_id: 'ind-sensible', date_ref: '2026-09-01', corrige: false },
          ],
        },
      }),
    ).toBe("2 chiffres d'indicateurs du ministère")
    expect(texteDe({ detail: { lignes: [] } })).toBe("Chiffres d'indicateurs du ministère")
  })

  it('carte des FIJ et chiffres par département', () => {
    expect(texteDe({ action: 'fij_saisie', detail: { total: 29 } })).toBe(
      'FIJ par département : 29 au total',
    )
    expect(
      texteDe({
        action: 'fij_statistiques_saisies',
        detail: { dimanche: '2026-09-27', nombre: 8 },
      }),
    ).toBe('Chiffres par département du 27 sept.')
  })

  it('présence : le nom de la session vient de la session, jamais du journal', () => {
    const base = {
      action: 'participation_saisie',
      cible: 'session',
      cible_id: 'session-batir',
    }
    expect(texteDe({ ...base, detail: { valeur: 13, deja_comptes: 0 } })).toBe(
      "Bâtir l'Église du 26 sept. : 13 présents",
    )
    expect(texteDe({ ...base, detail: { valeur: 13, deja_comptes: 2 } })).toBe(
      "Bâtir l'Église du 26 sept. : 13 présents, dont 2 déjà comptés",
    )
    expect(texteDe({ ...base, detail: { valeur: 1, deja_comptes: 1 } })).toBe(
      "Bâtir l'Église du 26 sept. : 1 présent, dont 1 déjà compté",
    )
    expect(texteDe({ ...base, cible_id: 'inconnue', detail: { valeur: 3 } })).toBe(
      'Une session : 3 présents',
    )
  })

  it('événement : texte actuel, date et statut', () => {
    expect(
      texteDe({
        action: 'evenement_ajoute',
        cible: 'evenement',
        cible_texte: 'Soirée de louange',
        detail: { date: '2026-10-17', statut: 'valide', mentions: [] },
      }),
    ).toBe('Soirée de louange, 17 oct., Validé')
    expect(
      texteDe({
        action: 'evenement_modifie',
        cible: 'evenement',
        cible_texte: 'Soirée de louange',
        detail: { date: '2026-10-24', statut: 'preparation', date_precedente: '2026-10-17' },
      }),
    ).toBe('Soirée de louange, 24 oct., En préparation')
  })

  it('réunion : « lundi 5 oct., 20 h »', () => {
    expect(
      texteDe({ action: 'reunion_saisie', detail: { date: '2026-10-05', heure: '20:00:00' } }),
    ).toBe('lundi 5 oct., 20 h')
  })

  it('point créé : titre actuel et ministères mentionnés', () => {
    expect(
      texteDe({
        action: 'point_cree',
        cible: 'point_attention',
        cible_texte: 'Visuels pour Welcome Prodiges',
        detail: { priorite: 'normale', mentions: ['min-communication', 'min-jeunesse'] },
      }),
    ).toBe('Visuels pour Welcome Prodiges, mentionne Communication et Jeunesse')
    expect(
      texteDe({
        action: 'point_cree',
        cible: 'point_attention',
        cible_texte: 'Visuels',
        detail: { mentions: [] },
      }),
    ).toBe('Visuels')
  })

  it('statut d’un point : le nouveau statut ; traité : le titre', () => {
    expect(
      texteDe({
        action: 'point_statut',
        cible: 'point_attention',
        cible_texte: 'Salle',
        detail: { statut: ['a_traiter', 'attente_decision'] },
      }),
    ).toBe('Salle, En attente de décision')
    expect(
      texteDe({ action: 'point_traite', cible: 'point_attention', cible_texte: 'Micros' }),
    ).toBe('Micros')
  })

  it('un titre masqué par EJP Tech est marqué pour l’écran (en `--encre-3`)', () => {
    const construite = construireLigne(
      ligne({
        action: 'point_traite',
        cible: 'point_attention',
        cible_texte: '[texte masqué par EJP Tech]',
      }),
      CONTEXTE,
    )
    expect(construite.detail).toEqual([{ texte: '[texte masqué par EJP Tech]', masque: true }])
    const lisible = construireLigne(
      ligne({ action: 'point_traite', cible: 'point_attention', cible_texte: 'Micros' }),
      CONTEXTE,
    )
    expect(lisible.detail).toEqual([{ texte: 'Micros', masque: false }])
  })

  it('un objet illisible pour le lecteur : « un point de Communication »', () => {
    expect(
      texteDe({
        action: 'point_traite',
        cible: 'point_attention',
        cible_texte: null,
        ministere_nom: 'Communication',
      }),
    ).toBe('un point de Communication')
    expect(
      texteDe({
        action: 'point_cree',
        cible: 'point_attention',
        cible_texte: null,
        ministere_nom: 'Intégration',
        detail: { mentions: ['min-communication'] },
      }),
    ).toBe("un point d'Intégration, mentionne Communication")
    expect(texteDe({ action: 'point_traite', cible: 'point_attention' })).toBe('un point')
  })

  it('sessions : déclarée, modifiée, supprimée', () => {
    expect(
      texteDe({
        action: 'session_declaree',
        cible: 'session',
        cible_id: 'session-anti',
        detail: { type: 'anti_dispersion', date: '2026-10-03', attendus: 8 },
      }),
    ).toBe('Anti-Dispersion, samedi 3 oct., 8 ministères attendus')
    expect(
      texteDe({
        action: 'session_modifiee',
        cible: 'session',
        cible_id: 'session-anti',
        detail: { attendus: [8, 7] },
      }),
    ).toBe('Anti-Dispersion du 3 oct. : 7 ministères attendus au lieu de 8')
    expect(
      texteDe({
        action: 'session_supprimee',
        cible: 'session',
        cible_id: 'disparue',
        detail: { type: 'anti_dispersion', date: '2026-10-03' },
      }),
    ).toBe('Anti-Dispersion, samedi 3 oct.')
  })

  it('comptes et ministères : le libellé actuel', () => {
    expect(
      texteDe({ action: 'compte_cree', cible: 'compte', cible_texte: 'Conseil, compte 3' }),
    ).toBe('Conseil, compte 3')
    expect(
      texteDe({
        action: 'compte_desactive',
        cible: 'compte',
        cible_texte: 'Ministère Social',
        detail: { type: 'ministere', ministere_desactive: true },
      }),
    ).toBe('Ministère Social, ministère désactivé')
    expect(texteDe({ action: 'ministere_cree', cible: 'ministere', cible_texte: 'Tech' })).toBe(
      'Tech',
    )
  })

  it('texte relu ou masqué : l’objet et le motif, jamais le texte', () => {
    expect(
      texteDe({
        action: 'texte_relu',
        cible: 'point_attention',
        cible_texte: 'Titre secret',
        ministere_nom: 'Social',
      }),
    ).toBe('Point de Social, rien à signaler')
    expect(
      texteDe({
        action: 'texte_masque',
        cible: 'point_attention',
        cible_texte: '[texte masqué par EJP Tech]',
        ministere_nom: 'Social',
        detail: { champ: 'titre', motif: 'nom_personne' },
      }),
    ).toBe("Point de Social, motif : nom d'une personne")
    expect(
      texteDe({
        action: 'texte_masque',
        cible: 'reunion',
        ministere_nom: 'Intégration',
        detail: { champ: 'objet', motif: 'coordonnees' },
      }),
    ).toBe("Réunion d'Intégration, motif : coordonnées")
    expect(
      texteDe({ action: 'texte_relu', cible: 'precision_sensible', ministere_nom: null }),
    ).toBe("Précision d'un indicateur sensible, rien à signaler")
  })

  it('indicateurs : créé en attente, retiré avec son motif', () => {
    expect(
      texteDe({
        action: 'indicateur_cree',
        cible: 'indicateur',
        cible_texte: 'Visites à domicile',
        detail: { attente: true },
      }),
    ).toBe('Visites à domicile, en attente de validation')
    expect(
      texteDe({
        action: 'indicateur_retire',
        cible: 'indicateur',
        cible_texte: 'Réunions tenues',
        detail: { motif: 'doublon' },
      }),
    ).toBe('Réunions tenues, motif : doublon')
    expect(
      texteDe({
        action: 'indicateurs_prevus_crees',
        ministere_nom: 'Communication',
        detail: { modele: 'communication', nombre: 8 },
      }),
    ).toBe('8 indicateurs prévus pour Communication')
  })

  it('un libellé retiré pour confidentialité s’affiche en `--encre-3`', () => {
    const construite = construireLigne(
      ligne({
        action: 'indicateur_valide',
        cible: 'indicateur',
        cible_texte: '[retiré pour confidentialité]',
      }),
      CONTEXTE,
    )
    expect(construite.detail[0]?.masque).toBe(true)
  })

  it('le marqueur au milieu d’une phrase de la vue est seul grisé : « Précision : [retiré…], octobre 2026 »', () => {
    const construite = construireLigne(
      ligne({
        action: 'indicateur_valide',
        cible: 'indicateur',
        cible_texte: 'Précision : [retiré pour confidentialité], octobre 2026',
      }),
      CONTEXTE,
    )
    expect(construite.detail).toEqual([
      { texte: 'Précision : ', masque: false },
      { texte: '[retiré pour confidentialité]', masque: true },
      { texte: ', octobre 2026', masque: false },
    ])
  })

  it('un texte masqué par EJP Tech et suivi d’une suite : le marqueur seul est grisé', () => {
    const construite = construireLigne(
      ligne({
        action: 'point_cree',
        cible: 'point_attention',
        cible_texte: '[texte masqué par EJP Tech]',
        detail: { mentions: ['min-jeunesse'] },
      }),
      CONTEXTE,
    )
    expect(construite.detail).toEqual([
      { texte: '[texte masqué par EJP Tech]', masque: true },
      { texte: ', mentionne Jeunesse', masque: false },
    ])
  })

  it('signalements : l’écran, jamais le texte', () => {
    expect(
      texteDe({
        action: 'difficulte_signalee',
        cible: 'signalement',
        cible_texte: 'saisie_dimanche',
        detail: { ecran: 'saisie_dimanche' },
      }),
    ).toBe('Écran : Chiffres du dimanche')
  })

  it('une action inconnue garde sa date et son compte, sans détail', () => {
    const construite = construireLigne(ligne({ action: 'action_de_demain' }), CONTEXTE)
    expect(construite.action).toBe('Action enregistrée')
    expect(construite.detail).toEqual([])
  })

  it('une date illisible dans le détail ne casse pas la ligne', () => {
    const construite = construireLigne(
      ligne({ action: 'reunion_saisie', detail: { date: '31 février', heure: 'x' } }),
      CONTEXTE,
    )
    expect(construite.detail).toEqual([{ texte: 'Prochaine réunion', masque: false }])
  })
})

describe('« de » devant un nom de ministère', () => {
  it('s’élide devant une voyelle', () => {
    expect(deMinistere('Social')).toBe('de Social')
    expect(deMinistere('Intégration')).toBe("d'Intégration")
    expect(deMinistere('Évangélisation')).toBe("d'Évangélisation")
  })
})

describe('le journal d’exemple', () => {
  it('toutes ses lignes se construisent, sans texte vide ni tiret long', () => {
    const tirets = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
    const lignes = construireJournal(LIGNES_EXEMPLE, CONTEXTE)
    expect(lignes).toHaveLength(LIGNES_EXEMPLE.length)
    for (const construite of lignes) {
      expect(construite.action).not.toBe('Action enregistrée')
      const detail = construite.detail.map((segment) => segment.texte).join('')
      expect(detail.length, `ligne ${construite.id}`).toBeGreaterThan(0)
      expect(detail).not.toMatch(tirets)
    }
  })
})
