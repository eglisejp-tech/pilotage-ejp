import type { LigneTexteARelire } from '@/data/moderation'
import type { IndicateursAValider } from '@/features/moderation/indicateurs'
import type { MinistereNom } from '@/features/moderation/construire'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import type { MotifMasquage } from '@/lib/base'

// Données d'exemple de l'aperçu de la modération (/apercu/moderation) : jamais la base, jamais un
// nom de personne. Les dates sont fixes (semaine du mardi 6 oct. 2026), jamais la date du
// navigateur ; les décisions simulées sont datées du mardi 6 oct. Les textes imitent ceux des
// ministères, sans donnée personnelle. Aucune ligne ne porte une valeur chiffrée.

/** Les vues de l'aperçu, choisies par `?vue=`. */
export const VUES_MODERATION = [
  'ecran',
  'sans-indicateur',
  'file-vide',
  'file-chargement',
  'file-probleme',
  'lien-long',
] as const

export type VueModeration = (typeof VUES_MODERATION)[number]

export function lireVueModeration(valeur: string | null): VueModeration {
  return VUES_MODERATION.find((vue) => vue === valeur) ?? 'ecran'
}

const SOCIAL = '20000000-0000-4000-8000-000000000001'
const JEUNESSE = '20000000-0000-4000-8000-000000000002'
const INTEGRATION = '20000000-0000-4000-8000-000000000003'
const COORDINATION = '20000000-0000-4000-8000-000000000004'
const COMMUNICATION = '20000000-0000-4000-8000-000000000005'

export const MINISTERES_EXEMPLE: MinistereNom[] = [
  { id: SOCIAL, nom: 'Social' },
  { id: JEUNESSE, nom: 'Jeunesse' },
  { id: INTEGRATION, nom: 'Intégration' },
  { id: COORDINATION, nom: 'Coordination' },
  { id: COMMUNICATION, nom: 'Communication' },
]

/** « 2 indicateurs attendent votre validation, le plus ancien depuis 4 jours. » */
export const INDICATEURS_EXEMPLE: IndicateursAValider = { nombre: 2, plusAncienJours: 4 }

const base = {
  decision_le: null,
  motif: null,
  indicateur_libelle: null,
  mois: null,
} as const

/** Une précision de chiffre sensible, à relire : le libellé et le mois, jamais le total. */
const PRECISION_SOCIAL: LigneTexteARelire = {
  ...base,
  cible: 'precision_sensible',
  cible_id: '44000000-0000-4000-8000-000000000001',
  ministere_id: SOCIAL,
  auteur_libelle: 'Ministère Social',
  ecrit_le: '2026-10-05T20:12:00+02:00',
  champs: { texte: "Plus de demandes que d'habitude ce mois-ci, surtout en fin de mois." },
  etat: 'a_relire',
  indicateur_libelle: 'Personnes accompagnées',
  mois: '2026-09-01',
}

/** Un point à trois champs, à relire. */
const POINT_COMMUNICATION: LigneTexteARelire = {
  ...base,
  cible: 'point_attention',
  cible_id: '44000000-0000-4000-8000-000000000002',
  ministere_id: COMMUNICATION,
  auteur_libelle: 'Ministère Communication',
  ecrit_le: '2026-10-06T09:10:00+02:00',
  champs: {
    titre: "Affiches de la soirée de louange à relire avant l'impression",
    description: 'Trois versions circulent, il faut garder la dernière.',
    action_attendue: 'Valider la version finale avant jeudi.',
  },
  etat: 'a_relire',
}

const EVENEMENT_JEUNESSE: LigneTexteARelire = {
  ...base,
  cible: 'evenement',
  cible_id: '44000000-0000-4000-8000-000000000003',
  ministere_id: JEUNESSE,
  auteur_libelle: 'Ministère Jeunesse',
  ecrit_le: '2026-09-29T18:20:00+02:00',
  champs: { titre: 'Sortie jeunesse au parc de Sceaux, départ 10 h.' },
  etat: 'a_relire',
}

