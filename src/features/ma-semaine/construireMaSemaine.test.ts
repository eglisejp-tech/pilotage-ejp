import { describe, expect, it } from 'vitest'
import {
  construireChiffres,
  construireDansLEglise,
  construireFij,
  sessionsALire,
  sessionsDeLaSemaine,
  versSessionLue,
} from './construireMaSemaine'
import type { SessionLue } from './construireMaSemaine'
import type { LigneVue } from '@/lib/base'
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

  it('indicateur du mois : le mois en cours en chiffre, le mois écoulé en détail', () => {
    expect(ligneDe(chiffres, 'indicateur:visuels')).toMatchObject({
      libelle: 'Visuels livrés ce mois',
      valeur: { texte: '2' },
      detail: 'Septembre en cours. Août 2026 : 6',
    })
  })

  it('indicateur du mois sans saisie du mois en cours : le mois écoulé et « pas encore de saisie »', () => {
    const propre = lecturesExemple().suivi[0]!
    const lignes = construireChiffres(
      lecturesExemple({ suivi: [{ ...propre, mois_en_cours_valeur: null }] }),
    )
    expect(ligneDe(lignes, 'indicateur:visuels')).toMatchObject({
      valeur: { texte: '6' },
      detail: 'Août 2026. Septembre en cours : pas encore de saisie',
    })
    const jamais = construireChiffres(
      lecturesExemple({
        suivi: [
          { ...propre, mois_en_cours_valeur: null, derniere_periode: null, derniere_valeur: null },
        ],
      }),
    )
    expect(ligneDe(jamais, 'indicateur:visuels')).toMatchObject({
      valeur: { etat: 'vide' },
      detail: 'Septembre en cours : pas encore de saisie',
    })
  })

  it('indicateur du dimanche : le chiffre de ce dimanche, sinon la date de la dernière saisie', () => {
    const propre = lecturesExemple().suivi[0]!
    const dimanche = {
      ...propre,
      indicateur_id: 'ateliers',
      libelle: 'Ateliers tenus',
      nature: 'dimanche' as const,
      mois_en_cours_valeur: null,
    }
    const recent = construireChiffres(
      lecturesExemple({
        suivi: [{ ...dimanche, derniere_periode: '2026-09-27', derniere_valeur: 4 }],
      }),
    )
    expect(ligneDe(recent, 'indicateur:ateliers')).toMatchObject({
      valeur: { texte: '4' },
      detail: 'Dimanche 27 sept.',
    })
    const ancien = construireChiffres(
      lecturesExemple({
        suivi: [{ ...dimanche, derniere_periode: '2026-06-14', derniere_valeur: 4 }],
      }),
    )
    expect(ligneDe(ancien, 'indicateur:ateliers')).toMatchObject({
      valeur: { etat: 'vide' },
      detail: 'Dernière saisie : dimanche 14 juin',
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
      libelle: 'Total de la carte des FIJ',
      valeur: { texte: '29' },
      detail: '8 dép., saisi le 21 sept.',
    })
    expect(ligneDe(fij, 'fij_statistiques')).toMatchObject({
      libelle: 'Chiffres par département saisis',
      valeur: { texte: '30' },
      detail: 'sur 32, dimanche 27 sept.',
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

  it('aucun nom d’un autre ministère, aucun classement, même quand les lignes lues les portent', () => {
    // Lignes brutes de la base : `manquants` porte des noms, un indicateur est celui d'un autre
    // ministère. Rien de cela ne doit atteindre l'écran.
    const brutes: LigneVue<'v_session_completude'>[] = [
      {
        session_id: 'batir-26',
        type: 'batir',
        date: '2026-09-26',
        intitule: null,
        a_eu_lieu: true,
        nb_attendus: 8,
        nb_saisis: 6,
        total_saisi: 58,
        total: 58,
        manquants: ['Social', 'Intégration'],
      },
      {
        session_id: 'batir-19',
        type: 'batir',
        date: '2026-09-19',
        intitule: null,
        a_eu_lieu: true,
        nb_attendus: 8,
        nb_saisis: 8,
        total_saisi: 72,
        total: 72,
        manquants: [],
      },
    ]
    const propre = lectures.suivi[0]!
    const donnees = lecturesExemple({
      sessions: brutes.map(versSessionLue),
      suivi: [
        propre,
        {
          ...propre,
          indicateur_id: 'jeunesse-camps',
          ministere_id: 'jeunesse',
          libelle: 'Camps Jeunesse',
        },
      ],
    })
    const textes = tousLesTextes([
      construireChiffres(donnees),
      construireFij(donnees),
      construireDansLEglise(donnees),
    ])
    for (const nom of AUTRES_MINISTERES) {
      expect(
        textes.filter((texte) => texte.includes(nom)),
        nom,
      ).toEqual([])
    }
    expect(textes.filter((texte) => /\d(er|e) sur|rang|classement/i.test(texte))).toEqual([])
    // Les manquants ne passent pas : la ligne de session ne porte que des nombres.
    expect(Object.keys(construireDansLEglise(donnees)[1]!).toSorted()).toEqual([
      'cle',
      'detail',
      'libelle',
      'valeur',
    ])
  })

  it('versSessionLue : seuls les champs de « Ma semaine » passent, jamais manquants', () => {
    const brute: LigneVue<'v_session_completude'> = {
      session_id: 's',
      type: 'batir',
      date: '2026-09-26',
      intitule: null,
      a_eu_lieu: true,
      nb_attendus: 8,
      nb_saisis: 6,
      total_saisi: 58,
      total: 58,
      manquants: ['Social', 'Intégration'],
    }
    const lue = versSessionLue(brute)
    expect(Object.keys(lue).toSorted()).toEqual([
      'date',
      'intitule',
      'nb_attendus',
      'nb_saisis',
      'session_id',
      'total',
      'type',
    ])
    expect(JSON.stringify(lue)).not.toMatch(/Social|Intégration|manquants/)
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

  it('le dimanche de référence sans ligne de total : pas de ligne, un total sans complétude disparaît', () => {
    const lignes = construireDansLEglise(lecturesExemple({ totauxDimanche: [] }))
    expect(lignes.map((ligne) => ligne.cle)).toEqual(['session'])
    expect(construireDansLEglise(lecturesExemple({ totauxDimanche: [], sessions: [] }))).toEqual([])
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
