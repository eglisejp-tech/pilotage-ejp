import type { LigneSignalement } from '@/data/signalements'

// Données d'exemple de l'aperçu des signalements (/apercu/signalements) : jamais la base, jamais
// un nom de personne. Les dates sont fixes (semaine du mardi 6 oct. 2026), jamais la date du
// navigateur ; `ouvert` et `clos_recent` sont écrits comme la base les rendrait. Les envois
// simulent la base : un texte avec « @ » ou 5 chiffres de suite est refusé avec son message,
// `envoi=echec` simule une connexion perdue.

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const INTEGRATION = '10000000-0000-4000-8000-000000000005'

/** Les vues de l'aperçu, choisies par `?vue=`. */
export const VUES_APERCU = [
  // Ministère : formulaire et « Vos derniers signalements ».
  'formulaire',
  'premier-usage',
  'liste-probleme',
  // EJP Tech : bloc « Signalements » sur /moderation.
  'bloc',
  'bloc-sans-ouvert',
  'bloc-vide',
  'bloc-chargement',
  'bloc-probleme',
] as const

export type VueApercu = (typeof VUES_APERCU)[number]

export function lireVueApercu(valeur: string | null, ejpTech: boolean): VueApercu {
  const vue = VUES_APERCU.find((possible) => possible === valeur)
  if (vue && vue.startsWith('bloc') === ejpTech) return vue
  return ejpTech ? 'bloc' : 'formulaire'
}

/** Un signalement ouvert de Communication (saisie d'un événement). */
const OUVERT_COMMUNICATION: LigneSignalement = {
  id: '43000000-0000-4000-8000-000000000001',
  ministere_id: COMMUNICATION,
  ministere_nom: 'Communication',
  ecran: 'saisie_evenement',
  texte: "Le formulaire refuse la date de notre soirée de louange, alors qu'elle est bien à venir.",
  saisi_le: '2026-10-02T18:40:00+02:00',
  suivi_id: null,
  commentaire: null,
  clos_le: null,
  ouvert: true,
  clos_recent: false,
}

/** Un signalement ouvert d'Intégration, plus récent. */
const OUVERT_INTEGRATION: LigneSignalement = {
  id: '43000000-0000-4000-8000-000000000003',
  ministere_id: INTEGRATION,
  ministere_nom: 'Intégration',
  ecran: 'saisie_session',
  texte: "La session de samedi n'apparaît pas dans la liste des sessions à saisir.",
  saisi_le: '2026-10-05T21:15:00+02:00',
  suivi_id: null,
  commentaire: null,
  clos_le: null,
  ouvert: true,
  clos_recent: false,
}

/** Un signalement clos de Communication, avec le commentaire d'EJP Tech. */
const CLOS_COMMUNICATION: LigneSignalement = {
  id: '43000000-0000-4000-8000-000000000002',
  ministere_id: COMMUNICATION,
  ministere_nom: 'Communication',
  ecran: 'saisie_dimanche',
  texte: 'Le bouton Envoyer reste grisé après la saisie des STARs au service.',
  saisi_le: '2026-09-27T13:10:00+02:00',
  suivi_id: '43000000-0000-4000-8000-000000000011',
  commentaire: 'Réglé avec le ministère : le champ attendait un nombre entier.',
  clos_le: '2026-09-29T10:00:00+02:00',
  ouvert: false,
  clos_recent: true,
}

/** « Vos derniers signalements » de Communication, du plus récent au plus ancien. */
export const MES_SIGNALEMENTS_EXEMPLE: LigneSignalement[] = [
  OUVERT_COMMUNICATION,
  CLOS_COMMUNICATION,
]

/** Bloc d'EJP Tech : ouverts et clos récents, du plus ancien au plus récent (ordre de la base). */
export function signalementsDuBloc(vue: VueApercu): LigneSignalement[] {
  if (vue === 'bloc-vide') return []
  if (vue === 'bloc-sans-ouvert') return [CLOS_COMMUNICATION]
  return [CLOS_COMMUNICATION, OUVERT_COMMUNICATION, OUVERT_INTEGRATION]
}

/** Clôture simulée : la ligne passe dans les clos, datée du mardi 6 oct. (jour de l'aperçu). */
export function clore(ligne: LigneSignalement, commentaire: string | null): LigneSignalement {
  return {
    ...ligne,
    suivi_id: '43000000-0000-4000-8000-000000000099',
    commentaire,
    clos_le: '2026-10-06T11:30:00+02:00',
    ouvert: false,
    clos_recent: true,
  }
}

/** Erreur de la base telle que PostgREST la rend (code SQL et message). */
export function refusDeLaBase(message: string) {
  return { code: 'P0001', message, details: null, hint: null }
}

/** Un texte que la base refuserait pour ses données personnelles (« @ », 5 chiffres de suite). */
export function refuseParLaBase(texte: string): boolean {
  return texte.includes('@') || /\d{5}/.test(texte.replace(/[\s.-]/g, ''))
}

/** Connexion perdue : une erreur sans code SQL. */
export const ECHEC_CONNEXION = new TypeError('Failed to fetch')

/** Une courte attente : « Envoi en cours » se voit. */
export const attendre = () => new Promise<void>((fin) => setTimeout(fin, 400))
