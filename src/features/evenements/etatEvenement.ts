import type { MiseAJourEvenement } from '@/features/evenements/schemas'
import type { StatutEvenement } from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'

// État d'un événement tel que la base le garde après une mise à jour (T37, T68). Fonctions pures :
// le formulaire s'en sert pour arrêter une ligne identique avant l'envoi (m134) et pour savoir si
// la relecture a rattrapé le dernier envoi. La règle est celle de `controler_evenement_etat` : une
// heure vide reprend celle du dernier état (l'heure de début seulement pour un Terminé), et une
// heure de début ne va qu'avec Terminé.

/** Date, statut et heures d'un événement (minutes depuis minuit, ou null). */
export interface EtatEnregistre {
  date: DateIso
  statut: StatutEvenement
  heurePrevue: number | null
  heureDebut: number | null
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
  }
}

/** Même date, même statut et mêmes heures : la base refuserait la ligne (« Rien n'a changé »). */
export function memeEtat(a: EtatEnregistre, b: EtatEnregistre): boolean {
  return (
    a.date === b.date &&
    a.statut === b.statut &&
    a.heurePrevue === b.heurePrevue &&
    a.heureDebut === b.heureDebut
  )
}
