// « Vos points » de l'accueil du ministère (maquette 07 ; BRIEF, section 9) : ses points ouverts
// et ceux qui le mentionnent, puis ses points traités depuis 7 jours. Même règle et même forme que
// les points de « Ma fiche » (lot E2) : chaque point s'affiche par `CartePointFiche`.

import type { PointsFiche } from '@/data/fiche'
import type { MinistereListe } from '@/data/ministeres'
import { JOURS_POINTS_TRAITES } from '@/features/fiche/construireFiche'
import type { PointFiche, TexteLibre } from '@/features/fiche/modeleFiche'
import { TEXTE_MASQUE, TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { formaterJourCourt, jourDeParis } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { joursDepuis } from '@/lib/metier/fraicheur'
import { estOuvert, echeanceDepassee, trierOuverts, trierTraites } from '@/lib/metier/points'

/** Ce que « Vos points » lit. */
export interface LecturesVosPoints {
  /** Ministère du compte. */
  ministereId: string
  /** Jour de Paris (`v_semaine.aujourdhui`). */
  aujourdhui: DateIso
  /** Points créés par le ministère ou qui le mentionnent (`lirePointsMinistere`). */
  points: PointsFiche
  /** Noms des ministères (créateurs et mentionnés). */
  ministeres: readonly MinistereListe[]
}

function texteLibre(texte: string | null): TexteLibre | null {
  return texte === null || texte.trim() === '' ? null : { texte, masque: texte === TEXTE_MASQUE }
}

/**
 * Points ouverts du ministère et ceux qui le mentionnent (priorité, puis échéance, puis création),
 * puis ceux traités depuis 7 jours au plus, du plus récent au plus ancien. Un point mentionné porte
 * « Mentionné par Intégration. » ; un point traité, « Traité le 30 sept. » et le commentaire.
 */
export function construireVosPoints({
  ministereId,
  aujourdhui,
  points: lectures,
  ministeres,
}: LecturesVosPoints): PointFiche[] {
  const noms = new Map(
    ministeres.map((m) => [m.id, m.desactive_le === null ? m.nom : `${m.nom} (désactivé)`]),
  )
  const nom = (id: string) => noms.get(id) ?? 'Ministère inconnu'
  const { points, mentions } = lectures
  const traites = trierTraites(points).filter((point) => {
    const jours = joursDepuis(point.traite_le, aujourdhui)
    return jours !== null && jours <= JOURS_POINTS_TRAITES
  })
  return [...trierOuverts(points), ...traites].map((point): PointFiche => {
    const ouvert = estOuvert(point)
    return {
      id: point.id,
      statut: point.statut,
      ministereId: point.ministere_id,
      mentionIds: mentions
        .filter((mention) => mention.point_id === point.id)
        .map((mention) => mention.ministere_id),
      priorite: point.priorite,
      ministere: nom(point.ministere_id),
      echeance:
        ouvert && point.echeance !== null
          ? {
              texte: `avant le ${formaterJourCourt(point.echeance)}`,
              depassee: echeanceDepassee(point.echeance, aujourdhui),
            }
          : null,
      titre: texteLibre(point.titre) ?? { texte: point.titre, masque: false },
      description: texteLibre(point.description),
      attendu: texteLibre(point.action_attendue),
      mentions: mentions
        .filter((mention) => mention.point_id === point.id)
        .map((mention) => nom(mention.ministere_id)),
      mentionnePar: point.ministere_id === ministereId ? null : nom(point.ministere_id),
      traite:
        point.traite_le === null
          ? null
          : {
              texte: TEXTES_FICHE.points.traiteLe(formaterJourCourt(jourDeParis(point.traite_le))),
              commentaire: texteLibre(point.traite_commentaire),
            },
    }
  })
}
