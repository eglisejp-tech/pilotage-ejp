// Données d'exemple de « Ma semaine » (Communication, semaine 39), pour l'aperçu et les tests :
// les lectures telles que la base les rend, que `construireMaSemaine.ts` met en forme. Les
// chiffres suivent la maquette 12 (10 au service, 14 actifs dont 11 en FIJ, 13 présents à Bâtir
// l'Église) et la maquette 07 (52 STARs au service dans l'église, « 6 sur 8 »).

import {
  exempleAccueil,
  LIGNE_BATIR_FAITE,
  LIGNE_DIMANCHE_A_FAIRE,
  LIGNE_DIMANCHE_FAIT,
  LIGNE_EVENEMENT_A_CONFIRMER,
  LIGNE_EVENEMENT_HEURE_DEBUT,
  LIGNE_EVENEMENT_SANS_ETAT_FINAL,
  LIGNE_REUNION_A_FAIRE,
  LIGNE_REUNION_FAITE,
  MINISTERE_EXEMPLE,
} from '@/features/accueil-ministere/exempleAccueil'
import type { DonneesAccueilMinistere } from '@/features/accueil-ministere/types'
import type { LigneVue } from '@/lib/base'
import type { LecturesMaSemaine, SessionLue } from './construireMaSemaine'
import { construireChiffres, construireDansLEglise, construireFij } from './construireMaSemaine'
import type { DonneesMaSemaine } from './types'

const SERVICE = 'c-service'
const ACTIFS = 'c-actifs'
const EN_FIJ = 'c-en-fij'

function mesure(
  indicateur: string,
  nature: 'dimanche' | 'a_ce_jour' | 'mois',
  periode: string,
  valeur: number,
): LigneVue<'v_mesure_periode'> {
  return {
    indicateur_id: indicateur,
    ministere_id: MINISTERE_EXEMPLE,
    nature,
    periode,
    valeur,
    moins_de_3: false,
    saisi_le: `${periode}T10:00:00+02:00`,
  }
}

/** Dix dimanches du 26 juillet au 27 septembre, avec un trou (le 9 août). */
const SERVICE_PAR_DIMANCHE: [string, number | null][] = [
  ['2026-07-26', 8],
  ['2026-08-02', 9],
  ['2026-08-09', null],
  ['2026-08-16', 10],
  ['2026-08-23', 8],
  ['2026-08-30', 9],
  ['2026-09-06', 11],
  ['2026-09-13', 10],
  ['2026-09-20', 9],
  ['2026-09-27', 10],
]

export const INDICATEUR_PROPRE_EXEMPLE: LigneVue<'v_indicateur_suivi'> = {
  indicateur_id: 'visuels',
  ministere_id: MINISTERE_EXEMPLE,
  libelle: 'Visuels livrés ce mois',
  definition: 'Nombre de visuels livrés dans le mois.',
  nature: 'mois',
  unite: 'nombre',
  sensible: false,
  etat: 'actif',
  origine: 'ministere',
  calcul: null,
  derniere_periode: '2026-08-01',
  derniere_valeur: 6,
  derniere_moins_de_3: false,
  derniere_saisie_le: '2026-09-30T10:00:00+02:00',
  mois_en_cours_valeur: 2,
  mois_en_cours_moins_de_3: false,
  somme_annee: 40,
  somme_moins_de_3: false,
  somme_depuis: '2026-01-01',
  somme_nb_saisies: 9,
  somme_nb_attendues: 9,
  plus_de_30_jours: false,
  etat_valeur: 'saisi',
  attente_jours: null,
  retire_le: null,
}

const SESSIONS_EXEMPLE: SessionLue[] = [
  {
    session_id: 'batir-26',
    type: 'batir',
    intitule: null,
    date: '2026-09-26',
    nb_attendus: 8,
    nb_saisis: 6,
    total: 58,
  },
  {
    session_id: 'batir-19',
    type: 'batir',
    intitule: null,
    date: '2026-09-19',
    nb_attendus: 8,
    nb_saisis: 8,
    total: 72,
  },
]

