import { describe, expect, it } from 'vitest'
import {
  construireChiffres,
  construireDansLEglise,
  construireFij,
  sessionsALire,
  sessionsDeLaSemaine,
} from './construireMaSemaine'
import type { SessionLue } from './construireMaSemaine'
import {
  exempleFij,
  exempleMaSemaine,
  exemplePremierDimanche,
  lecturesExemple,
  lecturesFijExemple,
} from './exempleMaSemaine'

/** Noms des autres ministères : aucun ne doit apparaître dans les chiffres de « Ma semaine ». */
const AUTRES_MINISTERES = [
  'Social',
  'Coordination',
  'Intégration',
  'Jeunesse',
  'Prodiges Junior',
  'EJP Formation',
]

function tousLesTextes(valeur: unknown): string[] {
  if (typeof valeur === 'string') return [valeur]
  if (Array.isArray(valeur)) return valeur.flatMap(tousLesTextes)
  if (valeur !== null && typeof valeur === 'object') {
    return Object.values(valeur).flatMap(tousLesTextes)
  }
  return []
}

const ligneDe = <T extends { cle: string }>(lignes: T[], cle: string): T | undefined =>
  lignes.find((l) => l.cle === cle)

describe('« Vos chiffres de la semaine »', () => {
  const chiffres = construireChiffres(lecturesExemple())

  it('les trois chiffres du ministère : service avec écart et courbe, actifs, en FIJ calculé', () => {
    expect(chiffres.slice(0, 3).map((ligne) => ligne.cle)).toEqual(['service', 'actifs', 'en_fij'])
    const service = ligneDe(chiffres, 'service')
    expect(service).toMatchObject({
      valeur: { etat: 'saisie', texte: '10' },
      ecart: { texte: '+1', sens: 'hausse' },
      detail: 'Dimanche 27 sept.',
    })
    expect(service?.courbe?.points).toHaveLength(10)
    expect(ligneDe(chiffres, 'actifs')).toMatchObject({ valeur: { texte: '14' } })
    expect(ligneDe(chiffres, 'en_fij')).toMatchObject({
      valeur: { texte: '79', unite: '%' },
      detail: '11 sur 14, calculé',
    })
  })

  it('une ligne par session de la semaine : ses présents et l’écart à la session précédente', () => {
    expect(ligneDe(chiffres, 'session:batir-26')).toMatchObject({
      libelle: "Présents à Bâtir l'Église",
      valeur: { texte: '13' },
      ecart: { texte: '+1', sens: 'hausse' },
      detail: 'Samedi 26 sept.',
    })
    // La session du 19 sept. n'est plus de la semaine : pas de ligne, seulement l'écart.
    expect(ligneDe(chiffres, 'session:batir-19')).toBeUndefined()
  })

  it('une session sans saisie du ministère : « Pas encore de saisie », jamais 0', () => {
    const lignes = construireChiffres(lecturesExemple({ mesParticipations: [] }))
    expect(ligneDe(lignes, 'session:batir-26')).toMatchObject({
      valeur: { etat: 'vide' },
      ecart: null,
    })
  })

  it('la session précédente non saisie : l’écart dit la date, sans nombre inventé', () => {
    const lignes = construireChiffres(
      lecturesExemple({ mesParticipations: [{ session_id: 'batir-26', valeur: 13 }] }),
    )
    expect(ligneDe(lignes, 'session:batir-26')).toMatchObject({
      ecart: { sens: 'non_saisi', texte: 'samedi 19 sept. non saisi' },
    })
  })

  it('les indicateurs propres : le mois écoulé et le mois en cours', () => {
    expect(ligneDe(chiffres, 'indicateur:visuels')).toMatchObject({
      libelle: 'Visuels livrés ce mois',
      valeur: { texte: '6' },
      detail: 'Août 2026. Septembre en cours : 2',
    })
  })

  it('ni calcul, ni indicateur retiré ou à valider, ni indicateur d’un autre ministère', () => {
    const propre = lecturesExemple().suivi[0]!
    const lignes = construireChiffres(
      lecturesExemple({
        suivi: [
          { ...propre, indicateur_id: 'calcul', calcul: 'taux' },
          { ...propre, indicateur_id: 'retire', retire_le: '2026-09-01T10:00:00+02:00' },
          { ...propre, indicateur_id: 'valider', etat: 'en_attente' },
          { ...propre, indicateur_id: 'autre', ministere_id: 'social' },
          { ...propre, indicateur_id: 'ce-jour', nature: 'a_ce_jour' },
        ],
      }),
    )
    expect(lignes.filter((ligne) => ligne.cle.startsWith('indicateur:'))).toEqual([])
  })

  it('sans aucune saisie : « Pas encore de saisie » partout, jamais un 0', () => {
    const lignes = construireChiffres(
      lecturesExemple({
        mesuresCommuns: [],
        suivi: [],
        mesParticipations: [],
        sessions: [],
        attendues: [],
      }),
    )
    expect(lignes.map((ligne) => ligne.cle)).toEqual(['service', 'actifs', 'en_fij'])
    for (const ligne of lignes) expect(ligne.valeur.etat).toBe('vide')
  })
})

