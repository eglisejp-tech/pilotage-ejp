// Données des écrans `/indicateurs` et `/indicateurs/:id` (configuration-indicateurs.md, 7.1 et
// 7.2), prêtes à afficher : fonctions pures, sans appel à la base. Les lectures arrivent déjà
// faites (`src/data/indicateursConfiguration.ts`). Aucune valeur d'indicateur ici, jamais.

import type {
  IndicateurConfiguration,
  LigneCatalogue,
  LigneJournalConfiguration,
  LigneUsage,
  MinistereConfiguration,
} from '@/data/indicateursConfiguration'
import {
  modelesDuCatalogue,
  MODELE_SUGGESTION,
} from '@/features/indicateurs/configuration/catalogue'
import type { ModeleCatalogue } from '@/features/indicateurs/configuration/catalogue'
import { construireRetires, construireSections } from '@/features/indicateurs/configuration/lignes'
import type {
  LigneRetiree,
  SectionConfiguration,
} from '@/features/indicateurs/configuration/lignes'
import {
  ATTENTE_LONGUE_JOURS,
  phraseMinistere,
  phrasesEglise,
  texteIndicateursMinistere,
} from '@/features/indicateurs/configuration/phrases'
import { etatPrevus, ministeresSansPrevu } from '@/features/indicateurs/configuration/prevus'
import type { EtatPrevus } from '@/features/indicateurs/configuration/prevus'
import { estPeuSaisi } from '@/features/indicateurs/configuration/usage'
import type { TypeCompte } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { comparerNoms } from '@/lib/metier/texte'

/** Tout ce que lisent les deux écrans. */
export interface LecturesConfiguration {
  ministeres: readonly MinistereConfiguration[]
  indicateurs: readonly IndicateurConfiguration[]
  usage: readonly LigneUsage[]
  catalogue: readonly LigneCatalogue[]
  /** Lignes `indicateurs_prevus_crees` du journal (réponse « Aucun prévu » comprise). */
  creations: readonly LigneJournalConfiguration[]
  /** Gestes de configuration du journal, pour la colonne « Dernier changement ». */
  changements: readonly LigneJournalConfiguration[]
}

/** Une ligne du tableau de `/indicateurs`. */
export interface LigneMinistereConfiguration {
  id: string
  nom: string
  /** `/indicateurs/:id`. */
  href: string
  /** « 8 sur 30, dont 1 ajouté par Kumi ». */
  texteIndicateurs: string
  prevus: EtatPrevus
  /** Indicateurs peu saisis (usage), « 2 peu saisis ». */
  peuSaisis: number
  /** Indicateurs suivis (actifs ou à valider) : sans eux, la colonne « Saisie » n'a rien à dire. */
  suivis: number
  /** « 12 oct. », ou `null` : aucun geste de configuration encore. */
  dernierChangement: string | null
}

export interface ConfigurationIndicateurs {
  /** Phrases sous le titre. */
  phrases: string[]
  lignes: LigneMinistereConfiguration[]
}

function suivi(indicateur: Pick<IndicateurConfiguration, 'etat'>): boolean {
  return indicateur.etat !== 'retire'
}

/** Regroupe par ministère. */
function parMinistere<Ligne extends { ministere_id: string | null }>(
  lignes: readonly Ligne[],
): Map<string, Ligne[]> {
  const groupes = new Map<string, Ligne[]>()
  for (const ligne of lignes) {
    if (ligne.ministere_id === null) continue
    const groupe = groupes.get(ligne.ministere_id) ?? []
    groupe.push(ligne)
    groupes.set(ligne.ministere_id, groupe)
  }
  return groupes
}

/** Ministères actifs, rangés par ordre alphabétique français. */
function ministeresActifs(ministeres: readonly MinistereConfiguration[]): MinistereConfiguration[] {
  return ministeres
    .filter((ministere) => ministere.desactive_le === null)
    .sort((a, b) => comparerNoms(a.nom, b.nom))
}

/**
 * Écran `/indicateurs` : phrases, puis une ligne par ministère actif (indicateurs, prévus, saisie,
 * dernier changement : le geste de configuration le plus récent du journal).
 */
