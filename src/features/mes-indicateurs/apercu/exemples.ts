// Données d'exemple de l'aperçu de « Mes indicateurs » (lot L4) : le ministère Communication, avec
// cinq prévus de la coordination, une suggestion validée, une suggestion à valider depuis 2 jours,
// un indicateur retiré (doublon), une suggestion refusée avec son motif et une suggestion retirée
// par le ministère avec le sien (T62). Dates fixes : les captures et les tests ne dépendent pas du
// jour. Aucune valeur d'indicateur, aucun nom de personne.

import type { IndicateurDuMinistere, RefusRecu, RetraitLu } from '@/data/validationIndicateurs'
import type { LecturesMesIndicateurs, TermeDeCalcul } from '@/features/mes-indicateurs/construire'
import type { LigneVue, LimitesIndicateurs } from '@/lib/base'

export const ID_MINISTERE_EXEMPLE = '10000000-0000-4000-8000-000000000001'

type Suivi = LigneVue<'v_indicateur_suivi'>

function indicateur(
  numero: number,
  champs: Partial<IndicateurDuMinistere> &
    Pick<IndicateurDuMinistere, 'libelle' | 'definition' | 'nature'>,
): IndicateurDuMinistere {
  return {
    id: `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`,
    calcul: null,
    etat: 'actif',
    origine: 'eglise',
    modele_code: `communication_${numero}`,
    cree_le: '2026-10-01T09:00:00+02:00',
    retire_le: null,
    retrait_motif: null,
    ...champs,
  }
}

/** Ligne de `v_indicateur_suivi` : la dernière saisie et l'attente, jamais une valeur lue. */
function suivi(
  base: IndicateurDuMinistere,
  derniereSaisie: string | null,
  attenteJours: number | null = null,
): Suivi {
  return {
    indicateur_id: base.id,
    ministere_id: ID_MINISTERE_EXEMPLE,
    libelle: base.libelle,
    definition: base.definition,
    nature: base.nature,
    unite: 'nombre',
    sensible: false,
    etat: base.etat,
    origine: base.origine,
    calcul: base.calcul,
    derniere_periode: null,
    derniere_valeur: null,
    derniere_moins_de_3: false,
    derniere_saisie_le: derniereSaisie,
    mois_en_cours_valeur: null,
    mois_en_cours_moins_de_3: false,
    somme_annee: null,
    somme_moins_de_3: false,
    somme_depuis: null,
    somme_nb_saisies: null,
    somme_nb_attendues: null,
    plus_de_30_jours: false,
    etat_valeur: derniereSaisie === null ? 'jamais_saisi' : 'saisi',
    attente_jours: attenteJours,
    retire_le: base.retire_le,
  }
}

const PUBLICATIONS = indicateur(11, {
  libelle: 'Publications',
  definition: 'Publications mises en ligne par le ministère dans le mois, tous canaux confondus.',
  nature: 'mois',
})
const VISUELS = indicateur(12, {
  libelle: 'Visuels livrés ce mois',
  definition: 'Visuels terminés et remis aux ministères qui les ont demandés.',
  nature: 'a_ce_jour',
})
const DIRECTS = indicateur(13, {
  libelle: 'Directs assurés',
  definition: 'Cultes et événements diffusés en direct, comptés chaque dimanche.',
  nature: 'dimanche',
})
const TOURNAGES = indicateur(14, {
  libelle: 'Tournages réalisés',
  definition: 'Tournages menés à terme dans le mois, montage terminé ou non.',
  nature: 'mois',
})
const TAUX = indicateur(15, {
  libelle: 'Taux de livraison',
  definition: 'Part des demandes de visuels livrées dans le mois.',
  nature: 'mois',
  calcul: 'taux',
})
const DEMANDES = indicateur(16, {
  libelle: 'Demandes reçues',
  definition: 'Demandes reçues par le ministère dans le mois, sans nom ni objet.',
  nature: 'mois',
  origine: 'ministere',
  modele_code: 'suggestion_demandes_recues',
  cree_le: '2026-09-20T10:00:00+02:00',
})
const PROJETS = indicateur(17, {
  libelle: 'Projets en cours',
  definition: 'Projets du ministère lancés et pas encore terminés, le jour de la saisie.',
  nature: 'a_ce_jour',
  etat: 'en_attente',
  origine: 'ministere',
  modele_code: 'suggestion_projets_en_cours',
  cree_le: '2026-10-08T14:00:00+02:00',
})
const ARCHIVES = indicateur(18, {
  libelle: 'Vidéos archivées',
  definition: 'Vidéos rangées dans les archives du ministère dans le mois.',
  nature: 'mois',
  etat: 'retire',
  retire_le: '2026-10-03T11:00:00+02:00',
  retrait_motif: 'doublon',
})
export const ACTIVITES = indicateur(19, {
  libelle: 'Activités réalisées',
  definition:
    'Activités ponctuelles tenues dans le mois (atelier, rencontre, sortie), une fois chacune.',
  nature: 'mois',
  etat: 'retire',
  origine: 'ministere',
  modele_code: 'suggestion_activites_realisees',
  cree_le: '2026-09-25T09:00:00+02:00',
  retire_le: '2026-10-05T16:45:00+02:00',
  retrait_motif: 'refuse',
})

