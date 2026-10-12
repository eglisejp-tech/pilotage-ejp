// Données d'exemple de l'aperçu de développement `/apercu/indicateurs` et des tests (lot L3a) :
// de quoi montrer tous les états des deux écrans sans base. Noms de ministères et indicateurs
// fictifs, aucune valeur d'indicateur (l'administration n'en lit jamais). Les lectures passent par
// les vraies fonctions de `construire.ts`.

import type {
  IndicateurConfiguration,
  LigneCatalogue,
  LigneJournalConfiguration,
  LigneUsage,
  MinistereConfiguration,
} from '@/data/indicateursConfiguration'
import type { LecturesConfiguration } from '@/features/indicateurs/configuration/construire'

export const ID_COMMUNICATION = '10000000-0000-4000-8000-000000000001'
export const ID_KUMI = '10000000-0000-4000-8000-000000000002'
export const ID_EAGLES = '10000000-0000-4000-8000-000000000003'
export const ID_JEUNESSE = '10000000-0000-4000-8000-000000000004'
export const ID_PROTOCOLE = '10000000-0000-4000-8000-000000000005'
export const ID_ANCIEN = '10000000-0000-4000-8000-000000000006'

const MINISTERES: MinistereConfiguration[] = [
  { id: ID_COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  { id: ID_KUMI, code: null, nom: 'Kumi', desactive_le: null },
  { id: ID_EAGLES, code: null, nom: 'Eagles', desactive_le: null },
  { id: ID_JEUNESSE, code: null, nom: 'Jeunesse', desactive_le: null },
  { id: ID_PROTOCOLE, code: null, nom: 'Protocole', desactive_le: null },
  { id: ID_ANCIEN, code: null, nom: 'Ancien ministère', desactive_le: '2026-09-01T10:00:00+00:00' },
]

function prevu(
  modele: string,
  code: string,
  libelle: string,
  nature: LigneCatalogue['nature'],
  ordre: number,
  options: Partial<Pick<LigneCatalogue, 'calcul' | 'unite' | 'sensible'>> = {},
): LigneCatalogue {
  return {
    code,
    modele,
    libelle,
    definition: `${libelle} : ce qu'on compte, dans l'exemple.`,
    nature,
    unite: options.unite ?? 'nombre',
    sensible: options.sensible ?? false,
    calcul: options.calcul ?? null,
    ordre,
  }
}

const CATALOGUE: LigneCatalogue[] = [
  prevu('communication', 'communication_publications', 'Publications', 'mois', 1),
  prevu('communication', 'communication_visuels', 'Visuels livrés', 'mois', 2),
  prevu('communication', 'communication_demandes', 'Demandes reçues', 'mois', 3),
  prevu('communication', 'communication_taux', 'Taux de demandes traitées', 'mois', 4, {
    calcul: 'taux',
  }),
  prevu('kumi', 'kumi_activites', 'Activités réalisées', 'mois', 1),
  prevu('kumi', 'kumi_participantes', 'Participantes aux rencontres', 'dimanche', 2),
  prevu('kumi', 'kumi_prises_en_charge', 'Prises en charge', 'mois', 3, { sensible: true }),
  prevu('kumi', 'kumi_inscrites', 'Inscrites à ce jour', 'a_ce_jour', 4),
  prevu('kumi', 'kumi_dons', 'Dons reçus', 'mois', 5, { unite: 'euros' }),
  prevu('kumi', 'kumi_taux_participation', 'Taux de participation', 'mois', 6, { calcul: 'taux' }),
  prevu('eagles', 'eagles_rencontres', 'Rencontres organisées', 'mois', 1),
  prevu('eagles', 'eagles_presents', 'Présents aux rencontres', 'dimanche', 2),
  prevu('film', 'film_tournages', 'Tournages réalisés', 'mois', 1),
  prevu('film', 'film_montages', 'Montages livrés', 'mois', 2),
  prevu('film', 'film_heures', 'Heures de rushes', 'mois', 3, { unite: 'jours' }),
  prevu('suggestion', 'suggestion_evenements_couverts', 'Événements couverts', 'mois', 90),
  prevu('suggestion', 'suggestion_projets_en_cours', 'Projets en cours', 'a_ce_jour', 91),
]

let compteur = 0

function indicateur(
  ministereId: string,
  libelle: string,
  options: Partial<IndicateurConfiguration> = {},
): IndicateurConfiguration {
  compteur += 1
  return {
    id: options.id ?? `20000000-0000-4000-8000-${String(compteur).padStart(12, '0')}`,
    libelle,
    definition: options.definition ?? `${libelle} : ce qu'on compte, dans l'exemple.`,
    nature: options.nature ?? 'mois',
    unite: options.unite ?? 'nombre',
    sensible: options.sensible ?? false,
    calcul: options.calcul ?? null,
    etat: options.etat ?? 'actif',
    origine: options.origine ?? 'eglise',
    ministere_id: ministereId,
    modele_code: options.modele_code ?? null,
    remplace_id: options.remplace_id ?? null,
    cree_le: options.cree_le ?? '2026-10-02T09:00:00+00:00',
    texte_le: options.texte_le ?? options.cree_le ?? '2026-10-02T09:00:00+00:00',
    retire_le: options.retire_le ?? null,
    retrait_motif: options.retrait_motif ?? null,
  }
}

function usage(
  indicateurId: string,
  ministereId: string,
  saisies: number,
  attendues: number,
  derniere: string | null,
  attenteJours: number | null = null,
): LigneUsage {
  return {
    indicateur_id: indicateurId,
    ministere_id: ministereId,
    nb_periodes_saisies: saisies,
    nb_periodes_attendues: attendues,
    derniere_saisie_le: derniere,
    jamais_saisi: derniere === null,
    attente_jours: attenteJours,
  }
}

/**
 * Lectures d'exemple : Communication (prévus créés, un ajout à valider depuis 9 jours, un retiré),
 * Eagles (tous les prévus créés, un peu saisi), Kumi (rien créé, 6 prévus à créer), Jeunesse (nom non
 * reconnu : à choisir, deux indicateurs ajoutés), Protocole (« Aucun prévu » enregistré), et un
 * ministère désactivé qui n'apparaît pas.
 */
export function lecturesExemple(): LecturesConfiguration {
  compteur = 0
  const publications = indicateur(ID_COMMUNICATION, 'Publications', {
    modele_code: 'communication_publications',
  })
  const visuels = indicateur(ID_COMMUNICATION, 'Visuels livrés', {
    modele_code: 'communication_visuels',
  })
  const demandes = indicateur(ID_COMMUNICATION, 'Demandes reçues', {
    modele_code: 'communication_demandes',
    nature: 'mois',
    texte_le: '2026-10-05T09:00:00+00:00',
  })
  const taux = indicateur(ID_COMMUNICATION, 'Taux de demandes traitées', {
    modele_code: 'communication_taux',
    calcul: 'taux',
  })
  const ajout = indicateur(ID_COMMUNICATION, 'Projets en cours', {
    modele_code: 'suggestion_projets_en_cours',
    nature: 'a_ce_jour',
    etat: 'en_attente',
    origine: 'ministere',
    cree_le: '2026-09-28T09:00:00+00:00',
  })
  const doublon = indicateur(ID_COMMUNICATION, 'Affiches distribuées', {
    etat: 'retire',
    retire_le: '2026-10-03T09:00:00+00:00',
    retrait_motif: 'doublon',
    nature: 'dimanche',
  })
  const refuse = indicateur(ID_COMMUNICATION, 'Événements couverts', {
    etat: 'retire',
    origine: 'ministere',
    retire_le: '2026-10-01T09:00:00+00:00',
    retrait_motif: 'refuse',
    modele_code: 'suggestion_evenements_couverts',
  })
  const rencontres = indicateur(ID_EAGLES, 'Rencontres organisées', {
    modele_code: 'eagles_rencontres',
  })
  const presents = indicateur(ID_EAGLES, 'Présents aux rencontres', {
    modele_code: 'eagles_presents',
    nature: 'dimanche',
  })
  const grand = indicateur(ID_JEUNESSE, 'Jeunes accompagnés', {
    nature: 'mois',
    unite: 'grand_nombre',
    origine: 'eglise',
  })
  const jours = indicateur(ID_JEUNESSE, 'Jours de camp', {
    nature: 'mois',
    unite: 'jours',
    origine: 'eglise',
  })
  const indicateurs = [
    publications,
    visuels,
    demandes,
    taux,
    ajout,
    doublon,
    refuse,
    rencontres,
    presents,
    grand,
    jours,
  ]
  const lignesUsage = [
    usage(publications.id, ID_COMMUNICATION, 4, 5, '2026-10-02T10:00:00+00:00'),
    usage(visuels.id, ID_COMMUNICATION, 1, 4, '2026-08-02T10:00:00+00:00'),
    usage(demandes.id, ID_COMMUNICATION, 0, 3, null),
    usage(ajout.id, ID_COMMUNICATION, 0, 0, null, 9),
    usage(rencontres.id, ID_EAGLES, 5, 5, '2026-10-02T10:00:00+00:00'),
    usage(presents.id, ID_EAGLES, 1, 4, '2026-09-20T10:00:00+00:00'),
    usage(grand.id, ID_JEUNESSE, 2, 2, '2026-10-01T10:00:00+00:00'),
    usage(jours.id, ID_JEUNESSE, 0, 1, null),
  ]
  const creations: LigneJournalConfiguration[] = [
    {
      ministere_id: ID_PROTOCOLE,
      le: '2026-10-01T09:00:00+00:00',
      action: 'indicateurs_prevus_crees',
      detail: { modele: 'aucun', nombre: 0 },
    },
    {
      ministere_id: ID_COMMUNICATION,
      le: '2026-10-02T09:00:00+00:00',
      action: 'indicateurs_prevus_crees',
      detail: { modele: 'communication', nombre: 4 },
    },
  ]
  const changements: LigneJournalConfiguration[] = [
    {
      ministere_id: ID_COMMUNICATION,
      le: '2026-10-05T09:00:00+00:00',
      action: 'indicateur_corrige',
      detail: null,
    },
    ...creations,
    {
      ministere_id: ID_EAGLES,
      le: '2026-10-02T08:00:00+00:00',
      action: 'indicateurs_prevus_crees',
      detail: { modele: 'eagles', nombre: 2 },
    },
  ]
  return {
    ministeres: MINISTERES,
    indicateurs,
    usage: lignesUsage,
    catalogue: CATALOGUE,
    creations,
    changements,
  }
}

/**
 * Lectures après « Créer » : les prévus manquants du modèle s'ajoutent à la fiche, comme la base
 * (tout ou rien, sans doublon), et la ligne de journal est écrite. Sert l'aperçu, qui n'a pas de
 * base. `modele` vaut « aucun » pour un ministère sans prévu.
 */
export function apresCreation(
  lectures: LecturesConfiguration,
  ministereId: string,
  modele: string,
  maintenant: string,
): { lectures: LecturesConfiguration; nombre: number } {
  const deja = new Set(
    lectures.indicateurs
      .filter((ligne) => ligne.ministere_id === ministereId)
      .flatMap((ligne) => (ligne.modele_code === null ? [] : [ligne.modele_code])),
  )
  const manquants = lectures.catalogue
    .filter((ligne) => ligne.modele === modele && !deja.has(ligne.code))
    .sort((a, b) => a.ordre - b.ordre)
  const nouveaux = manquants.map((ligne) =>
    indicateur(ministereId, ligne.libelle, {
      definition: ligne.definition,
      nature: ligne.nature,
      unite: ligne.unite,
      sensible: ligne.sensible,
      calcul: ligne.calcul,
      modele_code: ligne.code,
      cree_le: maintenant,
    }),
  )
  const ligneJournal: LigneJournalConfiguration = {
    ministere_id: ministereId,
    le: maintenant,
    action: 'indicateurs_prevus_crees',
    detail: { modele, nombre: nouveaux.length },
  }
  return {
    nombre: nouveaux.length,
    lectures: {
      ...lectures,
      indicateurs: [...lectures.indicateurs, ...nouveaux],
      creations: [ligneJournal, ...lectures.creations],
      changements: [ligneJournal, ...lectures.changements],
    },
  }
}
