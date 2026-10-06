import { describe, expect, it } from 'vitest'
import { lignesFij } from '@/features/accueil-ministere/lignesFij'
import type { DonneesLignesFij } from '@/features/accueil-ministere/lignesFij'
import { lignesSessions } from '@/features/accueil-ministere/lignesSessions'
import type { DonneesLignesSessions } from '@/features/accueil-ministere/lignesSessions'
import { CARTE_EXEMPLE } from '@/features/saisie-fij/apercu/exemplesE4'

describe('lignesSessions (« Vos saisies »)', () => {
  const donnees: DonneesLignesSessions = {
    semaine: { lundi: '2026-09-21', aujourdhui: '2026-09-28' },
    sessions: [
      { session_id: 'batir', type: 'batir', intitule: null, date: '2026-09-26' },
      { session_id: 'anti', type: 'anti_dispersion', intitule: null, date: '2026-09-22' },
      { session_id: 'ancienne', type: 'batir', intitule: null, date: '2026-09-19' },
      { session_id: 'future', type: 'autre', intitule: 'Soirée', date: '2026-09-29' },
      { session_id: 'non-attendue', type: 'autre', intitule: 'Concert', date: '2026-09-24' },
    ],
    attendues: ['batir', 'anti', 'ancienne', 'future'],
    mesParticipations: [{ session_id: 'batir', valeur: 13 }],
  }

  it('chaque session attendue de la semaine, dans l’ordre des dates ; ni future, ni ancienne', () => {
    const lignes = lignesSessions(donnees)
    expect(lignes.map((ligne) => ligne.cle)).toEqual(['session:anti', 'session:batir'])
  })

  it('Fait « 13 présents » avec « Corriger », sinon « Saisir »', () => {
    const [anti, batir] = lignesSessions(donnees)
    expect(batir).toEqual({
      cle: 'session:batir',
      libelle: "Bâtir l'Église du 26 sept.",
      etat: 'fait',
      detail: 'Fait, 13 présents',
      action: { libelle: 'Corriger', vers: '/saisir/session/batir' },
    })
    expect(anti).toMatchObject({
      libelle: 'Anti-Dispersion du 22 sept.',
      etat: 'a_faire',
      detail: null,
      action: { libelle: 'Saisir', vers: '/saisir/session/anti' },
    })
  })

  it('aucune session attendue : aucune ligne', () => {
    expect(lignesSessions({ ...donnees, attendues: [] })).toEqual([])
  })
})

describe('lignesFij (« Vos saisies » du ministère FIJ)', () => {
  const base: DonneesLignesFij = {
    estFij: true,
    semaine: { aujourdhui: '2026-09-28', dimanche: '2026-09-27' },
    carte: CARTE_EXEMPLE,
    statistiques: [
      { dimanche: '2026-09-27', nb_departements: 6 },
      { dimanche: '2026-09-27', nb_departements: 8 },
      { dimanche: '2026-09-27', nb_departements: 8 },
      { dimanche: '2026-09-27', nb_departements: 8 },
      { dimanche: '2026-09-20', nb_departements: 8 },
    ],
  }

  it('aucune ligne pour un autre ministère', () => {
    expect(lignesFij({ ...base, estFij: false })).toEqual([])
  })

  it('carte envoyée il y a moins de 30 jours : Fait, avec le total', () => {
    const [carte, statistiques] = lignesFij(base)
    expect(carte).toEqual({
      cle: 'carte_fij',
      libelle: 'Carte des FIJ',
      etat: 'fait',
      detail: 'Fait, 29 FIJ',
      action: { libelle: 'Corriger', vers: '/saisir/fij' },
    })
    expect(statistiques).toEqual({
      cle: 'fij_statistiques',
      libelle: 'Chiffres par département',
      etat: 'fait',
      detail: 'Fait, 30 valeurs sur 32',
      action: { libelle: 'Corriger', vers: '/saisir/fij-statistiques' },
    })
  })

  it('carte de 30 jours ou plus : À faire, avec la date du dernier envoi', () => {
    const [carte] = lignesFij({ ...base, semaine: { ...base.semaine, aujourdhui: '2026-10-21' } })
    expect(carte).toMatchObject({
      etat: 'a_faire',
      detail: 'À faire, dernier envoi le 21 sept.',
      action: { libelle: 'Saisir', vers: '/saisir/fij' },
    })
  })

  it('jamais saisi : À faire, sans détail ; semaine sans valeur : « Saisir »', () => {
    const [carte, statistiques] = lignesFij({ ...base, carte: [], statistiques: [] })
    expect(carte).toMatchObject({ etat: 'a_faire', detail: null })
    expect(statistiques).toMatchObject({
      etat: 'a_faire',
      detail: null,
      action: { libelle: 'Saisir', vers: '/saisir/fij-statistiques' },
    })
  })
})