/** Lectures de la semaine 39 pour Communication (« Bâtir l'Église » du 26 sept.). */
export function lecturesExemple(surcharge: Partial<LecturesMaSemaine> = {}): LecturesMaSemaine {
  return {
    ministereId: MINISTERE_EXEMPLE,
    semaine: { aujourdhui: '2026-09-29', lundi: '2026-09-21', dimanche: '2026-09-27' },
    estFij: false,
    communs: [
      { id: SERVICE, code: 'service', nature: 'dimanche' },
      { id: ACTIFS, code: 'actifs', nature: 'a_ce_jour' },
      { id: EN_FIJ, code: 'en_fij', nature: 'a_ce_jour' },
    ],
    libellesCommuns: [],
    mesuresCommuns: [
      ...SERVICE_PAR_DIMANCHE.flatMap(([periode, valeur]) =>
        valeur === null ? [] : [mesure(SERVICE, 'dimanche', periode, valeur)],
      ),
      mesure(ACTIFS, 'a_ce_jour', '2026-09-24', 14),
      mesure(EN_FIJ, 'a_ce_jour', '2026-09-24', 11),
    ],
    suivi: [INDICATEUR_PROPRE_EXEMPLE],
    sessions: SESSIONS_EXEMPLE,
    attendues: ['batir-26', 'batir-19'],
    mesParticipations: [
      { session_id: 'batir-26', valeur: 13 },
      { session_id: 'batir-19', valeur: 12 },
    ],
    totauxDimanche: [
      { indicateur_id: SERVICE, dimanche: '2026-09-27', total: 52, nb_saisis: 6, nb_attendus: 8 },
    ],
    carte: [],
    statistiques: [],
    ...surcharge,
  }
}

/** « Ma semaine » de la maquette 07, complétée par les chiffres de la maquette 12. */
export function exempleMaSemaine(
  lectures: LecturesMaSemaine = lecturesExemple(),
  accueil: DonneesAccueilMinistere = exempleAccueil(),
): DonneesMaSemaine {
  return {
    accueil,
    semaine: { numero: 39, periode: 'du 21 au 27 sept.' },
    chiffres: construireChiffres(lectures),
    fij: construireFij(lectures),
    eglise: construireDansLEglise(lectures),
    signalements: null,
  }
}

/** Premier dimanche : rien n'est saisi, ni par le ministère ni dans l'église. */
export function exemplePremierDimanche(): DonneesMaSemaine {
  return exempleMaSemaine(
    lecturesExemple({
      mesuresCommuns: [],
      suivi: [],
      sessions: [],
      attendues: [],
      mesParticipations: [],
      totauxDimanche: [
        {
          indicateur_id: SERVICE,
          dimanche: '2026-09-27',
          total: null,
          nb_saisis: 0,
          nb_attendus: 8,
        },
      ],
    }),
    exempleAccueil([LIGNE_DIMANCHE_A_FAIRE, LIGNE_REUNION_A_FAIRE]),
  )
}

/** Lectures du ministère FIJ : 29 FIJ sur 8 départements, 30 valeurs sur 32 cette semaine. */
export function lecturesFijExemple(): LecturesMaSemaine {
  const departements = ['75', '77', '78', '91', '92', '93', '94', '95'] as const
  const valeurs = [4, 3, 2, 3, 5, 6, 4, 2]
  return lecturesExemple({
    estFij: true,
    carte: departements.map((departement, rang) => ({
      departement,
      valeur: valeurs[rang] ?? 0,
      saisi_le: '2026-09-21T09:00:00+02:00',
    })),
    statistiques: [
      { dimanche: '2026-09-27', nb_departements: 8 },
      { dimanche: '2026-09-27', nb_departements: 8 },
      { dimanche: '2026-09-27', nb_departements: 6 },
      { dimanche: '2026-09-27', nb_departements: 8 },
    ],
  })
}

/** Le ministère FIJ : sa carte et ses chiffres par département s'ajoutent à ses chiffres. */
export function exempleFij(): DonneesMaSemaine {
  return exempleMaSemaine(lecturesFijExemple())
}

/**
 * Chiffres, session et réunion faits ; trois événements du ministère attendent (T31, T68) : un à
 * confirmer, un passé sans état final et un Terminé sans heure de début.
 */
export function exempleEvenements(): DonneesMaSemaine {
  return exempleMaSemaine(
    lecturesExemple(),
    exempleAccueil([
      LIGNE_DIMANCHE_FAIT,
      LIGNE_BATIR_FAITE,
      LIGNE_REUNION_FAITE,
      LIGNE_EVENEMENT_SANS_ETAT_FINAL,
      LIGNE_EVENEMENT_HEURE_DEBUT,
      LIGNE_EVENEMENT_A_CONFIRMER,
    ]),
  )
}
