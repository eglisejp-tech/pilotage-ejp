// Modèle de « Mes indicateurs » (lot L4 ; configuration-indicateurs.md, 7.3) : ce que la base rend
// au ministère connecté devient la phrase, les sections par rythme, les retirés avec le motif d'un
// refus et les suggestions encore possibles. Tout se construit ici ; les composants n'écrivent
// aucune règle. Les jours d'attente viennent de la base (heure de Paris) ; la valeur d'un
// indicateur n'est jamais lue ici, seulement la date de sa dernière saisie.

import type { IndicateurDuMinistere, RefusRecu } from '@/data/validationIndicateurs'
import {
  debutRefus,
  explicationLimiteAjouts,
  explicationLimiteLignes,
  MENTIONS_ORIGINE,
  phraseMesIndicateurs,
  rythmeEnPhrase,
  SUITE_EN_ATTENTE,
  TEXTES_MES_INDICATEURS,
  texteDerniereSaisie,
  texteEnAttente,
  texteRetrait,
} from '@/features/mes-indicateurs/textes'
import type { LigneVue, LimitesIndicateurs, NatureIndicateur } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import { libelleRythme, RYTHMES, trierIndicateurs } from '@/lib/metier/indicateurs'
import { comparerNoms } from '@/lib/metier/texte'

/** Ce que la base rend au ministère pour l'écran. */
export interface LecturesMesIndicateurs {
  /** Nom du ministère : « Communication ». */
  nomMinistere: string
  indicateurs: readonly IndicateurDuMinistere[]
  /** `v_indicateur_suivi` : les jours d'attente et la date de la dernière saisie. */
  suivi: readonly LigneVue<'v_indicateur_suivi'>[]
  refus: readonly RefusRecu[]
  suggestions: readonly LigneVue<'v_suggestions'>[]
  /** `limites_indicateurs` ; null si la base ne rend aucune ligne. */
  limites: LimitesIndicateurs | null
}

/** Une ligne d'un indicateur suivi (actif ou à valider). */
export interface LigneMonIndicateur {
  id: string
  libelle: string
  definition: string
  /** Un calcul ne se saisit pas : « Se calcule tout seul ». */
  calcul: boolean
  enAttente: boolean
  /** « Prévu par la coordination », « Suggestion ajoutée par vous le 12 oct. »... */
  origine: string
  /** « À valider par EJP Tech depuis 2 jours. » ; sinon null. */
  attente: string | null
  /** « Vous pouvez déjà le saisir. », dite sous l'attente ; sinon null. */
  attenteSuite: string | null
  /** « Dernière saisie le 2 oct. », « Jamais saisi » ; null pour un calcul. */
  usage: string | null
}

export interface SectionMesIndicateurs {
  /** Le rythme de la section, ou `calculs`. */
  cle: NatureIndicateur | 'calculs'
  titre: string
  lignes: LigneMonIndicateur[]
}

/** Une ligne de « Retirés » : le libellé, le rythme, la date et le motif du retrait. */
export interface LigneMonRetire {
  id: string
  libelle: string
  rythme: string
  /** « Retiré le 3 oct. : doublon. » ou « Refusé le 8 oct. ». */
  detail: string
  /** Le motif d'un refus écrit par EJP Tech, en citation ; null pour un autre retrait. */
  motifRefus: string | null
}

/** Une suggestion que la fiche peut encore recevoir. */
export interface SuggestionProposee {
  code: string
  libelle: string
  definition: string
  nature: NatureIndicateur
  /** « chaque mois » : le rythme dans une phrase. */
  rythme: string
}

/** Pourquoi le panneau n'ouvre pas le choix : la limite atteinte et la phrase qui l'explique. */
export interface LimiteAtteinte {
  genre: 'ajouts' | 'lignes'
  message: string
}

export interface DonneesMesIndicateurs {
  nomMinistere: string
  /** « Communication suit 7 indicateurs : ... », ou null quand rien n'est suivi. */
  phrase: string | null
  /** Rien n'est suivi : l'état vide parle à la place de la phrase et des sections. */
  vide: boolean
  sections: SectionMesIndicateurs[]
  retires: LigneMonRetire[]
  suggestions: SuggestionProposee[]
  /** Une limite empêche d'ajouter ; le panneau ne montre alors que l'explication. */
  limite: LimiteAtteinte | null
}