export const PARTICIPANTS = indicateur(20, {
  libelle: 'Participants',
  definition: 'Personnes présentes aux activités du ministère dans le mois, une fois par activité.',
  nature: 'mois',
  etat: 'retire',
  origine: 'ministere',
  modele_code: 'suggestion_participants',
  cree_le: '2026-09-15T09:00:00+02:00',
  retire_le: '2026-10-09T18:20:00+02:00',
  retrait_motif: 'ministere',
})

export const INDICATEURS_EXEMPLE: readonly IndicateurDuMinistere[] = [
  PUBLICATIONS,
  VISUELS,
  DIRECTS,
  TOURNAGES,
  TAUX,
  DEMANDES,
  PROJETS,
  ARCHIVES,
  ACTIVITES,
  PARTICIPANTS,
]

/** Le retrait de « Participants » par le ministère, avec son motif (T62). */
export const RETRAITS_EXEMPLE: readonly RetraitLu[] = [
  {
    indicateur_id: PARTICIPANTS.id,
    etat_avant: 'actif',
    motif: 'Nous comptons déjà ces présences avec les directs assurés.',
    saisi_le: '2026-10-09T18:20:00+02:00',
  },
]

/** « Taux de livraison » se sert de deux prévus : « Demandes reçues » reste retirable. */
export const TERMES_EXEMPLE: readonly TermeDeCalcul[] = [
  { calcul_id: TAUX.id, source_id: TOURNAGES.id },
  { calcul_id: TAUX.id, source_id: PUBLICATIONS.id },
]

/** Variante : « Taux de livraison » se sert de « Demandes reçues », qui ne se retire plus. */
export const TERMES_SOURCE_EXEMPLE: readonly TermeDeCalcul[] = [
  { calcul_id: TAUX.id, source_id: TOURNAGES.id },
  { calcul_id: TAUX.id, source_id: DEMANDES.id },
]

export const SUIVI_EXEMPLE: readonly Suivi[] = [
  suivi(PUBLICATIONS, '2026-10-02T10:00:00+02:00'),
  suivi(VISUELS, '2026-10-06T18:00:00+02:00'),
  suivi(DIRECTS, '2026-10-04T13:30:00+02:00'),
  suivi(TOURNAGES, null),
  suivi(TAUX, null),
  suivi(DEMANDES, '2026-10-01T09:00:00+02:00'),
  suivi(PROJETS, null, 2),
]

export const REFUS_EXEMPLE: readonly RefusRecu[] = [
  {
    indicateur_id: ACTIVITES.id,
    saisi_le: '2026-10-05T16:45:00+02:00',
    motif: 'Ce chiffre existe déjà sur votre fiche sous le nom Publications.',
  },
]

export const SUGGESTIONS_EXEMPLE: readonly LigneVue<'v_suggestions'>[] = [
  {
    ministere_id: ID_MINISTERE_EXEMPLE,
    code: 'suggestion_demandes_traitees',
    libelle: 'Demandes traitées',
    definition:
      "Demandes menées à terme par le ministère dans le mois, quel que soit leur mois d'arrivée.",
    nature: 'mois',
    unite: 'nombre',
  },
  {
    ministere_id: ID_MINISTERE_EXEMPLE,
    code: 'suggestion_personnes_formees',
    libelle: 'Personnes formées',
    definition: 'Personnes qui ont suivi une formation du ministère dans le mois, sans liste.',
    nature: 'mois',
    unite: 'nombre',
  },
  {
    ministere_id: ID_MINISTERE_EXEMPLE,
    code: 'suggestion_evenements_couverts',
    libelle: 'Événements couverts',
    definition: 'Événements EJP où le ministère a assuré sa présence dans le mois, cultes compris.',
    nature: 'mois',
    unite: 'nombre',
  },
]

/** Une limite : 2 ajouts du ministère sur 3, 7 lignes sur 30. */
export const LIMITES_EXEMPLE: LimitesIndicateurs = {
  ajouts: 2,
  ajouts_max: 3,
  lignes: 7,
  lignes_max: 30,
}

/** Les lectures de l'exemple « normal » : le ministère Communication, 7 suivis, 3 suggestions. */
export function lecturesNormales(): LecturesMesIndicateurs {
  return {
    nomMinistere: 'Communication',
    indicateurs: INDICATEURS_EXEMPLE,
    suivi: SUIVI_EXEMPLE,
    refus: REFUS_EXEMPLE,
    retraits: RETRAITS_EXEMPLE,
    termes: TERMES_EXEMPLE,
    suggestions: SUGGESTIONS_EXEMPLE,
    limites: LIMITES_EXEMPLE,
  }
}

/** Un ministère qui ne suit encore rien : l'état vide, toutes les suggestions possibles. */
export function lecturesVides(): LecturesMesIndicateurs {
  return {
    nomMinistere: 'Communication',
    indicateurs: [],
    suivi: [],
    refus: [],
    retraits: [],
    termes: [],
    suggestions: SUGGESTIONS_EXEMPLE,
    limites: { ajouts: 0, ajouts_max: 3, lignes: 0, lignes_max: 30 },
  }
}
