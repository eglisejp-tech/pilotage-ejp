import { describe, expect, it } from 'vitest'
import {
  CONTEXTE_EXEMPLE,
  LIGNE_BATIR_FAITE,
  LIGNE_DIMANCHE_A_FAIRE,
  LIGNE_DIMANCHE_FAIT,
  LIGNE_EVENEMENT_A_CONFIRMER,
  LIGNE_EVENEMENT_MENTIONNE,
  LIGNE_REUNION_A_FAIRE,
  LIGNE_REUNION_FAITE,
} from '@/features/accueil-ministere/exempleAccueil'
import { lignesChiffres } from '@/features/accueil-ministere/lignesChiffres'
import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import {
  construireOuverture,
  rangerVosSaisies,
  saisieDeLaLigne,
} from '@/features/accueil-ministere/vosSaisies'
import { INDICATEURS_DIMANCHE } from '@/features/saisie-chiffres/apercu/exemples'

const texte = (lignes: readonly LigneVosSaisies[]) =>
  construireOuverture(lignes, CONTEXTE_EXEMPLE)
    .phrase.map((morceau) => morceau.texte)
    .join('')

const ligne = (cle: string, etat: LigneVosSaisies['etat'] = 'fait'): LigneVosSaisies => ({
  cle,
  libelle: cle,
  etat,
  detail: null,
  action: { libelle: etat === 'fait' ? 'Corriger' : 'Saisir', vers: `/saisir/${cle}` },
})

describe('rangerVosSaisies', () => {
  it('range les lignes dans l’ordre du BRIEF, quel que soit l’ordre des lots', () => {
    const rangees = rangerVosSaisies({
      chiffres: [ligne('mois'), ligne('dimanche')],
      sessions: [ligne('session:a'), ligne('session:b')],
      reunion: [ligne('reunion')],
      fij: [ligne('carte_fij'), ligne('fij_statistiques')],
      evenements: [ligne('evenement:x')],
    })
    expect(rangees.map((rangee) => rangee.cle)).toEqual([
      'dimanche',
      'mois',
      'session:a',
      'session:b',
      'reunion',
      'carte_fij',
      'fij_statistiques',
      'evenement:x',
    ])
  })
})

describe('saisieDeLaLigne', () => {
  it('lit le mois écoulé à partir du jour de Paris (v_semaine)', () => {
    expect(saisieDeLaLigne(ligne('mois', 'a_faire'), CONTEXTE_EXEMPLE)).toEqual({
      type: 'mois',
      mois: 8,
      fait: false,
    })
  })

  it('reprend le type et la date de la session ; une session inconnue reste hors de la phrase', () => {
    expect(saisieDeLaLigne(LIGNE_BATIR_FAITE, CONTEXTE_EXEMPLE)).toEqual({
      type: 'session',
      session: 'batir',
      intitule: null,
      date: '2026-09-26',
      fait: true,
    })
    expect(saisieDeLaLigne(ligne('session:inconnue'), CONTEXTE_EXEMPLE)).toBeNull()
    expect(saisieDeLaLigne(ligne('autre-chose'), CONTEXTE_EXEMPLE)).toBeNull()
  })

  it('un événement qui mentionne seulement le ministère n’a rien à faire', () => {
    expect(saisieDeLaLigne(LIGNE_EVENEMENT_MENTIONNE, CONTEXTE_EXEMPLE)).toEqual({
      type: 'evenement',
      fait: true,
    })
    expect(saisieDeLaLigne(LIGNE_EVENEMENT_A_CONFIRMER, CONTEXTE_EXEMPLE)).toEqual({
      type: 'evenement',
      fait: false,
    })
  })
})