/**
 * Préfixe des codes de suggestions du catalogue (`modele = 'suggestion'`, migration
 * 20261009100000). Convention gardée de deux côtés : le test pgTAP `indicateurs-vague-1` fixe la
 * liste des 11 codes de ce modèle, et `mesIndicateurs.test.ts` vérifie ce préfixe sur les
 * suggestions des aperçus. Une suggestion ajoutée plus tard par migration doit le suivre, ou
 * ces deux tests le disent.
 */
export const PREFIXE_SUGGESTION = 'suggestion_'

function estSuggestion(indicateur: Pick<IndicateurDuMinistere, 'modele_code'>): boolean {
  return indicateur.modele_code?.startsWith(PREFIXE_SUGGESTION) === true
}

/** Un prévu de la coordination : créé par l'église depuis un modèle de ministère, pas une suggestion. */
function estPrevu(indicateur: Pick<IndicateurDuMinistere, 'origine' | 'modele_code'>): boolean {
  return (
    indicateur.origine === 'eglise' && indicateur.modele_code !== null && !estSuggestion(indicateur)
  )
}

/** Jour de Paris d'un instant, écrit « 12 oct. ». */
function jour(instant: string): string {
  return formaterJourCourt(jourDeParis(instant))
}

function mentionOrigine(indicateur: IndicateurDuMinistere): string {
  if (indicateur.origine === 'ministere') {
    return estSuggestion(indicateur)
      ? MENTIONS_ORIGINE.suggestionMinistere(jour(indicateur.cree_le))
      : MENTIONS_ORIGINE.ajoutMinistere(jour(indicateur.cree_le))
  }
  if (estPrevu(indicateur)) return MENTIONS_ORIGINE.prevu
  if (estSuggestion(indicateur)) return MENTIONS_ORIGINE.suggestionEglise
  return MENTIONS_ORIGINE.ajoutEglise
}

function construireLigne(
  indicateur: IndicateurDuMinistere,
  suivi: ReadonlyMap<string, LigneVue<'v_indicateur_suivi'>>,
): LigneMonIndicateur {
  const lu = suivi.get(indicateur.id)
  const enAttente = indicateur.etat === 'en_attente'
  const calcul = indicateur.calcul !== null
  let usage: string | null = null
  if (!calcul && lu !== undefined) {
    usage =
      lu.derniere_saisie_le === null
        ? TEXTES_MES_INDICATEURS.jamaisSaisi
        : texteDerniereSaisie(jour(lu.derniere_saisie_le))
  }
  return {
    id: indicateur.id,
    libelle: indicateur.libelle,
    definition: indicateur.definition,
    calcul,
    enAttente,
    origine: mentionOrigine(indicateur),
    attente: enAttente ? texteEnAttente(lu?.attente_jours ?? null) : null,
    attenteSuite: enAttente ? SUITE_EN_ATTENTE : null,
    usage,
  }
}

/** Sections des indicateurs suivis : les trois rythmes dans l'ordre de la fiche, puis les calculs. */
function construireSections(
  suivis: readonly IndicateurDuMinistere[],
  suivi: ReadonlyMap<string, LigneVue<'v_indicateur_suivi'>>,
): SectionMesIndicateurs[] {
  const saisis = trierIndicateurs(suivis.filter((indicateur) => indicateur.calcul === null))
  const sections: SectionMesIndicateurs[] = RYTHMES.flatMap((nature) => {
    const lignes = saisis
      .filter((indicateur) => indicateur.nature === nature)
      .map((indicateur) => construireLigne(indicateur, suivi))
    return lignes.length === 0 ? [] : [{ cle: nature, titre: libelleRythme(nature), lignes }]
  })
  const calculs = suivis
    .filter((indicateur) => indicateur.calcul !== null)
    .toSorted((a, b) => comparerNoms(a.libelle, b.libelle))
    .map((indicateur) => construireLigne(indicateur, suivi))
  if (calculs.length > 0) {
    sections.push({ cle: 'calculs', titre: TEXTES_MES_INDICATEURS.titreCalculs, lignes: calculs })
  }
  return sections
}

