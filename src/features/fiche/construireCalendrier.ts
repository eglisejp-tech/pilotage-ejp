// Construit le calendrier de la fiche (maquettes 04 et 12, lot E6) et la phrase de son bandeau
// d'alerte (T31) à partir des lectures de `src/data/evenements.ts`. Fonctions pures : le nombre de
// jours, le retard et « à l'heure » (T68) viennent de `v_evenement`, aucune date du navigateur.

import type { EvenementDuCalendrier, MentionEvenement } from '@/data/evenements'
import type { MinistereListe } from '@/data/ministeres'
import { libelleStatut } from '@/features/evenements/textes'
import type { TexteLibre } from '@/features/cette-semaine/types'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'
import { TEXTES_BANDEAU, TEXTES_CALENDRIER } from '@/features/fiche/textesCalendrier'
import type { StatutEvenement, TypeCompte } from '@/lib/base'
import { formaterJourAbrege } from '@/lib/metier/dates'
import {
  dansLeCalendrier,
  texteDesJours,
  texteDuDebut,
  tonDesJours,
  trierEvenements,
} from '@/lib/metier/evenements'
import { formaterHeureEnMinutes } from '@/lib/metier/unites'

/** Couleur d'un statut : un carré, toujours doublé du mot (BRIEF, section 9). Null : sans couleur. */
export type TonStatut = 'bien' | 'attention' | 'alerte'

const TON_DU_STATUT: Partial<Record<StatutEvenement, TonStatut>> = {
  valide: 'bien',
  attente_validation: 'attention',
  annule: 'alerte',
}

/** Une ligne du calendrier prévisionnel. */
export interface LigneCalendrier {
  id: string
  titre: TexteLibre
  /** « Sam. 3 oct. ». */
  jour: string
  /**
   * Heure prévue (T68), « 19 h » ou « 19 h 30 », écrite après le jour : « Sam. 3 oct., 19 h ».
   * Null sans heure prévue.
   */
  heure: string | null
  /** Le statut en mots : « En attente de validation ». */
  libelleStatut: string
  /**
   * Sous un Terminé qui a son heure de début (T68) : « Commencé à 19 h 12, 12 min de retard »,
   * « Commencé à 19 h 03, à l'heure », lus dans `retard` et `a_l_heure` de la vue. Sinon null.
   */
  debut: string | null
  /**
   * Terminé sans heure de début, daté au plus aujourd'hui, sur la fiche de son porteur : « Heure
   * de début à indiquer » (T68). Faux pour un autre lecteur.
   */
  heureDebutAIndiquer: boolean
  ton: TonStatut | null
  /** Un événement à confirmer : « dans 2 jours », « date passée depuis 3 jours ». */
  texteDate: { texte: string; ton: 'attention' | 'alerte' } | null
  aConfirmer: boolean
  /** L'événement est celui du ministère de la fiche (sinon, il le mentionne). */
  duMinistere: boolean
  /** « Reporté du sam. 3 oct. », sinon null. */
  report: string | null
  /** Noms des ministères mentionnés (« Coordination »), pour l'écriture « @Coordination ». */
  mentions: string[]
  /**
   * « Mentionné par Communication », pour un événement d'un autre ministère. Sur la fiche,
   * l'absence de bouton suffit : plus de « Seul Communication... » (T66, t218).
   */
  mentionnePar: string | null
  /** Adresse de « Mettre à jour » : le ministère porteur seul (sa propre fiche), sinon null. */
  versMiseAJour: string | null
  /**
   * Adresse de « Ouvrir » pour EJP Tech (T78) : le panneau de l'événement, en lecture, avec
   * « Retirer l'événement ». Null pour tout autre profil.
   */
  versConsultation: string | null
}

export interface LecturesCalendrier {
  evenements: readonly EvenementDuCalendrier[]
  /** Mentions en vigueur (`v_evenement_mention`, T78). */
  mentions: readonly MentionEvenement[]
  ministeres: readonly MinistereListe[]
}