describe('construireOuverture', () => {
  it('maquette 07 : la réunion reste, elle donne le bouton jaune', () => {
    const ouverture = construireOuverture(
      [LIGNE_DIMANCHE_FAIT, LIGNE_BATIR_FAITE, LIGNE_REUNION_A_FAIRE],
      CONTEXTE_EXEMPLE,
    )
    expect(ouverture.phrase).toEqual([
      { texte: 'Vos chiffres sont à jour. ' },
      { texte: 'Il reste la date de la prochaine réunion', aDecider: true },
      { texte: '.' },
    ])
    expect(ouverture.principal).toEqual({
      libelle: 'Renseigner la prochaine réunion',
      vers: '/saisir/reunion',
    })
    expect(ouverture.secondaires).toEqual([
      { libelle: 'Saisir une session', vers: '/saisir/session/choisir' },
      { libelle: 'Nouveau point', vers: '/saisir/point' },
    ])
  })

  it('le bouton jaune suit l’ordre des lignes : chiffres, puis session, puis événement', () => {
    const sessionAFaire: LigneVosSaisies = {
      ...LIGNE_BATIR_FAITE,
      etat: 'a_faire',
      detail: null,
      action: { libelle: 'Saisir', vers: '/saisir/session/batir-26' },
    }
    const toutes = [
      LIGNE_DIMANCHE_A_FAIRE,
      sessionAFaire,
      LIGNE_REUNION_FAITE,
      LIGNE_EVENEMENT_A_CONFIRMER,
    ]
    expect(construireOuverture(toutes, CONTEXTE_EXEMPLE).principal).toEqual({
      libelle: 'Saisir les chiffres du dimanche',
      vers: '/saisir/dimanche',
    })

    const sansDimanche = [LIGNE_DIMANCHE_FAIT, ...toutes.slice(1)]
    const ouverture = construireOuverture(sansDimanche, CONTEXTE_EXEMPLE)
    expect(ouverture.principal).toEqual({
      libelle: "Saisir la présence à Bâtir l'Église",
      vers: '/saisir/session/batir-26',
    })
    // « Saisir une session » est devenu le bouton principal : il quitte les secondaires, pas
    // « Nouveau point ».
    expect(ouverture.secondaires.map((bouton) => bouton.libelle)).toEqual(['Nouveau point'])

    const evenementSeul = [LIGNE_DIMANCHE_FAIT, LIGNE_BATIR_FAITE, LIGNE_REUNION_FAITE]
    expect(
      construireOuverture([...evenementSeul, LIGNE_EVENEMENT_A_CONFIRMER], CONTEXTE_EXEMPLE)
        .principal,
    ).toEqual({ libelle: "Mettre à jour l'événement", vers: '/saisir/evenement/louange' })
  })

  it("la phrase compte l'événement à confirmer sans son titre, et masque « Tout est à jour »", () => {
    const lignes = [
      LIGNE_DIMANCHE_FAIT,
      LIGNE_BATIR_FAITE,
      LIGNE_REUNION_FAITE,
      LIGNE_EVENEMENT_A_CONFIRMER,
    ]
    expect(texte(lignes)).toBe("Vos chiffres sont à jour. Il reste le statut d'un événement.")
    expect(texte(lignes)).not.toContain('Soirée de louange')
    expect(texte([LIGNE_DIMANCHE_A_FAIRE, ...lignes.slice(1)])).toBe(
      "Il reste les chiffres du dimanche 27 sept. et le statut d'un événement.",
    )
  })

  it('tout est fait : « Tout est à jour pour la semaine 39. », sans bouton jaune', () => {
    const lignes = [
      LIGNE_DIMANCHE_FAIT,
      LIGNE_BATIR_FAITE,
      LIGNE_REUNION_FAITE,
      LIGNE_EVENEMENT_MENTIONNE,
    ]
    const ouverture = construireOuverture(lignes, CONTEXTE_EXEMPLE)
    expect(texte(lignes)).toBe('Tout est à jour pour la semaine 39.')
    expect(ouverture.phrase.some((morceau) => morceau.aDecider)).toBe(false)
    expect(ouverture.principal).toBeNull()
    expect(ouverture.secondaires.map((bouton) => bouton.libelle)).toEqual([
      'Saisir une session',
      'Nouveau point',
    ])
  })

  it('ministère FIJ : « Mettre à jour la carte des FIJ » en secondaire, sauf s’il devient principal', () => {
    const fij = { ...CONTEXTE_EXEMPLE, estFij: true }
    const carteAFaire: LigneVosSaisies = {
      cle: 'carte_fij',
      libelle: 'Carte des FIJ',
      etat: 'a_faire',
      detail: null,
      action: { libelle: 'Saisir', vers: '/saisir/fij' },
    }
    const faites = [LIGNE_DIMANCHE_FAIT, LIGNE_REUNION_FAITE]
    expect(construireOuverture(faites, fij).secondaires.map((b) => b.libelle)).toEqual([
      'Saisir une session',
      'Nouveau point',
      'Mettre à jour la carte des FIJ',
    ])
    const ouverture = construireOuverture([...faites, carteAFaire], fij)
    expect(ouverture.principal).toEqual({
      libelle: 'Mettre à jour la carte des FIJ',
      vers: '/saisir/fij',
    })
    expect(ouverture.secondaires.map((b) => b.libelle)).toEqual([
      'Saisir une session',
      'Nouveau point',
    ])
  })

  it('une seule session à saisir : « Saisir une session » ouvre directement sa saisie', () => {
    const lignes = [
      LIGNE_DIMANCHE_A_FAIRE,
      {
        ...LIGNE_BATIR_FAITE,
        etat: 'a_faire' as const,
        action: { libelle: 'Saisir', vers: '/saisir/session/batir-26' },
      },
    ]
    expect(construireOuverture(lignes, CONTEXTE_EXEMPLE).secondaires).toEqual([
      { libelle: 'Saisir une session', vers: '/saisir/session/batir-26' },
      { libelle: 'Nouveau point', vers: '/saisir/point' },
    ])
  })
})

