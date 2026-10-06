// Données d'exemple des aperçus du lot E3 (/apercu/saisies?ecran=...), sans base ni envoi. Elles
// suivent le jeu d'exemple (supabase/seed.sql, seed/40 et seed/44) : dimanche de référence le
// 27 sept. 2026, jour de Paris le mardi 29 sept. ; un sensible réparti entre « Malaise »,
// « Blessure » et « Autre ». Aucun nom de personne.

import type {
  CategorieDeSaisie,
  DetailDuTotal,
  IndicateurDeSaisie,
  MesureDeSaisie,
} from '@/features/saisie-chiffres/champs'
import type { SemaineDeSaisie } from '@/features/saisie-chiffres/choixPeriode'

/** Écrans du lot E3 que montre /apercu/saisies (`?ecran=`), la saisie du dimanche par défaut. */
export const ECRANS_APERCU_E3 = ['dimanche', 'mois'] as const
export type EcranApercuE3 = (typeof ECRANS_APERCU_E3)[number]

/** Écran demandé par `?ecran=` ; la saisie du dimanche sans paramètre ou pour un code inconnu. */
export function lireEcranApercuE3(valeur: string | null): EcranApercuE3 {
  return ECRANS_APERCU_E3.find((ecran) => ecran === valeur) ?? 'dimanche'
}

export const SEMAINE_EXEMPLE: SemaineDeSaisie = { aujourdhui: '2026-09-29', dimanche: '2026-09-27' }

/** Le dimanche 4 oct. à 10 h : le dimanche du jour n'est pas encore celui de référence. */
export const SEMAINE_DIMANCHE_MATIN: SemaineDeSaisie = {
  aujourdhui: '2026-10-04',
  dimanche: '2026-09-27',
}

function indicateur(
  partiel: Pick<IndicateurDeSaisie, 'id' | 'libelle' | 'definition' | 'nature'> &
    Partial<IndicateurDeSaisie>,
): IndicateurDeSaisie {
  return {
    code: null,
    unite: 'nombre',
    sensible: false,
    calcul: null,
    etat: 'actif',
    ministere_id: 'ministere-exemple',
    ordre: 10,
    saisi_dimanche_matin: false,
    modele_code: null,
    ...partiel,
  }
}

const COMMUNS: IndicateurDeSaisie[] = [
  indicateur({
    id: 'commun-service',
    code: 'service',
    libelle: 'STARs au service ce dimanche',
    definition:
      "Les STARs qui ont servi dans votre ministère ce dimanche. Si personne n'a servi, enregistrez 0.",
    nature: 'dimanche',
    ministere_id: null,
    ordre: 1,
  }),
  indicateur({
    id: 'commun-actifs',
    code: 'actifs',
    libelle: 'STARs actifs',
    definition: 'Comptez chaque STAR dans un seul ministère : son ministère principal.',
    nature: 'a_ce_jour',
    ministere_id: null,
    ordre: 2,
  }),
  indicateur({
    id: 'commun-en-fij',
    code: 'en_fij',
    libelle: 'Dont en FIJ',
    definition: 'Parmi ces STARs actifs, ceux qui participent à une FIJ.',
    nature: 'a_ce_jour',
    ministere_id: null,
    ordre: 3,
  }),
]

/** Communs et indicateurs propres du dimanche d'un ministère d'exemple. */
export const INDICATEURS_DIMANCHE: IndicateurDeSaisie[] = [
  ...COMMUNS,
  indicateur({
    id: 'propre-repetitions',
    libelle: 'Répétitions de la semaine',
    definition: 'Répétitions tenues du lundi au dimanche, culte compris.',
    nature: 'dimanche',
    ordre: 10,
  }),
  indicateur({
    id: 'propre-heure-fin',
    libelle: 'Heure de fin du culte',
    definition: 'Heure à laquelle le culte du dimanche se termine.',
    nature: 'dimanche',
    unite: 'heure',
    ordre: 11,
  }),
  indicateur({
    id: 'propre-nuit',
    libelle: 'Présents la nuit de prière',
    definition: 'Personnes présentes la nuit du samedi au dimanche. À saisir le dimanche matin.',
    nature: 'dimanche',
    saisi_dimanche_matin: true,
    ordre: 12,
  }),
  indicateur({
    id: 'propre-abonnes',
    libelle: 'Abonnés à ce jour',
    definition: 'Abonnés du compte du ministère le jour de la saisie.',
    nature: 'a_ce_jour',
    unite: 'grand_nombre',
    etat: 'en_attente',
    ordre: 13,
  }),
]

/** Saisies des dimanches : 9 au service le 20 sept. ; `correction` ajoute le 27 sept. */
export function mesuresDimancheExemple(correction: boolean): MesureDeSaisie[] {
  const mesures: MesureDeSaisie[] = [
    {
      indicateur_id: 'commun-service',
      periode: '2026-09-20',
      valeur: 9,
      saisi_le: '2026-09-20T11:05:00+00:00',
    },
  ]
  if (correction) {
    mesures.push(
      {
        indicateur_id: 'commun-service',
        periode: '2026-09-27',
        valeur: 10,
        saisi_le: '2026-09-27T10:41:00+00:00',
      },
      {
        indicateur_id: 'propre-repetitions',
        periode: '2026-09-27',
        valeur: 3,
        saisi_le: '2026-09-27T10:41:00+00:00',
      },
    )
  }
  return mesures
}

