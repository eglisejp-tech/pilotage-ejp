// Lignes d'un ministère sur `/indicateurs/:id` (configuration-indicateurs.md, 7.2) : sections par
// rythme (« Chaque dimanche », « Chaque mois », « À ce jour »), puis « Calculs », puis « Retirés ».
// Chaque ligne dit son libellé, sa définition, ses mentions et son usage, jamais une valeur. Tout
// est construit ici à partir de ce que la base rend ; les composants n'écrivent aucune règle.

import type { IndicateurConfiguration, LigneUsage } from '@/data/indicateursConfiguration'
import type { CalculIndicateur, MotifRetrait, NatureIndicateur, UniteIndicateur } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { libelleRythme, RYTHMES, trierIndicateurs } from '@/lib/metier/indicateurs'
import { comparerNoms, terminerPhrase } from '@/lib/metier/texte'
import { texteDepuisJours } from '@/features/indicateurs/configuration/phrases'
import { estPeuSaisi, texteUsage } from '@/features/indicateurs/configuration/usage'

/** Titre de la section des calculs. */
export const TITRE_CALCULS = 'Calculs'

/** Une ligne d'un indicateur actif ou à valider. */
export interface LigneConfiguration {
  id: string
  libelle: string
  definition: string
  nature: NatureIndicateur
  calcul: CalculIndicateur | null
  /** Ajout d'un ministère qui attend EJP Tech. */
  enAttente: boolean
  /** « grand compte », « en euros », « sensible », « ajouté par Kumi le 12 oct. »... */
  mentions: string[]
  /** « à valider par EJP Tech depuis 2 jours », avec le lien « Voir dans À valider » ; sinon null. */
  aValider: string | null
  /** « Saisi 4 mois sur 5, dernier le 2 oct. » ; null pour un calcul. */
  usage: string | null
  peuSaisi: boolean
}

export interface SectionConfiguration {
  /** Le rythme de la section, ou `calculs`. */
  cle: NatureIndicateur | 'calculs'
  titre: string
  lignes: LigneConfiguration[]
}

/** Une ligne de « Retirés » : le libellé, le rythme et la date et le motif du retrait. */
export interface LigneRetiree {
  id: string
  libelle: string
  /** « Chaque dimanche ». */
  rythme: string
  /** « Retiré le 3 nov. : doublon », « Refusé le 8 oct. ». */
  detail: string
}

const MOTIFS: Readonly<Record<MotifRetrait, string>> = {
  plus_suivi: "n'est plus suivi",
  doublon: 'doublon',
  erreur: 'créé par erreur',
  se_calcule: 'se calcule',
  deja_commun: 'existe déjà en chiffre commun',
  domaine_sensible: 'domaine sensible',
  hors_regles: 'hors des règles',
  remplace: 'remplacé',
  confidentialite: 'confidentialité',
  source_retiree: 'sa source est retirée',
  refuse: 'refusé',
}

const NOMS_CALCUL: Readonly<Record<CalculIndicateur, string>> = {
  taux: 'taux',
  moyenne: 'moyenne',
  difference: 'différence',
  somme: 'somme',
  evolution: 'évolution',
}

const MENTIONS_UNITE: Readonly<Partial<Record<UniteIndicateur, string>>> = {
  grand_nombre: 'grand compte',
  euros: 'en euros',
  heure: 'en heures',
  jours: 'en jours',
}

/** Jour de Paris d'un instant, écrit « 12 oct. ». */
function jour(instant: string): string {
  return formaterJourCourt(jourDeParis(instant))
}

/** Texte corrigé après sa création (au-delà de la seconde : même transaction, même horodatage). */
function aEteCorrige(indicateur: Pick<IndicateurConfiguration, 'cree_le' | 'texte_le'>): boolean {
  return new Date(indicateur.texte_le).getTime() - new Date(indicateur.cree_le).getTime() > 1000
}

/** Ce que la classification de la fiche doit savoir du catalogue. */
export interface CodesCatalogue {
  /** Codes des suggestions communes. */
  suggestions: ReadonlySet<string>
}