function nomsDesMinisteres(ministeres: readonly MinistereListe[]): Map<string, string> {
  return new Map(
    ministeres.map((m) => [m.id, m.desactive_le === null ? m.nom : `${m.nom} (désactivé)`]),
  )
}

/**
 * Lignes du calendrier de la fiche du ministère `ministereId`, par date puis nom. Seul le
 * ministère porteur, sur sa propre fiche, reçoit l'adresse de « Mettre à jour » : un ministère
 * mentionné lit sans bouton, et EJP Tech, le berger et le conseil n'en ont aucun.
 */
export function construireCalendrier(
  lectures: LecturesCalendrier,
  contexte: { ministereId: string; profil: TypeCompte },
): LigneCalendrier[] {
  const noms = nomsDesMinisteres(lectures.ministeres)
  const nom = (id: string) => noms.get(id) ?? 'un autre ministère'
  const mentionsDe = (evenementId: string): string[] =>
    lectures.mentions
      .filter((mention) => mention.evenement_id === evenementId)
      .map((mention) => nom(mention.ministere_id))
  return trierEvenements(lectures.evenements.filter(dansLeCalendrier)).map(
    (evenement): LigneCalendrier => {
      const duMinistere = evenement.ministere_id === contexte.ministereId
      const peutMettreAJour = duMinistere && contexte.profil === 'ministere'
      return {
        id: evenement.id,
        titre: { texte: evenement.titre, masque: evenement.titre === TEXTE_MASQUE },
        jour: formaterJourAbrege(evenement.date),
        heure:
          evenement.heure_prevue === null ? null : formaterHeureEnMinutes(evenement.heure_prevue),
        libelleStatut: libelleStatut(evenement.statut),
        debut: evenement.statut === 'termine' ? texteDuDebut(evenement) : null,
        heureDebutAIndiquer:
          peutMettreAJour &&
          evenement.statut === 'termine' &&
          evenement.heure_debut === null &&
          evenement.jours <= 0,
        ton: TON_DU_STATUT[evenement.statut] ?? null,
        texteDate: evenement.a_confirmer
          ? { texte: texteDesJours(evenement.jours), ton: tonDesJours(evenement.jours) }
          : null,
        aConfirmer: evenement.a_confirmer,
        duMinistere,
        report: evenement.reporte_du
          ? TEXTES_CALENDRIER.reporteDu(formaterJourAbrege(evenement.reporte_du).toLowerCase())
          : null,
        mentions: duMinistere || contexte.profil !== 'ministere' ? mentionsDe(evenement.id) : [],
        mentionnePar: duMinistere
          ? null
          : TEXTES_CALENDRIER.mentionnePar(nom(evenement.ministere_id)),
        versMiseAJour: peutMettreAJour ? `/saisir/evenement/${evenement.id}` : null,
        versConsultation:
          contexte.profil === 'admin_plateforme' ? `/saisir/evenement/${evenement.id}` : null,
      }
    },
  )
}

/**
 * Phrases du bandeau d'alerte de la fiche (T31) : une par sorte d'événement à confirmer, sans
 * aucun titre. Liste vide : rien n'est à signaler, le bandeau disparaît (LISEZMOI, « États »).
 * Le ministère lit une phrase pour ses événements (il peut les mettre à jour) et une pour ceux qui
 * le mentionnent (il ne change pas leur statut) ; le berger, le conseil et EJP Tech, une seule.
 */
export function phrasesBandeau(lignes: readonly LigneCalendrier[], profil: TypeCompte): string[] {
  const aConfirmer = lignes.filter((ligne) => ligne.aConfirmer)
  if (profil !== 'ministere') {
    return aConfirmer.length === 0 ? [] : [TEXTES_BANDEAU.lecteur(aConfirmer.length)]
  }
  const propres = aConfirmer.filter((ligne) => ligne.duMinistere).length
  const mentionnes = aConfirmer.length - propres
  return [
    ...(propres > 0 ? [TEXTES_BANDEAU.porteur(propres)] : []),
    ...(mentionnes > 0 ? [TEXTES_BANDEAU.mentionne(mentionnes)] : []),
  ]
}