/** Dernières valeurs « à ce jour » : 14 actifs dont 11 en FIJ, saisis le 24 sept. */
export const MESURES_A_CE_JOUR: MesureDeSaisie[] = [
  {
    indicateur_id: 'commun-actifs',
    periode: '2026-09-24',
    valeur: 14,
    saisi_le: '2026-09-24T18:00:00+00:00',
  },
  {
    indicateur_id: 'commun-en-fij',
    periode: '2026-09-24',
    valeur: 11,
    saisi_le: '2026-09-24T18:00:00+00:00',
  },
  {
    indicateur_id: 'propre-abonnes',
    periode: '2026-09-01',
    valeur: 1250,
    saisi_le: '2026-09-01T17:30:00+00:00',
  },
]

const MODELE_SENSIBLE = 'social_beneficiaires_passages'

/** Indicateurs du mois d'un ministère d'exemple : un sensible, un ajout à valider, des euros. */
export function indicateursMoisExemple(avecCategories: boolean): IndicateurDeSaisie[] {
  return [
    indicateur({
      id: 'mois-passages',
      libelle: 'Bénéficiaires (passages)',
      definition: 'Passages de bénéficiaires accueillis par le ministère pendant le mois.',
      nature: 'mois',
      sensible: true,
      modele_code: avecCategories ? MODELE_SENSIBLE : 'social_sans_liste',
      ordre: 1,
    }),
    indicateur({
      id: 'mois-fonds',
      libelle: 'Fonds levés',
      definition: "Montant reçu pendant le mois pour les actions du ministère, à l'euro.",
      nature: 'mois',
      unite: 'euros',
      ordre: 2,
    }),
    indicateur({
      id: 'mois-ateliers',
      libelle: 'Ateliers organisés',
      definition: 'Ateliers tenus pendant le mois, en ligne ou sur place.',
      nature: 'mois',
      etat: 'en_attente',
      ordre: 3,
    }),
    indicateur({
      id: 'mois-delai',
      libelle: 'Délai moyen de réponse',
      definition: 'Jours entre une demande reçue et la première réponse, en moyenne sur le mois.',
      nature: 'mois',
      unite: 'jours',
      ordre: 4,
    }),
  ]
}

export const CATEGORIES_EXEMPLE: CategorieDeSaisie[] = [
  { prevu_code: MODELE_SENSIBLE, code: 'malaise', libelle: 'Malaise', ordre: 1, retiree_le: null },
  {
    prevu_code: MODELE_SENSIBLE,
    code: 'blessure',
    libelle: 'Blessure',
    ordre: 2,
    retiree_le: null,
  },
  { prevu_code: MODELE_SENSIBLE, code: 'autre', libelle: 'Autre', ordre: 3, retiree_le: null },
]

/** Mois en cours du jeu d'exemple (septembre 2026, P45) : un total de 7 déjà saisi. */
export const MOIS_EN_COURS_EXEMPLE = '2026-09'

/** Saisies de septembre 2026 (mois en cours), reprises par une correction. */
export const MESURES_MOIS_CORRECTION: MesureDeSaisie[] = [
  {
    indicateur_id: 'mois-passages',
    periode: '2026-09-01',
    valeur: 7,
    saisi_le: '2026-09-28T18:00:00+00:00',
  },
  {
    indicateur_id: 'mois-fonds',
    periode: '2026-09-01',
    valeur: 1250,
    saisi_le: '2026-09-28T18:00:00+00:00',
  },
]

export const PRECISION_EXEMPLE =
  'Plus de passages pendant la collecte de rentrée, tous orientés vers les bonnes permanences.'

/** Précision et répartition du total le plus récent (4, 3 et 0), ou une précision masquée. */
export function detailsExemple(masquee: boolean): DetailDuTotal[] {
  return [
    {
      indicateur_id: 'mois-passages',
      precision: masquee ? '[texte masqué par EJP Tech]' : PRECISION_EXEMPLE,
      repartition: { malaise: 4, blessure: 3, autre: 0 },
    },
  ]
}

/**
 * Envoi d'aperçu : réussit après un court délai, échoue comme une coupure (`coupure`), ou est
 * refusé par la base avec son message (`refus`, code P0001).
 */
export function envoiExemple(
  issue: 'reussite' | 'coupure' | 'refus',
  message = '',
): () => Promise<void> {
  return () =>
    new Promise((resoudre, rejeter) => {
      window.setTimeout(() => {
        if (issue === 'coupure') rejeter(new TypeError('Failed to fetch'))
        else if (issue === 'refus') rejeter({ code: 'P0001', message })
        else resoudre()
      }, 300)
    })
}