export function construireConfiguration(
  lectures: LecturesConfiguration,
  profil: TypeCompte,
): ConfigurationIndicateurs {
  const actifs = ministeresActifs(lectures.ministeres)
  const modeles = modelesDuCatalogue(lectures.catalogue)
  const sansPrevu = ministeresSansPrevu(lectures.creations)
  const indicateursParMinistere = parMinistere(lectures.indicateurs)
  const usageParId = new Map(lectures.usage.map((ligne) => [ligne.indicateur_id, ligne]))
  const changementParMinistere = new Map<string, string>()
  for (const ligne of lectures.changements) {
    const precedent = changementParMinistere.get(ligne.ministere_id)
    if (precedent === undefined || Date.parse(ligne.le) > Date.parse(precedent)) {
      changementParMinistere.set(ligne.ministere_id, ligne.le)
    }
  }
  const identifiantsActifs = new Set(actifs.map((ministere) => ministere.id))

  const lignes = actifs.map((ministere): LigneMinistereConfiguration => {
    const siens = indicateursParMinistere.get(ministere.id) ?? []
    const suivis = siens.filter(suivi)
    const ajouts = suivis.filter((indicateur) => indicateur.origine === 'ministere').length
    const dernier = changementParMinistere.get(ministere.id)
    return {
      id: ministere.id,
      nom: ministere.nom,
      href: `/indicateurs/${ministere.id}`,
      texteIndicateurs: texteIndicateursMinistere(ministere.nom, suivis.length, ajouts),
      prevus: etatPrevus(ministere.nom, siens, modeles, sansPrevu.has(ministere.id)),
      peuSaisis: suivis.filter((indicateur) => estPeuSaisi(usageParId.get(indicateur.id))).length,
      suivis: suivis.length,
      dernierChangement: dernier === undefined ? null : formaterJourCourt(jourDeParis(dernier)),
    }
  })

  // Comptes de l'église : les indicateurs des ministères actifs seulement (un ministère désactivé
  // garde ses indicateurs, qui ne comptent plus).
  const propres = lectures.indicateurs.filter(
    (indicateur) =>
      indicateur.ministere_id !== null && identifiantsActifs.has(indicateur.ministere_id),
  )
  const enAttente = propres.filter((indicateur) => indicateur.etat === 'en_attente')
  const phrases = phrasesEglise(
    {
      actifs: propres.filter((indicateur) => indicateur.etat === 'actif').length,
      ministeres: actifs.length,
      ajoutesParMinisteres: propres.filter(
        (indicateur) => indicateur.etat === 'actif' && indicateur.origine === 'ministere',
      ).length,
      enAttente: enAttente.length,
      enAttenteLongue: enAttente.filter(
        (indicateur) => (usageParId.get(indicateur.id)?.attente_jours ?? 0) > ATTENTE_LONGUE_JOURS,
      ).length,
    },
    profil,
  )
  return { phrases, lignes }
}

/** Données de `/indicateurs/:id`. */
export interface ConfigurationMinistere {
  id: string
  nom: string
  /** « Kumi suit 7 indicateurs sur 30 au plus : ... » ; `null` : aucun indicateur suivi. */
  phrase: string | null
  prevus: EtatPrevus
  /** Tous les modèles du catalogue : le choix de « Choisir dans la liste de la coordination ». */
  modeles: ModeleCatalogue[]
  sections: SectionConfiguration[]
  retires: LigneRetiree[]
  /** Aucun indicateur suivi : « Aucun indicateur pour Protocole. Il saisit les chiffres communs. » */
  sansIndicateur: boolean
}

/** Écran d'un ministère ; `null` si le ministère n'existe pas ou n'est plus actif. */
export function construireMinistere(
  ministereId: string,
  lectures: LecturesConfiguration,
): ConfigurationMinistere | null {
  const ministere = lectures.ministeres.find(
    (candidat) => candidat.id === ministereId && candidat.desactive_le === null,
  )
  if (ministere === undefined) return null
  const modeles = modelesDuCatalogue(lectures.catalogue)
  const siens = lectures.indicateurs.filter((indicateur) => indicateur.ministere_id === ministereId)
  const usage = new Map(lectures.usage.map((ligne) => [ligne.indicateur_id, ligne]))
  const codesPrevus = new Set(modeles.flatMap((modele) => modele.prevus.map((prevu) => prevu.code)))
  const suggestions = new Set(
    lectures.catalogue
      .filter((ligne) => ligne.modele === MODELE_SUGGESTION)
      .map((ligne) => ligne.code),
  )
  const suivis = siens.filter(suivi)
  const sontPrevus = (indicateur: IndicateurConfiguration) =>
    indicateur.modele_code !== null && codesPrevus.has(indicateur.modele_code)
  const prevus = suivis.filter(sontPrevus).length
  const parLeMinistere = suivis.filter(
    (indicateur) => !sontPrevus(indicateur) && indicateur.origine === 'ministere',
  ).length
  return {
    id: ministere.id,
    nom: ministere.nom,
    phrase: phraseMinistere({
      nom: ministere.nom,
      suivis: suivis.length,
      prevus,
      ajoutesParLeMinistere: parLeMinistere,
      ajoutesParLEglise: suivis.length - prevus - parLeMinistere,
    }),
    prevus: etatPrevus(
      ministere.nom,
      siens,
      modeles,
      ministeresSansPrevu(lectures.creations).has(ministere.id),
    ),
    modeles,
    sections: construireSections(siens, usage, ministere.nom, { suggestions }),
    retires: construireRetires(siens),
    sansIndicateur: suivis.length === 0,
  }
}
