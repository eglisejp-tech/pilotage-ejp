import type { MinistereListe } from '@/data/ministeres'
import { etatApresEnvoi, memeEtat } from '@/features/evenements/etatEvenement'
import type { EtatEnregistre } from '@/features/evenements/etatEvenement'
import type { EtatEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import type { CorrectionsEvenement } from '@/features/evenements/MiseAJourAvecCorrections'
import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauReunion } from '@/features/evenements/PanneauReunion'
import { MESSAGES_BASE } from '@/features/evenements/textes'
import type { MinistreAMentionner } from '@/features/evenements/ChoixMentions'

// Données d'exemple des aperçus d'événement et de réunion (/apercu/evenements) : jamais la base,
// jamais un nom de personne. « Aujourd'hui » est un jour fixe du jeu d'exemple (mardi 6 oct.
// 2026), pas la date du navigateur. Les envois simulent la base : une ligne identique est refusée
// avec son message, une date passée aussi, et `envoi=echec` simule une connexion perdue.

export const AUJOURDHUI_EXEMPLE = '2026-10-06'
export const MINISTERE_EXEMPLE = '10000000-0000-4000-8000-000000000001'

/** Ministères actifs autres que Communication, par ordre alphabétique. */
export const MINISTERES_EXEMPLE: MinistreAMentionner[] = [
  { id: '10000000-0000-4000-8000-000000000002', nom: 'Coordination' },
  { id: '10000000-0000-4000-8000-000000000003', nom: 'Coordo FIJ' },
  { id: '10000000-0000-4000-8000-000000000004', nom: 'EJP Formation' },
  { id: '10000000-0000-4000-8000-000000000005', nom: 'Intégration' },
  { id: '10000000-0000-4000-8000-000000000006', nom: 'Jeunesse' },
  { id: '10000000-0000-4000-8000-000000000007', nom: 'Prodiges Junior' },
  { id: '10000000-0000-4000-8000-000000000008', nom: 'Social' },
]

/** Tous les ministères, Communication compris, comme `lireMinisteres` les rend (T78). */
const MINISTERES_LISTE_EXEMPLE: MinistereListe[] = [
  { id: MINISTERE_EXEMPLE, code: null, nom: 'Communication', desactive_le: null },
  ...MINISTERES_EXEMPLE.map(({ id, nom }) => ({ id, code: null, nom, desactive_le: null })),
]

/** Les écrans de l'aperçu, choisis par `?ecran=` (ajout par défaut). */
export const ECRANS_APERCU = [
  'ajout',
  'sans-mention',
  'mise-a-jour',
  // T78 : un nom corrigé (« Ancien nom : ... »), un événement retiré, et le panneau d'EJP Tech.
  'nom-corrige',
  'a-confirmer',
  // Un événement passé, Terminé sans heure de début : le champ « Heure de début » paraît (T68).
  'termine',
  'retire',
  'consultation',
  'pas-porteur',
  'introuvable',
  'chargement',
  'probleme',
  'reunion',
  'reunion-modifier',
  // L'objet de la réunion déclarée a été masqué par EJP Tech (m136).
  'reunion-masquee',
  'reunion-probleme',
] as const

export type EcranApercu = (typeof ECRANS_APERCU)[number]

export function lireEcranApercu(valeur: string | null): EcranApercu {
  return ECRANS_APERCU.find((ecran) => ecran === valeur) ?? 'ajout'
}

