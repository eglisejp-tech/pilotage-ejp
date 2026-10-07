import { describe, expect, it } from 'vitest'
import { COMMUNS_EXEMPLE, DERNIERES_SAISIES_EXEMPLE } from '@/features/fiche/apercu/exemplesFiche'
import { construireDernieresSaisies } from '@/features/fiche/construireDernieresSaisies'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'

describe('construireDernieresSaisies', () => {
  it('écrit chaque ligne en mots, avec la date et l’heure de Paris', () => {
    expect(construireDernieresSaisies(DERNIERES_SAISIES_EXEMPLE, COMMUNS_EXEMPLE)).toEqual([
      { id: 105, quand: '4 oct., 13 h 10', texte: 'STARs au service : 10', objet: null },
      // Un indicateur propre n'a jamais sa valeur au journal.
      { id: 104, quand: '3 oct., 20 h', texte: 'Chiffres saisis', objet: null },
      // La session est nommée comme sur la maquette : « Bâtir l'Église : 13 présents ».
      { id: 103, quand: '26 sept., 22 h 05', texte: "Bâtir l'Église : 6 présents", objet: null },
      {
        id: 102,
        quand: '24 sept., 19 h 12',
        texte: 'STARs actifs : 14, dont 11 en FIJ',
        objet: null,
      },
      {
        id: 101,
        quand: '22 sept., 21 h 30',
        texte: 'Nouveau point :',
        objet: { texte: 'Local de stockage des dons', masque: false },
      },
    ])
  })

  it('le titre d’un point masqué par EJP Tech est un texte libre masqué (--encre-3), jamais collé au libellé', () => {
    const [ligne] = construireDernieresSaisies(
      [
        {
          id: 1,
          le: '2026-10-05T18:00:00Z',
          action: 'point_cree',
          cible: 'point_attention',
          cible_id: 'b0000000-0000-4000-8000-000000000001',
          detail: { priorite: 'haute', mentions: [] },
          cible_texte: TEXTE_MASQUE,
        },
      ],
      COMMUNS_EXEMPLE,
    )
    expect(ligne).toMatchObject({
      texte: 'Nouveau point :',
      objet: { texte: TEXTE_MASQUE, masque: true },
    })
  })

  it('une présence dont la session n’est pas lisible : « pour une session »', () => {
    const [ligne] = construireDernieresSaisies(
      [
        {
          id: 2,
          le: '2026-09-26T20:05:00Z',
          action: 'participation_saisie',
          cible: 'session',
          cible_id: 'd0000000-0000-4000-8000-000000000001',
          detail: { valeur: 1, deja_comptes: 0 },
          cible_texte: null,
        },
      ],
      COMMUNS_EXEMPLE,
    )
    expect(ligne?.texte).toBe('Présence saisie pour une session : 1 présent')
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
    expect(lignes.every((l) => l.objet === null)).toBe(true)
  })
})