/** Mentions discrètes d'une ligne, dans l'ordre de lecture de 7.2. */
function mentionsDe(
  indicateur: IndicateurConfiguration,
  nomMinistere: string,
  catalogue: CodesCatalogue,
  libellesParId: ReadonlyMap<string, IndicateurConfiguration>,
): string[] {
  const mentions: string[] = []
  if (indicateur.calcul !== null) mentions.push(`calcul : ${NOMS_CALCUL[indicateur.calcul]}`)
  const unite = MENTIONS_UNITE[indicateur.unite]
  if (unite !== undefined) mentions.push(unite)
  if (indicateur.sensible) mentions.push('domaine sensible')
  if (indicateur.modele_code !== null && catalogue.suggestions.has(indicateur.modele_code)) {
    mentions.push('suggestion')
  }
  if (indicateur.origine === 'ministere') {
    mentions.push(`ajouté par ${nomMinistere} le ${jour(indicateur.cree_le)}`)
  }
  if (aEteCorrige(indicateur)) mentions.push(`libellé corrigé le ${jour(indicateur.texte_le)}`)
  const remplace =
    indicateur.remplace_id === null ? undefined : libellesParId.get(indicateur.remplace_id)
  if (remplace !== undefined) {
    mentions.push(
      `remplace « ${remplace.libelle} » (${libelleRythme(remplace.nature).toLowerCase()})`,
    )
  }
  return mentions
}

/**
 * Lignes des indicateurs suivis (actifs ou à valider), en sections : les trois rythmes dans
 * l'ordre de la fiche, puis les calculs. Chaque section est rangée par ordre alphabétique
 * français (R6) ; une section vide n'existe pas.
 */
export function construireSections(
  indicateurs: readonly IndicateurConfiguration[],
  usage: ReadonlyMap<string, LigneUsage>,
  nomMinistere: string,
  catalogue: CodesCatalogue,
): SectionConfiguration[] {
  const parId = new Map(indicateurs.map((indicateur) => [indicateur.id, indicateur]))
  const suivis = indicateurs.filter((indicateur) => indicateur.etat !== 'retire')
  const ligne = (indicateur: IndicateurConfiguration): LigneConfiguration => {
    const usageIndicateur = usage.get(indicateur.id)
    const enAttente = indicateur.etat === 'en_attente'
    return {
      id: indicateur.id,
      libelle: indicateur.libelle,
      definition: indicateur.definition,
      nature: indicateur.nature,
      calcul: indicateur.calcul,
      enAttente,
      mentions: mentionsDe(indicateur, nomMinistere, catalogue, parId),
      aValider: enAttente
        ? `à valider par EJP Tech${usageIndicateur?.attente_jours == null ? '' : ` ${texteDepuisJours(usageIndicateur.attente_jours)}`}`
        : null,
      usage: indicateur.calcul === null ? texteUsage(usageIndicateur, indicateur.nature) : null,
      peuSaisi: indicateur.calcul === null && estPeuSaisi(usageIndicateur),
    }
  }
  const saisis = trierIndicateurs(suivis.filter((indicateur) => indicateur.calcul === null))
  const sections: SectionConfiguration[] = RYTHMES.flatMap((nature) => {
    const lignes = saisis.filter((indicateur) => indicateur.nature === nature).map(ligne)
    return lignes.length === 0 ? [] : [{ cle: nature, titre: libelleRythme(nature), lignes }]
  })
  const calculs = suivis
    .filter((indicateur) => indicateur.calcul !== null)
    .sort((a, b) => comparerNoms(a.libelle, b.libelle))
    .map(ligne)
  if (calculs.length > 0) sections.push({ cle: 'calculs', titre: TITRE_CALCULS, lignes: calculs })
  return sections
}

/** Détail d'un retrait : « Retiré le 3 nov. : doublon », « Refusé le 8 oct. ». */
export function detailRetrait(
  indicateur: Pick<IndicateurConfiguration, 'retire_le' | 'retrait_motif'>,
): string {
  const quand = indicateur.retire_le === null ? '' : ` le ${jour(indicateur.retire_le)}`
  if (indicateur.retrait_motif === 'refuse') return terminerPhrase(`Refusé${quand}`)
  if (indicateur.retrait_motif === 'confidentialite') {
    return terminerPhrase(`Retiré pour confidentialité${quand}`)
  }
  const motif = indicateur.retrait_motif === null ? '' : ` : ${MOTIFS[indicateur.retrait_motif]}`
  return terminerPhrase(`Retiré${quand}${motif}`)
}

/** Indicateurs retirés, rangés comme la fiche (rythme, puis ordre alphabétique). */
export function construireRetires(indicateurs: readonly IndicateurConfiguration[]): LigneRetiree[] {
  return trierIndicateurs(indicateurs.filter((indicateur) => indicateur.etat === 'retire')).map(
    (indicateur) => ({
      id: indicateur.id,
      libelle: indicateur.libelle,
      rythme: libelleRythme(indicateur.nature),
      detail: detailRetrait(indicateur),
    }),
  )
}