describe('bascule du dimanche à 12 h (heure de Paris)', () => {
  const indicateurs = INDICATEURS_DIMANCHE
  const mesure = {
    indicateur_id: 'commun-service',
    periode: '2026-09-27',
    valeur: 10,
    saisi_le: '2026-09-27T11:00:00Z',
  }

  it('le dimanche de référence change à midi : la ligne et le bouton redeviennent « À faire »', () => {
    // Dimanche 4 oct. à 11 h 59 : `v_semaine` donne encore le dimanche 27 sept., déjà saisi.
    const avantMidi = lignesChiffres({
      semaine: { aujourdhui: '2026-10-04', dimanche: '2026-09-27' },
      indicateurs,
      mesuresDimanche: [mesure],
      mesuresMois: [],
    })
    expect(avantMidi[0]?.etat).toBe('fait')
    const contexteAvant = {
      ...CONTEXTE_EXEMPLE,
      semaine: { aujourdhui: '2026-10-04', dimanche: '2026-09-27', numero: 39 },
    }
    expect(construireOuverture(avantMidi, contexteAvant).principal).toBeNull()

    // À 12 h : `v_semaine` passe au dimanche 4 oct., pas encore saisi.
    const apresMidi = lignesChiffres({
      semaine: { aujourdhui: '2026-10-04', dimanche: '2026-10-04' },
      indicateurs,
      mesuresDimanche: [mesure],
      mesuresMois: [],
    })
    expect(apresMidi[0]).toMatchObject({
      libelle: 'Chiffres du dimanche 4 oct.',
      etat: 'a_faire',
    })
    const contexteApres = {
      ...CONTEXTE_EXEMPLE,
      semaine: { aujourdhui: '2026-10-04', dimanche: '2026-10-04', numero: 40 },
    }
    const ouverture = construireOuverture(apresMidi, contexteApres)
    expect(ouverture.principal?.libelle).toBe('Saisir les chiffres du dimanche')
    expect(ouverture.phrase.map((morceau) => morceau.texte).join('')).toBe(
      'Il reste les chiffres du dimanche 4 oct.',
    )
  })
})
