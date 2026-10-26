import { describe, expect, it } from 'vitest'
import { CODES_RAISONS, suppressionDe, suppressionsParMinistere } from '@/features/comptes/raisons'
import type { CodeRaison } from '@/features/comptes/raisons'
import {
  confirmationSupprimerMinistere,
  refusSuppression,
  texteRaison,
} from '@/features/comptes/textes'

// T75 : « Supprimer » partout, avec la raison d'un refus. La base rend des codes stables et un
// nombre (public.raisons_suppression_ministere) ; l'écran les traduit en mots simples.

const TECH = '10000000-0000-4000-8000-000000000010'
const COM = '10000000-0000-4000-8000-000000000001'
/** Tiret cadratin et demi-cadratin, interdits dans les textes (écrits par leur code). */
const TIRETS = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)

describe('raisons d’un refus de suppression (T75)', () => {
  it('lignes de la base : les raisons qui bloquent, et les sessions à quitter à part', () => {
    expect(
      suppressionDe([
        { code: 'chiffres', nombre: 12, bloque: true },
        { code: 'points', nombre: 3, bloque: true },
        { code: 'sessions_attendues', nombre: 2, bloque: false },
      ]),
    ).toEqual({
      raisons: [
        { code: 'chiffres', nombre: 12 },
        { code: 'points', nombre: 3 },
      ],
      sessions: 2,
    })
    expect(suppressionDe([])).toEqual({ raisons: [], sessions: 0 })
  })

  it('un code que l’écran ne connaît pas encore bloque, sous « une autre donnée »', () => {
    expect(suppressionDe([{ code: 'code_de_demain', nombre: 4, bloque: true }])).toEqual({
      raisons: [{ code: 'autre_donnee', nombre: 4 }],
      sessions: 0,
    })
  })

  it('par ministère : chaque ministère a ses raisons, dans l’ordre de la base', () => {
    const parMinistere = suppressionsParMinistere([
      { ministere_id: COM, code: 'compte_deja_active', nombre: 1, bloque: true },
      { ministere_id: TECH, code: 'sessions_attendues', nombre: 1, bloque: false },
      { ministere_id: COM, code: 'chiffres', nombre: 12, bloque: true },
    ])
    expect(parMinistere.get(TECH)).toEqual({ raisons: [], sessions: 1 })
    expect(parMinistere.get(COM)?.raisons.map((r) => r.code)).toEqual([
      'compte_deja_active',
      'chiffres',
    ])
    expect(parMinistere.get('inconnu')).toBeUndefined()
  })

  it.each<[CodeRaison, number, string]>([
    ['compte_deja_active', 1, 'son compte a déjà été activé'],
    ['compte_deja_active', 2, 'ses 2 comptes ont déjà été activés'],
    ['chiffres', 1, '1 chiffre saisi'],
    ['chiffres', 12, '12 chiffres saisis'],
    ['presences', 1, 'des présences saisies pour 1 session'],
    ['presences', 3, 'des présences saisies pour 3 sessions'],
    ['carte_fij', 1, '1 chiffre de la carte des FIJ'],
    ['carte_fij', 5, '5 chiffres de la carte des FIJ'],
    ['statistiques_fij', 1, '1 statistique FIJ par département'],
    ['statistiques_fij', 4, '4 statistiques FIJ par département'],
    ['repartitions', 1, "1 répartition d'un chiffre sensible"],
    ['repartitions', 2, '2 répartitions de chiffres sensibles'],
    ['precisions', 1, "1 précision d'un chiffre sensible"],
    ['precisions', 2, '2 précisions de chiffres sensibles'],
    ['points', 1, "1 point d'attention"],
    ['points', 3, "3 points d'attention"],
    ['mentions_points', 1, "mentionné dans 1 point d'attention"],
    ['mentions_points', 2, "mentionné dans 2 points d'attention"],
    ['evenements', 1, '1 événement'],
    ['evenements', 2, '2 événements'],
    ['mentions_evenements', 1, 'mentionné dans 1 événement'],
    ['mentions_evenements', 3, 'mentionné dans 3 événements'],
    ['reunions', 1, '1 réunion'],
    ['reunions', 4, '4 réunions'],
    ['signalements', 1, '1 signalement'],
    ['signalements', 2, '2 signalements'],
    ['demandes', 1, "1 demande d'indicateur"],
    ['demandes', 2, "2 demandes d'indicateur"],
    ['validations', 1, "1 décision sur ses demandes d'indicateur"],
    ['validations', 2, "2 décisions sur ses demandes d'indicateur"],
    ['retraits', 1, '1 indicateur retiré par le ministère'],
    ['retraits', 2, '2 indicateurs retirés par le ministère'],
    ['autre_donnee', 1, "une autre donnée le relie encore à l'outil"],
    // Le séparateur des milliers est insécable (nombre(), src/lib/metier/texte.ts).
    ['chiffres', 1234, '1 234 chiffres saisis'],
  ])('%s (%i) : « %s »', (code, nombre, texte) => {
    expect(texteRaison({ code, nombre })).toBe(texte)
  })

  it('chaque code a sa phrase, sans tiret long', () => {
    for (const code of CODES_RAISONS) {
      if (code === 'ministere_de_reference') continue
      const texte = texteRaison({ code, nombre: 2 })
      expect(texte).not.toMatch(TIRETS)
      expect(texte).not.toContain('_')
    }
  })

  it('fenêtre « impossible » : le titre, les raisons chiffrées, puis « Désactiver » à la place', () => {
    expect(
      refusSuppression(
        'Communication',
        [
          { code: 'compte_deja_active', nombre: 1 },
          { code: 'chiffres', nombre: 12 },
          { code: 'points', nombre: 3 },
        ],
        true,
      ),
    ).toEqual({
      titre: 'Communication ne peut pas être supprimé',
      texte: "Il a déjà des données dans l'outil :",
      raisons: ['son compte a déjà été activé', '12 chiffres saisis', "3 points d'attention"],
      suite: 'Désactivez-le à la place : plus personne ne se connecte, son historique reste.',
      desactiver: 'Désactiver',
      fermer: 'Fermer',
    })
  })

  it('déjà désactivé, ou sans compte : « Fermer » seul', () => {
    const refus = refusSuppression('Merch', [{ code: 'chiffres', nombre: 30 }], false)
    expect(refus.suite).toBeNull()
    expect(refus.desactiver).toBeNull()
    expect(refus.fermer).toBe('Fermer')
  })

  it('Coordination et FIJ : une seule phrase, sans liste', () => {
    expect(
      refusSuppression('Coordination', [{ code: 'ministere_de_reference', nombre: 1 }], false),
    ).toEqual({
      titre: 'Coordination ne peut pas être supprimé',
      texte: 'Coordination et FIJ ne se suppriment jamais.',
      raisons: [],
      suite: null,
      desactiver: null,
      fermer: 'Fermer',
    })
    const fij = refusSuppression('FIJ', [{ code: 'ministere_de_reference', nombre: 1 }], true)
    expect(fij.texte).toBe('Coordination et FIJ ne se suppriment jamais.')
    expect(fij.desactiver).toBe('Désactiver')
  })

  it('fenêtre « supprimable » : les sessions qu’il quitte, au singulier et au pluriel', () => {
    expect(confirmationSupprimerMinistere('EJP TECH', 'tech@exemple.test', 8, 1).texte).toBe(
      "EJP TECH, ses 8 indicateurs et son compte (tech@exemple.test) disparaissent de l'outil. Il sort aussi de la liste des ministères attendus d'une session. Le journal garde la trace de la suppression. C'est définitif.",
    )
    expect(confirmationSupprimerMinistere('Social', null, 0, 2).texte).toBe(
      "Social disparaît de l'outil. Il sort aussi de la liste des ministères attendus de 2 sessions. Le journal garde la trace de la suppression. C'est définitif.",
    )
    expect(confirmationSupprimerMinistere('EJP Formation', null, 0).texte).toBe(
      "EJP Formation disparaît de l'outil. Le journal garde la trace de la suppression. C'est définitif.",
    )
  })
})