/** Dernier état des événements à mettre à jour, heures en minutes depuis minuit (T68). */
const ACTUELS: Record<'mise-a-jour' | 'a-confirmer' | 'termine', EtatEvenement> = {
  'mise-a-jour': {
    date: '2026-10-10',
    statut: 'preparation',
    heurePrevue: 1140,
    heureDebut: null,
    aConfirmer: false,
  },
  'a-confirmer': {
    date: '2026-10-08',
    statut: 'attente_validation',
    heurePrevue: null,
    heureDebut: null,
    aConfirmer: true,
  },
  termine: {
    date: '2026-10-03',
    statut: 'termine',
    heurePrevue: 1140,
    heureDebut: null,
    aConfirmer: false,
  },
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

/**
 * Corrections du porteur (T78), envois simulés : un nom corrigé montre « Ancien nom : Soirée de
 * lounge, corrigé le 6 oct. » ; le retrait réussi appelle `surRetrait` (le panneau le dit).
 */
function correctionsExemple(
  echec: boolean,
  corrige: boolean,
  surRetrait: () => void,
): CorrectionsEvenement {
  return {
    titrePrecedent: corrige ? 'Soirée de lounge' : null,
    titreCorrigeLe: corrige ? AUJOURDHUI_EXEMPLE : null,
    porteurId: MINISTERE_EXEMPLE,
    mentionIds: ['10000000-0000-4000-8000-000000000002'],
    ministeres: MINISTERES_LISTE_EXEMPLE,
    corrigerNom: envoiSimule(echec),
    modifierMentions: envoiSimule(echec),
    retirer: async () => {
      await envoiSimule(echec)()
      surRetrait()
    },
  }
}

export function contenuEvenement(
  ecran: EcranApercu,
  echec: boolean,
  surRetrait: () => void = () => undefined,
): ContenuPanneauEvenement {
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
    case 'retire':
      return { etat: 'retire', le: '2026-10-05', aLInstant: false, mode: 'mise_a_jour' }
    case 'consultation':
      return {
        etat: 'consultation',
        evenementId: ecran,
        titre: 'Soirée de louange',
        titrePrecedent: 'Soirée de lounge',
        titreCorrigeLe: AUJOURDHUI_EXEMPLE,
        date: '2026-10-03',
        statut: 'valide',
        nomPorteur: 'Communication',
        mentions: ['Coordination'],
        retirer: async () => {
          await envoiSimule(echec)()
          surRetrait()
        },
      }
    case 'mise-a-jour':
    case 'nom-corrige':
    case 'a-confirmer':
    case 'termine': {
      const actuel = ACTUELS[ecran === 'nom-corrige' ? 'mise-a-jour' : ecran]
      let enregistre: EtatEnregistre = actuel
      return {
        etat: 'mise_a_jour',
        evenementId: ecran,
        aujourdhui: AUJOURDHUI_EXEMPLE,
        titre: ecran === 'termine' ? 'Soirée jeunesse' : 'Soirée de louange',
        mentions: ['Coordination'],
        corrections: correctionsExemple(echec, ecran === 'nom-corrige', surRetrait),
        actuel,
        envoyer: async (miseAJour) => {
          const apres = etatApresEnvoi(enregistre, miseAJour)
          await envoiSimule(echec, () => {
            if (miseAJour.date !== enregistre.date && miseAJour.date < AUJOURDHUI_EXEMPLE) {
              return MESSAGES_BASE.datePasseeMiseAJour
            }
            if (miseAJour.heure_debut !== null && miseAJour.statut !== 'termine') {
              return MESSAGES_BASE.heureDebutSansTermine
            }
            if (apres.heureDebut !== null && apres.date > AUJOURDHUI_EXEMPLE) {
              return MESSAGES_BASE.heureDebutAVenir
            }
            if (memeEtat(apres, enregistre)) return MESSAGES_BASE.ligneIdentique
            return null
          })()
          enregistre = apres
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
  const masquee = ecran === 'reunion-masquee'
  return {
    etat: 'formulaire',
    aujourdhui: AUJOURDHUI_EXEMPLE,
    prochaine:
      ecran === 'reunion-modifier' || masquee
        ? {
            date: '2026-10-12',
            heure: '20:00',
            // Un objet masqué s'ouvre vide (SaisieReunion), et le formulaire le dit.
            objet: masquee ? '' : 'Préparer la soirée de louange',
            decision: 'Choisir la salle',
          }
        : null,
    masques: { objet: masquee, decision: false },
    envoyer: envoiSimule(echec),
  }
}
