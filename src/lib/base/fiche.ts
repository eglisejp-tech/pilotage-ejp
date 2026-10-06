// Types de la fiche d'un ministère (étape 4, lot E2) : vues de lecture propres à la fiche, dans le
// format de `communs.ts`. Écrits à la main d'après `docs/conception/contrat-etape-4.md` (section 6)
// et les migrations de B3 et B8 : la répartition et la précision d'un indicateur sensible
// (`v_ventilation_sensible`, `v_precision_sensible`, changement du 6 octobre) et le journal lisible
// (`v_journal`), dont la fiche lit les « Dernières saisies ». `v_commun_fiche` (B4) est dans
// `indicateurs.ts`, où le lot E1 l'a déclarée.
//
// Dates : `date` arrive en chaîne « 2026-09-01 », `timestamptz` en chaîne ISO. Une absence n'est
// jamais 0 : un « moins de 3 » ou une case masquée a `valeur` à null.

import type { Aucun, Vue } from './communs'

/**
 * Détail d'une ligne de journal : des codes, des nombres, des dates et des identifiants, jamais un
 * texte libre ni un email (BRIEF, section 6, « Journal »). Lu tel quel par la fiche.
 */
export type DetailJournal = { [cle: string]: unknown }

export type TablesFiche = Aucun

export type VuesFiche = {
  /**
   * Répartition du total le plus récent de chaque mois d'un indicateur sensible (B8, P47). Une
   * ligne par catégorie renseignée et une ligne « Non réparti » (`categorie` null, en dernier).
   * Un mois sans répartition n'a aucune ligne. Valeurs exactes pour le ministère ; « moins de 3 »,
   * masquage secondaire et masquage complet pour le berger, le conseil et EJP Tech ; rien pour
   * l'administration ni pour un autre ministère.
   */
  v_ventilation_sensible: Vue<{
    indicateur_id: string
    ministere_id: string
    /** 1er du mois. */
    periode: string
    /** Code de `categorie_sensible` ; null pour la ligne « Non réparti ». */
    categorie: string | null
    /** Libellé de la catégorie, ou « Non réparti ». */
    libelle: string
    ordre: number
    /** Null si « moins de 3 » ou masquée. */
    valeur: number | null
    moins_de_3: boolean
    /** Case cachée par le masquage secondaire : « masqué ». */
    masquee: boolean
    /** Vrai sur toutes les lignes d'un mois dont la répartition est masquée en entier. */
    tout_masque: boolean
  }>
  /**
   * Précision attachée au total le plus récent de chaque mois d'un indicateur sensible (B8, P46),
   * sans date d'envoi. « [texte masqué par EJP Tech] » si EJP Tech l'a masquée. Ministère auteur,
   * berger, conseil et EJP Tech ; rien pour l'administration ni pour un autre ministère.
   */
  v_precision_sensible: Vue<{
    indicateur_id: string
    ministere_id: string
    /** 1er du mois. */
    mois: string
    texte: string
  }>
  /**
   * Journal lisible par le compte (B3, B8) : les colonnes de `journal`, le libellé du compte
   * auteur, le ministère de l'auteur et le texte actuel de l'objet visé, lu sous la RLS du lecteur
   * (null s'il ne peut pas le lire).
   */
  v_journal: Vue<{
    id: number
    le: string
    compte: string | null
    ministere_id: string | null
    action: string
    cible: string | null
    cible_id: string | null
    detail: DetailJournal | null
    /** « Système » pour une ligne sans compte. */
    compte_libelle: string | null
    /** Ministère du compte auteur : les « Dernières saisies » d'une fiche filtrent sur lui. */
    auteur_ministere_id: string | null
    ministere_nom: string | null
    cible_texte: string | null
  }>
}

export type FonctionsFiche = Aucun