const POINT_INTEGRATION: LigneTexteARelire = {
  ...base,
  cible: 'point_attention',
  cible_id: '44000000-0000-4000-8000-000000000004',
  ministere_id: INTEGRATION,
  auteur_libelle: 'Ministère Intégration',
  ecrit_le: '2026-09-29T18:03:00+02:00',
  champs: { titre: "Affiche et flyer de l'accueil du 15 octobre." },
  etat: 'a_relire',
}

/** Un point dont le seul champ est masqué : plus rien à faire. */
const POINT_MASQUE: LigneTexteARelire = {
  ...base,
  cible: 'point_attention',
  cible_id: '44000000-0000-4000-8000-000000000005',
  ministere_id: SOCIAL,
  auteur_libelle: 'Ministère Social',
  ecrit_le: '2026-09-29T21:40:00+02:00',
  champs: { titre: TEXTE_MASQUE },
  etat: 'masque',
  decision_le: '2026-09-30T09:00:00+02:00',
  motif: 'nom_personne',
}

/** Une réunion du berger dont l'objet est masqué ; la décision attendue reste à masquer. */
const REUNION_MASQUEE_EN_PARTIE: LigneTexteARelire = {
  ...base,
  cible: 'reunion',
  cible_id: '44000000-0000-4000-8000-000000000006',
  ministere_id: null,
  auteur_libelle: 'Berger',
  ecrit_le: '2026-09-28T22:30:00+02:00',
  champs: { objet: TEXTE_MASQUE, decision_attendue: 'Valider le calendrier du trimestre.' },
  etat: 'masque',
  decision_le: '2026-09-30T09:05:00+02:00',
  motif: 'situation_personnelle',
}

const POINT_RELU: LigneTexteARelire = {
  ...base,
  cible: 'point_attention',
  cible_id: '44000000-0000-4000-8000-000000000007',
  ministere_id: COORDINATION,
  auteur_libelle: 'Ministère Coordination',
  ecrit_le: '2026-09-28T22:10:00+02:00',
  champs: { titre: "Les dates d'octobre à décembre doivent être arrêtées avant la réunion." },
  etat: 'relu',
  decision_le: '2026-09-29T08:50:00+02:00',
}

/** Un lien collé de 90 caractères, sans espace : la page ne doit pas défiler en largeur. */
const LIEN_LONG = `https://exemple.test/${'a'.repeat(69)}`

/** La file d'une vue, dans l'ordre où la base la rend (la file la trie pour l'écran). */
export function lignesDeLaFile(vue: VueModeration): LigneTexteARelire[] {
  if (vue === 'file-vide') return []
  if (vue === 'lien-long') {
    return [
      { ...POINT_INTEGRATION, champs: { titre: LIEN_LONG, description: LIEN_LONG } },
      { ...PRECISION_SOCIAL, indicateur_libelle: LIEN_LONG },
    ]
  }
  return [
    POINT_RELU,
    REUNION_MASQUEE_EN_PARTIE,
    POINT_MASQUE,
    POINT_INTEGRATION,
    EVENEMENT_JEUNESSE,
    PRECISION_SOCIAL,
    POINT_COMMUNICATION,
  ]
}

const DECISION_SIMULEE = '2026-10-06T11:30:00+02:00'

/** « Rien à signaler » simulé : la ligne passe à « relu », datée du mardi 6 oct. */
export function relu(ligne: LigneTexteARelire): LigneTexteARelire {
  return { ...ligne, etat: 'relu', decision_le: DECISION_SIMULEE, motif: null }
}

/** Masquage simulé d'un champ, comme `masquer_texte` : la ligne passe à « masqué ». */
export function masque(
  ligne: LigneTexteARelire,
  champ: string,
  motif: MotifMasquage,
): LigneTexteARelire {
  return {
    ...ligne,
    champs: { ...ligne.champs, [champ]: TEXTE_MASQUE },
    etat: 'masque',
    decision_le: DECISION_SIMULEE,
    motif,
  }
}
