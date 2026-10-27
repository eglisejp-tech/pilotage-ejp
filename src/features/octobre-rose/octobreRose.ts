// Octobre rose (demande de la personne responsable, 27 octobre 2026) : un ruban rose à côté du
// nom de l'outil et un bandeau sous l'en-tête des écrans connectés, chaque année, pendant tout le
// mois d'octobre, à l'heure de Paris. Rien n'est collecté ni envoyé : aucun suivi de clic.

import { jourDeParis } from '@/lib/metier/dates'

export const TEXTES_OCTOBRE_ROSE = {
  /** Nom accessible du ruban et de la région du bandeau. */
  nom: 'Octobre rose',
  /** Texte exact demandé (sans « du sein », à la demande de la personne responsable). */
  message: 'le dépistage du cancer sauve des vies. Parlez-en autour de vous.',
  lien: 'En savoir plus',
  nouvelOnglet: '(nouvel onglet)',
  masquer: 'Masquer',
  masquerSuite: 'le bandeau Octobre rose',
} as const

/**
 * Page « Les dépistages » de l'Institut national du cancer (cancer.fr), tous les dépistages et
 * pas seulement celui du sein. Adresse vérifiée le 27 octobre 2026 (réponse 200).
 */
export const ADRESSE_DEPISTAGE =
  'https://www.cancer.fr/toute-l-information-sur-les-cancers/se-faire-depister/les-depistages'

/**
 * Vrai du 1er octobre à 0 h au 31 octobre à 23 h 59, heure de Paris, chaque année ; faux à
 * partir du 1er novembre à 0 h. Le mois se lit sur le jour de Paris de l'instant, jamais sur le
 * fuseau du navigateur (changement d'heure du dernier dimanche d'octobre compris).
 */
export function estOctobreRose(maintenant: Date): boolean {
  return jourDeParis(maintenant).slice(5, 7) === '10'
}

/** Année de Paris de l'instant (« 2026 ») : « Masquer » ne vaut que pour l'octobre de cette année. */
export function anneeDeParis(maintenant: Date): string {
  return jourDeParis(maintenant).slice(0, 4)
}
