import type { AuteurTraitement } from '@/data/pointsListe'
import type { MinistereListe } from '@/data/ministeres'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import type { TexteLibre } from '@/features/cette-semaine/types'
import type { DonneesPoints, LignePoint, OptionMinistere } from '@/features/points/modelePoints'
import { TEXTES_POINTS } from '@/features/points/textesPoints'
import type { ProfilPoints } from '@/features/points/textesPoints'
import type { LigneVue } from '@/lib/base'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import {
  estOuvert,
  libelleEcheance,
  LIBELLE_STATUT,
  trierOuverts,
  trierTous,
  trierTraites,
} from '@/lib/metier/points'

/** « Traités récemment » : les 5 derniers traités (BRIEF, section 9). */
export const NOMBRE_TRAITES_RECENTS = 5

/** Ce que l'écran lit de la base (ou de l'aperçu). */
export interface LecturesPoints {
  /** Jour de Paris (`v_semaine.aujourdhui`) : jamais la date du navigateur. */
  aujourdhui: DateIso
  points: LigneVue<'v_point'>[]
  mentions: LigneVue<'v_point_mention'>[]
  auteurs: AuteurTraitement[]
  ministeres: MinistereListe[]
}

const MINISTERE_INCONNU = 'Ministère inconnu'

function texteLibre(texte: string): TexteLibre {
  return { texte, masque: texte === TEXTE_MASQUE }
}

function texteLibreOuNull(texte: string | null): TexteLibre | null {
  return texte === null || texte === '' ? null : texteLibre(texte)
}

function nomDe(ministere: MinistereListe): string {
  return ministere.desactive_le === null ? ministere.nom : `${ministere.nom} (désactivé)`
}

/**
 * Choix du filtre « Tous les ministères » : les ministères actifs, plus un ministère désactivé
 * seulement s'il a créé un point ou y est mentionné (le berger lit encore ces points), par ordre
 * alphabétique.
 */
function optionsMinisteres(lectures: LecturesPoints): OptionMinistere[] {
  const concernes = new Set<string>([
    ...lectures.points.map((point) => point.ministere_id),
    ...lectures.mentions.map((mention) => mention.ministere_id),
  ])
  return lectures.ministeres
    .filter((ministere) => ministere.desactive_le === null || concernes.has(ministere.id))
    .map((ministere) => ({ id: ministere.id, nom: nomDe(ministere) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

/**
 * Construit l'écran 05 (BRIEF, section 9) : les points ouverts (priorité, puis échéance, puis
 * création), les points traités (du plus récent au plus ancien) et les 5 derniers traités.
 * `ministereDemande` (paramètre `ministere` de l'adresse) ne garde que les points créés par ce
 * ministère ou qui le mentionnent ; un identifiant inconnu vaut « Tous les ministères », comme
 * pour un compte de ministère, dont la base ne laisse lire que ses points.
 */
export function construirePoints(
  lectures: LecturesPoints,
  profil: ProfilPoints,
  ministereDemande: string | null,
): DonneesPoints {
  const noms = new Map(lectures.ministeres.map((ministere) => [ministere.id, nomDe(ministere)]))
  const nom = (id: string) => noms.get(id) ?? MINISTERE_INCONNU
  const comptes = new Map(lectures.auteurs.map((auteur) => [auteur.user_id, auteur]))
  const auteurDe = (id: string | null): string | null => {
    const compte = id === null ? undefined : comptes.get(id)
    if (compte === undefined) return null
    return compte.ministere_id === null ? compte.libelle : nom(compte.ministere_id)
  }
  const mentionsDe = new Map<string, string[]>()
  for (const mention of lectures.mentions) {
    const liste = mentionsDe.get(mention.point_id) ?? []
    liste.push(mention.ministere_id)
    mentionsDe.set(mention.point_id, liste)
  }

  const options = profil === 'ministere' ? null : optionsMinisteres(lectures)
  const choisi = options?.find((option) => option.id === ministereDemande) ?? null
  const retenus = lectures.points.filter(
    (point) =>
      choisi === null ||
      point.ministere_id === choisi.id ||
      (mentionsDe.get(point.id) ?? []).includes(choisi.id),
  )

  const ligne = (point: LigneVue<'v_point'>): LignePoint => {
    const ouvert = estOuvert(point)
    const echeance = ouvert ? libelleEcheance(point.echeance, lectures.aujourdhui) : null
    const idsMentions = mentionsDe.get(point.id) ?? []
    const titre = texteLibre(point.titre)
    let traite: LignePoint['traite'] = null
    if (!ouvert && point.traite_le !== null) {
      const auteur = auteurDe(point.traite_par)
      traite = {
        texte: TEXTES_POINTS.traiteLe(formaterJourCourt(jourDeParis(point.traite_le)), auteur),
        auteur,
        commentaire: texteLibreOuNull(point.traite_commentaire),
      }
    }
    return {
      id: point.id,
      priorite: point.priorite,
      ministere: nom(point.ministere_id),
      titre,
      description: texteLibreOuNull(point.description),
      attendu: texteLibreOuNull(point.action_attendue),
      // Ordre alphabétique : la base ne garantit pas l'ordre des mentions d'un point.
      mentions: idsMentions.map(nom).sort((a, b) => a.localeCompare(b, 'fr')),
      statut: point.statut,
      statutLibelle: LIBELLE_STATUT[point.statut],
      echeance,
      traite,
      actions: {
        id: point.id,
        titre,
        statut: point.statut,
        ministereId: point.ministere_id,
        mentions: idsMentions,
      },
    }
  }

  const traites = trierTraites(retenus).map(ligne)
  return {
    ministeres: options,
    ministereChoisi: choisi,
    ouverts: trierOuverts(retenus).map(ligne),
    traites,
    tous: trierTous(retenus).map(ligne),
    recents: traites.slice(0, NOMBRE_TRAITES_RECENTS),
  }
}
