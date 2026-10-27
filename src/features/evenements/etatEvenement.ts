import type { MiseAJourEvenement } from '@/features/evenements/schemas'
import type { StatutEvenement } from '@/lib/base'
import { ajouterJours, joursEntre } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

// État d'un événement tel que la base le garde après une mise à jour (T37, T68). Fonctions pures :
// le formulaire s'en sert pour arrêter une ligne identique avant l'envoi (m134) et pour savoir si
// la relecture a rattrapé le dernier envoi. La règle est celle de `controler_evenement_etat` : une
// heure vide reprend celle du dernier état (l'heure de début seulement pour un Terminé), et une
// heure de début ne va qu'avec Terminé. Plages (T78, lot 2) : un dernier jour vide reprend la
// durée du dernier état, un dernier jour égal au premier ramène à un seul jour, une heure de fin
// vide reprend la dernière.

/** Date, statut et heures d'un événement (minutes depuis minuit, ou null). */
export interface EtatEnregistre {
  date: DateIso
  statut: StatutEvenement
  heurePrevue: number | null
  heureDebut: number | null
  /** Dernier jour d'un événement sur plusieurs jours (T78, lot 2) ; absent ou null : un jour. */
  dateFin?: DateIso | null
  /** Heure de fin (T78, lot 2), en minutes ; absente ou null : aucune. */
  heureFin?: number | null
}

/** Le dernier jour que la base garde pour `miseAJour`, sachant le dernier état `actuel`. */
function finApresEnvoi(actuel: EtatEnregistre, miseAJour: MiseAJourEvenement): DateIso | null {
  const envoyee = miseAJour.date_fin ?? null
  if (envoyee !== null) return envoyee === miseAJour.date ? null : envoyee
  const fin = actuel.dateFin ?? null
  return fin === null ? null : ajouterJours(miseAJour.date, joursEntre(actuel.date, fin))
}

/** Ce que la base enregistre pour `miseAJour`, sachant le dernier état `actuel`. */
export function etatApresEnvoi(
  actuel: EtatEnregistre,
  miseAJour: MiseAJourEvenement,
): EtatEnregistre {
  return {
    date: miseAJour.date,
    statut: miseAJour.statut,
    heurePrevue: miseAJour.heure_prevue ?? actuel.heurePrevue,
    heureDebut:
      miseAJour.statut === 'termine' ? (miseAJour.heure_debut ?? actuel.heureDebut) : null,
    dateFin: finApresEnvoi(actuel, miseAJour),
    heureFin: miseAJour.heure_fin ?? actuel.heureFin ?? null,
  }
}

/**
 * Même date, même statut, mêmes heures et même dernier jour : la base refuserait la ligne
 * (« Rien n'a changé »).
 */
export function memeEtat(a: EtatEnregistre, b: EtatEnregistre): boolean {
  return (
    a.date === b.date &&
    a.statut === b.statut &&
    a.heurePrevue === b.heurePrevue &&
    a.heureDebut === b.heureDebut &&
    (a.dateFin ?? null) === (b.dateFin ?? null) &&
    (a.heureFin ?? null) === (b.heureFin ?? null)
  )
}