describe('sessions de la semaine', () => {
  const session = (id: string, date: string, type: SessionLue['type'] = 'batir'): SessionLue => ({
    session_id: id,
    type,
    intitule: type === 'autre' ? 'Veillée' : null,
    date,
    nb_attendus: 8,
    nb_saisis: 8,
    total: 70,
  })
  const base = {
    semaine: { aujourdhui: '2026-09-29', lundi: '2026-09-21', dimanche: '2026-09-27' },
  }

  it('du lundi à aujourd’hui, où le ministère est attendu, dans l’ordre des dates', () => {
    const sessions = [
      session('apres', '2026-09-30'),
      session('b', '2026-09-27', 'anti_dispersion'),
      session('a', '2026-09-26'),
      session('avant', '2026-09-20'),
      session('pas-attendu', '2026-09-25'),
    ]
    const attendues = ['apres', 'a', 'b', 'avant']
    expect(sessionsDeLaSemaine({ ...base, sessions, attendues }).map((s) => s.session_id)).toEqual([
      'a',
      'b',
    ])
  })

  it('lit aussi la session précédente de chaque type où le ministère était attendu', () => {
    const sessions = [
      session('batir-26', '2026-09-26'),
      session('batir-19', '2026-09-19'),
      session('batir-12', '2026-09-12'),
      session('anti-27', '2026-09-27', 'anti_dispersion'),
    ]
    expect(
      sessionsALire({ ...base, sessions, attendues: ['batir-26', 'batir-19', 'batir-12'] }),
    ).toEqual(['batir-19', 'batir-26'])
  })

  it('un autre rassemblement n’a pas de session précédente : pas d’écart', () => {
    const sessions = [
      session('veillee-2', '2026-09-26', 'autre'),
      session('veillee-1', '2026-09-12', 'autre'),
    ]
    const attendues = ['veillee-2', 'veillee-1']
    expect(sessionsALire({ ...base, sessions, attendues })).toEqual(['veillee-2'])
    const lignes = construireChiffres(
      lecturesExemple({
        sessions,
        attendues,
        mesParticipations: [
          { session_id: 'veillee-2', valeur: 20 },
          { session_id: 'veillee-1', valeur: 18 },
        ],
      }),
    )
    expect(ligneDe(lignes, 'session:veillee-2')).toMatchObject({
      libelle: 'Présents à Veillée',
      valeur: { texte: '20' },
      ecart: null,
    })
  })
})

describe('carte et chiffres par département : le ministère FIJ seul', () => {
  it('aucune ligne pour un autre ministère', () => {
    expect(construireFij(lecturesExemple())).toEqual([])
    expect(
      construireFij(
        lecturesExemple({
          estFij: false,
          carte: [{ departement: '75', valeur: 4, saisi_le: '2026-09-21T09:00:00+02:00' }],
        }),
      ),
    ).toEqual([])
  })

  it('FIJ : le total de la carte, « 8 dép. », le dernier envoi, puis la complétude des valeurs', () => {
    const fij = construireFij(lecturesFijExemple())
    expect(ligneDe(fij, 'carte_fij')).toMatchObject({
      valeur: { texte: '29' },
      detail: '8 dép., saisi le 21 sept.',
    })
    expect(ligneDe(fij, 'fij_statistiques')).toMatchObject({
      valeur: { texte: '30' },
      detail: 'sur 32 valeurs, dimanche 27 sept.',
    })
  })

  it('FIJ sans aucune saisie : « Pas encore de saisie »', () => {
    const fij = construireFij(lecturesExemple({ estFij: true }))
    expect(fij.map((ligne) => ligne.valeur.etat)).toEqual(['vide', 'vide'])
  })

  it('« Ma semaine » du ministère FIJ porte la carte, celle des autres non', () => {
    expect(exempleFij().fij).toHaveLength(2)
    expect(exempleMaSemaine().fij).toEqual([])
  })
})

