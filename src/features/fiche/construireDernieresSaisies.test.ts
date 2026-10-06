import { describe, expect, it } from 'vitest'
import { COMMUNS_EXEMPLE, DERNIERES_SAISIES_EXEMPLE } from '@/features/fiche/apercu/exemplesFiche'
import { construireDernieresSaisies } from '@/features/fiche/construireDernieresSaisies'

describe('construireDernieresSaisies', () => {
  it('écrit chaque ligne en mots, avec la date et l’heure de Paris', () => {
    expect(construireDernieresSaisies(DERNIERES_SAISIES_EXEMPLE, COMMUNS_EXEMPLE)).toEqual([
      { id: 105, quand: '4 oct., 13 h 10', texte: 'STARs au service : 10' },
      // Un indicateur propre n'a jamais sa valeur au journal.
      { id: 104, quand: '3 oct., 20 h', texte: 'Chiffres saisis' },
      { id: 103, quand: '26 sept., 22 h 05', texte: 'Présence saisie : 6 présents' },
      { id: 102, quand: '24 sept., 19 h 12', texte: 'STARs actifs : 14, dont en FIJ : 11' },
      { id: 101, quand: '22 sept., 21 h 30', texte: 'Nouveau point : Local de stockage des dons' },
    ])
  })

  it('réunion, carte des FIJ, objet illisible et action inconnue', () => {
    const base = {
      le: '2026-10-05T18:00:00Z',
      cible: null,
      cible_id: null,
      cible_texte: null,
    }
    const lignes = construireDernieresSaisies(
      [
        {
          ...base,
          id: 1,
          action: 'reunion_saisie',
          detail: { date: '2026-10-12', heure: '20:00:00' },
        },
        { ...base, id: 2, action: 'fij_saisie', detail: { total: 29 } },
        { ...base, id: 3, action: 'evenement_ajoute', detail: {} },
        { ...base, id: 4, action: 'action_future', detail: null },
      ],
      COMMUNS_EXEMPLE,
    )
    expect(lignes.map((l) => l.texte)).toEqual([
      'Prochaine réunion : lundi 12 oct., 20 h',
      'FIJ par département : 29 au total',
      'Événement ajouté',
      'Saisie enregistrée',
    ])
  })
})
