import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauReunion } from '@/features/evenements/PanneauReunion'
import { MESSAGES_BASE } from '@/features/evenements/textes'
import type { MinistreAMentionner } from '@/features/evenements/ChoixMentions'

// Données d'exemple des aperçus d'événement et de réunion (/apercu/evenements) : jamais la base,
// jamais un nom de personne. « Aujourd'hui » est un jour fixe du jeu d'exemple (mardi 6 oct.
// 2026), pas la date du navigateur. Les envois simulent la base : une ligne identique est refusée
// avec son message, une date passée aussi, et `envoi=echec` simule une connexion perdue.

export const AUJOURDHUI_EXEMPLE = '2026-10-06'
export const MINISTERE_EXEMPLE = 'm-communication'

/** Ministères actifs autres que Communication, par ordre alphabétique. */
export const MINISTERES_EXEMPLE: MinistreAMentionner[] = [
  { id: 'm-coordination', nom: 'Coordination' },
  { id: 'm-fij', nom: 'Coordo FIJ' },
  { id: 'm-formation', nom: 'EJP Formation' },
  { id: 'm-integration', nom: 'Intégration' },
  { id: 'm-jeunesse', nom: 'Jeunesse' },
  { id: 'm-junior', nom: 'Prodiges Junior' },
  { id: 'm-social', nom: 'Social' },
]

/** Les écrans de l'aperçu, choisis par `?ecran=` (ajout par défaut). */
export const ECRANS_APERCU = [
  'ajout',
  'sans-mention',
  'mise-a-jour',
  'a-confirmer',
  'pas-porteur',
  'introuvable',
  'chargement',
  'probleme',
  'reunion',
  'reunion-modifier',
  'reunion-probleme',
] as const

export type EcranApercu = (typeof ECRANS_APERCU)[number]

export function lireEcranApercu(valeur: string | null): EcranApercu {
  return ECRANS_APERCU.find((ecran) => ecran === valeur) ?? 'ajout'
}

/** Erreur de la base telle que PostgREST la rend (code SQL et message). */
function refusDeLaBase(message: string) {
  return { code: 'P0001', message, details: null, hint: null }
}

/** Une seconde d'attente : « Envoi en cours » se voit. */
const attendre = () => new Promise<void>((fin) => setTimeout(fin, 400))

/**
 * Envoi simulé : `echec` imite une connexion perdue (aucun code SQL) ; sinon la règle de la
 * base (T37) sur une mise à jour, d'après l'état enregistré.
 */
function envoiSimule(echec: boolean, refus?: () => string | null) {
  return async () => {
    await attendre()
    if (echec) throw new TypeError('Failed to fetch')
    const message = refus?.()
    if (message) throw refusDeLaBase(message)
  }
}

export function contenuEvenement(ecran: EcranApercu, echec: boolean): ContenuPanneauEvenement {
  const reessayer = () => undefined
  switch (ecran) {
    case 'sans-mention':
      return {
        etat: 'ajout',
        aujourdhui: AUJOURDHUI_EXEMPLE,
        ministereId: MINISTERE_EXEMPLE,
        ministeres: [],
        envoyer: envoiSimule(echec),
      }
    case 'mise-a-jour':
    case 'a-confirmer': {
      const actuel =
        ecran === 'a-confirmer'
          ? { date: '2026-10-08', statut: 'attente_validation' as const, aConfirmer: true }
          : { date: '2026-10-10', statut: 'preparation' as const, aConfirmer: false }
      let enregistre: { date: string; statut: string } = actuel
      return {
        etat: 'mise_a_jour',
        evenementId: ecran,
        aujourdhui: AUJOURDHUI_EXEMPLE,
        titre: 'Soirée de louange',
        mentions: ['Coordination'],
        actuel,
        envoyer: async (miseAJour) => {
          await envoiSimule(echec, () => {
            if (miseAJour.date !== enregistre.date && miseAJour.date < AUJOURDHUI_EXEMPLE) {
              return MESSAGES_BASE.datePasseeMiseAJour
            }
            if (miseAJour.date === enregistre.date && miseAJour.statut === enregistre.statut) {
              return MESSAGES_BASE.ligneIdentique
            }
            return null
          })()
          enregistre = miseAJour
        },
      }
    }
    case 'pas-porteur':
      return { etat: 'pas_porteur', nomPorteur: 'Coordination' }
    case 'introuvable':
      return { etat: 'introuvable' }
    case 'chargement':
      return { etat: 'chargement', mode: 'mise_a_jour' }
    case 'probleme':
      return { etat: 'probleme', mode: 'ajout', reessayer }
    default:
      return {
        etat: 'ajout',
        aujourdhui: AUJOURDHUI_EXEMPLE,
        ministereId: MINISTERE_EXEMPLE,
        ministeres: MINISTERES_EXEMPLE,
        envoyer: async (evenement) =>
          envoiSimule(echec, () =>
            evenement.date < AUJOURDHUI_EXEMPLE ? MESSAGES_BASE.datePasseeAjout : null,
          )(),
      }
  }
}

export function contenuReunion(ecran: EcranApercu, echec: boolean): ContenuPanneauReunion {
  if (ecran === 'reunion-probleme') return { etat: 'probleme', reessayer: () => undefined }
  return {
    etat: 'formulaire',
    aujourdhui: AUJOURDHUI_EXEMPLE,
    prochaine:
      ecran === 'reunion-modifier'
        ? {
            date: '2026-10-12',
            heure: '20:00',
            objet: 'Préparer la soirée de louange',
            decision: 'Choisir la salle',
          }
        : null,
    envoyer: envoiSimule(echec),
  }
}
