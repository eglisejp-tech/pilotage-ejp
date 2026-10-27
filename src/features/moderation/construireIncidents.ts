// Lignes de la liste « Incidents d'envoi » (T76, lot C ; conception erreurs-envoi, 8.3) : à partir
// de ce que la base rend (`incidents_recents`), deux phrases par incident, jamais une donnée de
// plus. Heures à l'heure de Paris.

import {
  GENRES_INCIDENT,
  ISSUES_INCIDENT,
  NAVIGATEURS_INCIDENT,
  OPERATIONS_LIBELLES,
  PROFILS_INCIDENT,
  SYSTEMES_INCIDENT,
  TEXTES_INCIDENTS,
} from '@/features/moderation/textesIncidents'
import type { LigneIncident } from '@/lib/base'
import { formaterHeure, formaterJourAbrege, heureDeParis, jourDeParis } from '@/lib/metier/dates'

export interface IncidentAffiche {
  reference: string
  /** « Lun. 26 oct., 12 h 37 : Coordination, Ajouter un événement. Pas de réponse, issue inconnue. » */
  titre: string
  /** « Safari 26, iOS. Version 3f2a1c9. Référence K7Q4MX. » */
  detail: string
}

/** Qui a envoyé : le ministère, « Ministère supprimé », ou le profil. */
function auteur(ligne: LigneIncident): string {
  if (ligne.ministere_id !== null) return ligne.ministere_nom ?? TEXTES_INCIDENTS.ministereSupprime
  return PROFILS_INCIDENT[ligne.profil]
}

/** « Réponse illisible (502) », « Refus inattendu (23505) » ; les autres genres seuls. */
function genre(ligne: LigneIncident): string {
  const libelle = GENRES_INCIDENT[ligne.genre]
  if (ligne.genre === 'reponse_illisible' && ligne.statut_http !== null) {
    return `${libelle} (${ligne.statut_http})`
  }
  if (ligne.genre === 'refus_inconnu' && ligne.code !== null) return `${libelle} (${ligne.code})`
  return libelle
}

/** Les deux phrases d'un incident. */
export function afficherIncident(ligne: LigneIncident): IncidentAffiche {
  const quand = `${formaterJourAbrege(jourDeParis(ligne.survenu_le))}, ${formaterHeure(heureDeParis(ligne.survenu_le))}`
  const operation = OPERATIONS_LIBELLES[ligne.operation] ?? OPERATIONS_LIBELLES.autre
  const issue = ligne.rattrape ? TEXTES_INCIDENTS.rattrape : ISSUES_INCIDENT[ligne.issue]
  const morceaux: string[] = []
  if (ligne.navigateur !== null) {
    const navigateur = NAVIGATEURS_INCIDENT[ligne.navigateur]
    const version = ligne.version_navigateur === null ? '' : ` ${ligne.version_navigateur}`
    const systeme = ligne.systeme === null ? '' : `, ${SYSTEMES_INCIDENT[ligne.systeme]}`
    morceaux.push(`${navigateur}${version}${systeme}.`)
  } else if (ligne.systeme !== null) {
    morceaux.push(`${SYSTEMES_INCIDENT[ligne.systeme]}.`)
  }
  morceaux.push(
    ligne.version === 'local'
      ? `${TEXTES_INCIDENTS.versionLocale}.`
      : `${TEXTES_INCIDENTS.version} ${ligne.version}.`,
  )
  morceaux.push(`${TEXTES_INCIDENTS.reference} ${ligne.reference}.`)
  return {
    reference: ligne.reference,
    titre: `${quand} : ${auteur(ligne)}, ${operation}. ${genre(ligne)}, ${issue}.`,
    detail: morceaux.join(' '),
  }
}