describe('« Dans l’église »', () => {
  const lectures = lecturesExemple()

  it('deux totaux, chacun avec sa complétude « x sur N »', () => {
    const lignes = construireDansLEglise(lectures)
    expect(lignes).toEqual([
      {
        cle: 'service',
        libelle: 'STARs au service',
        valeur: '52',
        detail: 'Dimanche 27 sept., 6 sur 8',
      },
      {
        cle: 'session',
        libelle: "Présents à Bâtir l'Église",
        valeur: '58',
        detail: 'Sam. 26 sept., 6 sur 8',
      },
    ])
    for (const ligne of lignes) expect(ligne.detail).toMatch(/\d+ sur \d+$/)
  })

  it('aucun nom d’un autre ministère, aucun classement', () => {
    const textes = tousLesTextes([
      construireChiffres(lectures),
      construireFij(lectures),
      construireDansLEglise(lectures),
    ])
    for (const nom of AUTRES_MINISTERES) {
      expect(
        textes.filter((texte) => texte.includes(nom)),
        nom,
      ).toEqual([])
    }
    expect(textes.filter((texte) => /\d(er|e) sur|rang|classement/i.test(texte))).toEqual([])
    // Les manquants ne sont jamais lus : la ligne de session ne porte que des nombres.
    expect(Object.keys(construireDansLEglise(lectures)[1]!).toSorted()).toEqual([
      'cle',
      'detail',
      'libelle',
      'valeur',
    ])
  })

  it('personne n’a saisi : « Pas encore de saisie » à la place du nombre, complétude « 0 sur 8 »', () => {
    const lignes = construireDansLEglise(exemplePremierDimancheLectures())
    expect(lignes[0]).toMatchObject({ valeur: null, detail: 'Dimanche 27 sept., 0 sur 8' })
    expect(lignes).toHaveLength(1)
  })

  it('session passée sans aucune saisie : pas de total, jamais 0', () => {
    const lignes = construireDansLEglise(
      lecturesExemple({
        sessions: [
          {
            session_id: 's',
            type: 'anti_dispersion',
            intitule: null,
            date: '2026-09-27',
            nb_attendus: 8,
            nb_saisis: 0,
            total: 0,
          },
        ],
      }),
    )
    expect(lignes[1]).toMatchObject({
      libelle: 'Présents à Anti-Dispersion',
      valeur: null,
      detail: 'Dim. 27 sept., 0 sur 8',
    })
  })

  it('le dimanche de référence sans ligne de total : le jour, sans complétude inventée', () => {
    const lignes = construireDansLEglise(lecturesExemple({ totauxDimanche: [] }))
    expect(lignes[0]).toMatchObject({ valeur: null, detail: 'Dimanche 27 sept.' })
  })

  it('premier dimanche : aucun nom ni nombre inventé dans toute la page', () => {
    const donnees = exemplePremierDimanche()
    const textes = tousLesTextes([donnees.chiffres, donnees.fij, donnees.eglise])
    for (const nom of AUTRES_MINISTERES) {
      expect(
        textes.filter((texte) => texte.includes(nom)),
        nom,
      ).toEqual([])
    }
  })
})

function exemplePremierDimancheLectures() {
  return lecturesExemple({
    sessions: [],
    totauxDimanche: [
      {
        indicateur_id: 'c-service',
        dimanche: '2026-09-27',
        total: null,
        nb_saisis: 0,
        nb_attendus: 8,
      },
    ],
  })
}
