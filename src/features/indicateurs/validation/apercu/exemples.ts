// Données d'exemple de l'aperçu du bloc « À valider » (lot L4) : trois ajouts qui attendent EJP
// Tech (dont un en retard, un « Pourquoi » masqué et un sans valeur), trois décisions récentes et
// deux retraits faits par des ministères (T62), dont un motif masqué. Dates fixes : les captures
// et les tests ne dépendent pas du jour. Aucun nom de personne.

import type {
  AttenteAdministration,
  DecisionRecente,
  RetraitRecent,
} from '@/data/validationIndicateurs'
import type { LigneVue } from '@/lib/base'

type Demande = LigneVue<'v_a_valider'>

export const DEMANDES_EXEMPLE: readonly Demande[] = [
  {
    demande_id: '00000000-0000-4000-8000-0000000000a1',
    objet: 'ajout',
    indicateur_id: '00000000-0000-4000-8000-0000000000b1',
    ministere_id: '10000000-0000-4000-8000-000000000011',
    ministere_nom: 'Kumi',
    libelle_actuel: 'Demandes reçues',
    libelle_envoye: 'Demandes reçues',
    definition: 'Demandes reçues par le ministère dans le mois, sans nom ni objet.',
    nature: 'mois',
    pourquoi: "Suivre les demandes de l'équipe pour mieux répartir le travail chaque mois.",
    saisi_le: '2026-10-01T10:00:00+02:00',
    attente_jours: 9,
    en_retard: true,
    nb_valeurs: 2,
  },
  {
    demande_id: '00000000-0000-4000-8000-0000000000a2',
    objet: 'ajout',
    indicateur_id: '00000000-0000-4000-8000-0000000000b2',
    ministere_id: '10000000-0000-4000-8000-000000000001',
    ministere_nom: 'Communication',
    libelle_actuel: 'Projets en cours',
    libelle_envoye: 'Projets en cours',
    definition: 'Projets du ministère lancés et pas encore terminés, le jour de la saisie.',
    nature: 'a_ce_jour',
    pourquoi: 'Voir combien de projets restent ouverts en même temps.',
    saisi_le: '2026-10-07T14:30:00+02:00',
    attente_jours: 3,
    en_retard: false,
    nb_valeurs: 0,
  },
  {
    demande_id: '00000000-0000-4000-8000-0000000000a3',
    objet: 'ajout',
    indicateur_id: '00000000-0000-4000-8000-0000000000b3',
    ministere_id: '10000000-0000-4000-8000-000000000003',
    ministere_nom: 'Intégration',
    libelle_actuel: 'Personnes formées',
    libelle_envoye: 'Personnes formées',
    definition: 'Personnes qui ont suivi une formation du ministère dans le mois, sans liste.',
    nature: 'mois',
    pourquoi: '[texte masqué par EJP Tech]',
    saisi_le: '2026-10-10T09:15:00+02:00',
    attente_jours: 0,
    en_retard: false,
    nb_valeurs: 0,
  },
]

/** La même attente, telle que l'administration la lit : sans « Pourquoi ». */
export const ATTENTES_EXEMPLE: readonly AttenteAdministration[] = DEMANDES_EXEMPLE.map(
  (demande) => ({
    indicateur_id: demande.indicateur_id,
    ministere_id: demande.ministere_id,
    ministere_nom: demande.ministere_nom,
    libelle: demande.libelle_actuel ?? demande.libelle_envoye,
    definition: demande.definition,
    nature: demande.nature,
    cree_le: demande.saisi_le,
    attente_jours: demande.attente_jours,
  }),
)

export const DECISIONS_EXEMPLE: readonly DecisionRecente[] = [
  {
    validation_id: '00000000-0000-4000-8000-0000000000c1',
    ministere_nom: 'Eagles',
    libelle: 'Participants',
    decision: 'valide',
    motif: null,
    saisi_le: '2026-10-08T11:00:00+02:00',
  },
  {
    validation_id: '00000000-0000-4000-8000-0000000000c2',
    ministere_nom: 'Jeunesse',
    libelle: 'Activités réalisées',
    decision: 'refuse',
    motif: 'Ce chiffre existe déjà sur la fiche sous un autre nom.',
    saisi_le: '2026-10-05T16:45:00+02:00',
  },
  {
    validation_id: '00000000-0000-4000-8000-0000000000c3',
    ministere_nom: 'Film',
    libelle: 'Mobilisés aux événements',
    decision: 'refuse',
    motif: '[texte masqué par EJP Tech]',
    saisi_le: '2026-09-28T09:00:00+02:00',
  },
]

/** Deux retraits faits par des ministères (T62) : une demande à valider, un ajout validé masqué. */
export const RETRAITS_EXEMPLE: readonly RetraitRecent[] = [
  {
    retrait_id: '00000000-0000-4000-8000-0000000000d1',
    ministere_nom: 'Kumi',
    libelle: 'Projets en cours',
    etat_avant: 'en_attente',
    motif: 'Nous suivons déjà ces projets dans « Activités réalisées ».',
    saisi_le: '2026-10-09T17:30:00+02:00',
  },
  {
    retrait_id: '00000000-0000-4000-8000-0000000000d2',
    ministere_nom: 'Eagles',
    libelle: 'Nouveaux participants',
    etat_avant: 'actif',
    motif: '[texte masqué par EJP Tech]',
    saisi_le: '2026-10-02T12:15:00+02:00',
  },
]
