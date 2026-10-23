import { describe, expect, it } from 'vitest'
import {
  COMPTAGES_EXEMPLE,
  COMPTAGES_PREMIER_MOIS_EXEMPLE,
  NOMS_MINISTERES_EXEMPLE,
  RETARDS_EXEMPLE,
} from '@/features/fiche/apercu/exemplesComptages'
import {
  comptagesVisibles,
  construireComptages,
  construireRetards,
  retardsVisibles,
} from '@/features/fiche/construireComptages'
import type { DonneesComptages } from '@/features/fiche/construireComptages'

function construit(lignes = COMPTAGES_EXEMPLE): DonneesComptages {
  const donnees = construireComptages(lignes)
  if (donnees === null) throw new Error('données attendues')
  return donnees
}

describe('comptagesVisibles et retardsVisibles', () => {
  it('fiche de Coordination seulement, jamais pour l’administration', () => {
    expect(comptagesVisibles('coordination', 'ministere')).toBe(true)
    expect(comptagesVisibles('coordination', 'berger')).toBe(true)
    expect(comptagesVisibles('coordination', 'conseil')).toBe(true)
    expect(comptagesVisibles('coordination', 'admin_plateforme')).toBe(true)
    expect(comptagesVisibles('coordination', 'admin_eglise')).toBe(false)
    expect(comptagesVisibles('fij', 'berger')).toBe(false)
    expect(comptagesVisibles(null, 'berger')).toBe(false)
  })

  it('la liste des retards : berger, conseil, EJP Tech ; pas Coordination (K11)', () => {
    expect(retardsVisibles('berger')).toBe(true)
    expect(retardsVisibles('conseil')).toBe(true)
    expect(retardsVisibles('admin_plateforme')).toBe(true)
    expect(retardsVisibles('ministere')).toBe(false)
    expect(retardsVisibles('admin_eglise')).toBe(false)
  })
})

describe('construireComptages', () => {
  it('aucun mois rendu : premier usage', () => {
    expect(construireComptages([])).toBeNull()
  })

  it('mois écoulé en grandes valeurs, mois en cours à droite, réalisés depuis le départ', () => {
    const donnees = construit()
    expect(donnees.periode).toBe('Septembre 2026')
    expect(donnees.depuis).toBe('21 août')
    expect(donnees.evenements.map((ligne) => ligne.libelle)).toEqual([
      'Réalisés',
      'Prévus',
      'Annulés',
      'Reportés',
      'En attente de validation',
      'Passés sans état final',
    ])
    const [realises, prevus] = donnees.evenements
    expect(realises?.valeur).toEqual({ etat: 'saisie', texte: '6', unite: null })
    expect(realises?.details).toEqual(['Octobre en cours : 2', 'Depuis le 21 août : 11'])
    expect(prevus?.details).toEqual(['Octobre en cours : 4'])
  })

  it('l’ordre des lignes lues ne change rien : le plus récent est le mois en cours', () => {
    expect(construit([...COMPTAGES_EXEMPLE].reverse())).toEqual(construit())
  })

  it('ponctualité : mois écoulé, mois en cours, depuis le départ ; cultes puis autres', () => {
    const [ecoule, enCours, depuis] = construit().ponctualite
    expect(ecoule).toEqual({
      cle: 'principal',
      libelle: 'Septembre 2026',
      valeur: { etat: 'saisie', texte: '63', unite: '%' },
      details: ['Retard moyen : 8 min', '8 sur 10 ont leurs heures'],
      sousLignes: ['Cultes : 3 sur 4', 'Autres événements : 2 sur 4'],
    })
    expect(enCours?.libelle).toBe('Octobre en cours')
    expect(enCours?.details).toEqual(['Retard moyen : 4 min', '3 sur 3 ont leurs heures'])
    expect(depuis?.libelle).toBe('Depuis le 21 août')
    expect(depuis?.valeur).toEqual({ etat: 'saisie', texte: '64', unite: '%' })
    expect(depuis?.details).toEqual(['Retard moyen : 7 min', '14 sur 18 ont leurs heures'])
    expect(depuis?.sousLignes).toEqual(['Cultes : 5 sur 7', 'Autres événements : 4 sur 7'])
  })

  it('retards à lister : le mois écoulé, du 1er au dernier jour, leur nombre', () => {
    expect(construit().retards).toEqual({
      debut: '2026-09-01',
      fin: '2026-09-30',
      nombre: 2,
      mois: 'septembre',
    })
    const sansRetard = COMPTAGES_EXEMPLE.map((ligne) => ({
      ...ligne,
      a_l_heure: ligne.avec_heures,
    }))
    expect(construit(sansRetard).retards).toBeNull()
  })

  it('premier mois : le mois en cours seul, nommé, sans « Depuis », « Non calculé » sans heures', () => {
    const donnees = construit(COMPTAGES_PREMIER_MOIS_EXEMPLE)
    expect(donnees.periode).toBe('Octobre en cours')
    expect(donnees.depuis).toBe('2 oct.')
    expect(donnees.evenements[0]?.details).toEqual([])
    expect(donnees.ponctualite).toHaveLength(1)
    expect(donnees.ponctualite[0]).toMatchObject({
      libelle: 'Octobre en cours',
      valeur: { etat: 'non_calcule', texte: 'Non calculé' },
      details: ['Retard moyen : Non calculé', '0 sur 2 a ses heures'],
      sousLignes: ['Cultes : 0 sur 0', 'Autres événements : 0 sur 0'],
    })
    expect(donnees.retards).toBeNull()
  })

  it('décembre écoulé : la fin du mois passe l’année', () => {
    const [enCours, ecoule] = COMPTAGES_EXEMPLE
    if (enCours === undefined || ecoule === undefined) throw new Error('exemple incomplet')
    const donnees = construit([
      { ...enCours, mois: '2027-01-01' },
      { ...ecoule, mois: '2026-12-01' },
    ])
    expect(donnees.periode).toBe('Décembre 2026')
    expect(donnees.retards).toMatchObject({ debut: '2026-12-01', fin: '2026-12-31' })
  })
})

describe('construireRetards', () => {
  it('jour abrégé, titre, ministère porteur, minutes de retard', () => {
    expect(construireRetards(RETARDS_EXEMPLE, NOMS_MINISTERES_EXEMPLE)).toEqual([
      {
        id: RETARDS_EXEMPLE[0]?.id,
        jour: 'Jeu. 10 sept.',
        titre: 'Soirée jeunesse',
        ministere: 'Jeunesse',
        retard: '12 min de retard',
      },
      {
        id: RETARDS_EXEMPLE[1]?.id,
        jour: 'Jeu. 24 sept.',
        titre: 'Veillée de prière',
        ministere: 'Coordination',
        retard: '35 min de retard',
      },
    ])
  })

  it('un ministère sans nom lu : la ligne reste, sans nom', () => {
    expect(construireRetards(RETARDS_EXEMPLE, new Map())[0]?.ministere).toBeNull()
  })
})