/**
 * Indicateurs retirés, du plus récemment retiré au plus ancien. Un retiré pour confidentialité n'y
 * figure pas (son libellé est masqué). Un refus dit le jour de la décision d'EJP Tech et son motif.
 */
function construireRetires(
  indicateurs: readonly IndicateurDuMinistere[],
  refus: readonly RefusRecu[],
): LigneMonRetire[] {
  const refusParIndicateur = new Map(refus.map((ligne) => [ligne.indicateur_id, ligne]))
  return indicateurs
    .filter(
      (indicateur) =>
        indicateur.etat === 'retire' && indicateur.retrait_motif !== 'confidentialite',
    )
    .toSorted((a, b) => (b.retire_le ?? '').localeCompare(a.retire_le ?? ''))
    .map((indicateur) => {
      const decision = refusParIndicateur.get(indicateur.id)
      const refuse = indicateur.retrait_motif === 'refuse'
      const instant = decision?.saisi_le ?? indicateur.retire_le
      return {
        id: indicateur.id,
        libelle: indicateur.libelle,
        rythme: libelleRythme(indicateur.nature),
        detail: refuse
          ? debutRefus(instant === null ? null : jour(instant))
          : texteRetrait(
              indicateur.retire_le === null ? null : jour(indicateur.retire_le),
              indicateur.retrait_motif,
            ),
        motifRefus: refuse ? (decision?.motif ?? null) : null,
      }
    })
}

/** La limite qui empêche d'ajouter, la plus proche d'abord (les 3 ajouts, puis les 30 lignes). */
function construireLimite(limites: LimitesIndicateurs | null): LimiteAtteinte | null {
  if (limites === null) return null
  if (limites.ajouts >= limites.ajouts_max) {
    return { genre: 'ajouts', message: explicationLimiteAjouts(limites) }
  }
  if (limites.lignes >= limites.lignes_max) {
    return { genre: 'lignes', message: explicationLimiteLignes(limites) }
  }
  return null
}

/** Suggestions encore possibles, rangées par rythme puis par ordre alphabétique (comme la fiche). */
function construireSuggestions(
  suggestions: readonly LigneVue<'v_suggestions'>[],
): SuggestionProposee[] {
  return trierIndicateurs(suggestions).map((suggestion) => ({
    code: suggestion.code,
    libelle: suggestion.libelle,
    definition: suggestion.definition,
    nature: suggestion.nature,
    rythme: rythmeEnPhrase(suggestion.nature),
  }))
}

/** Construit l'écran « Mes indicateurs » à partir des lectures de la base. */
export function construireMesIndicateurs(lectures: LecturesMesIndicateurs): DonneesMesIndicateurs {
  const suivis = lectures.indicateurs.filter((indicateur) => indicateur.etat !== 'retire')
  const suivi = new Map(lectures.suivi.map((ligne) => [ligne.indicateur_id, ligne]))
  const ajoutesParVous = suivis.filter((indicateur) => indicateur.origine === 'ministere').length
  const prevus = suivis.filter(estPrevu).length
  const ajoutesParLEglise = suivis.filter(
    (indicateur) => indicateur.origine === 'eglise' && !estPrevu(indicateur),
  ).length
  const ajoutsRestants =
    lectures.limites === null
      ? null
      : Math.max(0, lectures.limites.ajouts_max - lectures.limites.ajouts)
  return {
    nomMinistere: lectures.nomMinistere,
    phrase: phraseMesIndicateurs({
      nom: lectures.nomMinistere,
      suivis: suivis.length,
      prevus,
      ajoutesParVous,
      ajoutesParLEglise,
      ajoutsRestants,
      ajoutsMax: lectures.limites?.ajouts_max ?? 0,
    }),
    vide: suivis.length === 0,
    sections: construireSections(suivis, suivi),
    retires: construireRetires(lectures.indicateurs, lectures.refus),
    suggestions: construireSuggestions(lectures.suggestions),
    limite: construireLimite(lectures.limites),
  }
}
