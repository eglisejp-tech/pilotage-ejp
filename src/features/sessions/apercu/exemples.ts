import type { SessionDeclaree } from '@/data/sessionsAdmin'
import type { MinistereAChoisir } from '@/features/sessions/ChoixMinisteres'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import type { DateIso } from '@/lib/metier/dates'
import { formaterJourLong } from '@/lib/metier/dates'
import { nomSession } from '@/lib/metier/phrases'

// Données d'exemple de l'aperçu de l'écran 14 (/apercu/sessions) : jamais la base, jamais le nom
// d'une personne. Les dates sont fixes (mercredi 7 oct. 2026), jamais la date du navigateur. Les
// actions simulent les trois fonctions de la base, leurs refus compris.

/** Jour de Paris de l'aperçu. */
export const AUJOURDHUI_APERCU: DateIso = '2026-10-07'

export const VUES_APERCU_SESSIONS = ['donnees', 'vide', 'chargement', 'probleme'] as const
export type VueApercuSessions = (typeof VUES_APERCU_SESSIONS)[number]

export function lireVueApercuSessions(valeur: string | null): VueApercuSessions {
  return VUES_APERCU_SESSIONS.find((vue) => vue === valeur) ?? 'donnees'
}

/** Les huit ministères actifs de la maquette 14, dans l'ordre alphabétique. */
export const MINISTERES_APERCU: MinistereAChoisir[] = [
  { id: '10000000-0000-4000-8000-000000000001', nom: 'Communication' },
  { id: '10000000-0000-4000-8000-000000000002', nom: 'Coordination' },
  { id: '10000000-0000-4000-8000-000000000003', nom: 'EJP Formation' },
  { id: '10000000-0000-4000-8000-000000000004', nom: 'FIJ' },
  { id: '10000000-0000-4000-8000-000000000005', nom: 'Intégration' },
  { id: '10000000-0000-4000-8000-000000000006', nom: 'Jeunesse' },
  { id: '10000000-0000-4000-8000-000000000007', nom: 'Prodiges Junior' },
  { id: '10000000-0000-4000-8000-000000000008', nom: 'Social' },
]

/** Une session de l'aperçu : sa ligne de vue et les identifiants de ses ministères attendus. */
export interface SessionApercu {
  ligne: SessionDeclaree
  attendus: string[]
}

export interface DonneesApercu {
  sessions: SessionApercu[]
}

const TOUS = MINISTERES_APERCU.map((ministere) => ministere.id)

function session(
  numero: number,
  type: SessionDeclaree['type'],
  date: DateIso,
  saisis: number,
  manquants: string[],
  intitule: string | null = null,
): SessionApercu {
  const aEuLieu = date <= AUJOURDHUI_APERCU
  return {
    ligne: {
      session_id: `20000000-0000-4000-8000-${String(numero).padStart(12, '0')}`,
      type,
      date,
      intitule,
      a_eu_lieu: aEuLieu,
      nb_attendus: TOUS.length,
      nb_saisis: saisis,
      manquants,
    },
    attendus: [...TOUS],
  }
}

/** Les cinq sessions de la maquette 14, plus une session à venir. */
export function donneesExemple(): DonneesApercu {
  return {
    sessions: [
      session(6, 'anti_dispersion', '2026-10-10', 0, []),
      session(5, 'batir', '2026-10-03', 6, ['Intégration', 'Social']),
      session(4, 'anti_dispersion', '2026-09-26', 8, []),
      session(3, 'batir', '2026-09-19', 8, []),
      session(2, 'anti_dispersion', '2026-09-12', 8, []),
      session(1, 'batir', '2026-09-05', 8, []),
    ],
  }
}

export function donneesVides(): DonneesApercu {
  return { sessions: [] }
}

/** Refus de la base, au format d'une erreur PostgREST (P0001 : message de saisie). */
function refusDeSaisie(message: string) {
  return Object.assign(new Error(message), { code: 'P0001', message })
}

/** Ajoute une session comme `declarer_session` : doublon refusé, attendus enregistrés. */
export function simulerDeclaration(
  avant: DonneesApercu,
  valeurs: ValeursDeclaration,
): { apres: DonneesApercu; id: string } {
  const intitule = valeurs.type === 'autre' ? valeurs.nom.trim() : null
  const doublon = avant.sessions.some(
    ({ ligne }) =>
      ligne.type === valeurs.type &&
      ligne.date === valeurs.date &&
      (valeurs.type !== 'autre' || ligne.intitule === intitule),
  )
  if (doublon) {
    throw refusDeSaisie(
      `Une session ${valeurs.type === 'autre' ? `« ${intitule} »` : nomSession(valeurs.type, null)} est déjà déclarée le ${formaterJourLong(valeurs.date)}.`,
    )
  }
  const numero = avant.sessions.length + 100
  const id = `20000000-0000-4000-8000-${String(numero).padStart(12, '0')}`
  const aEuLieu = valeurs.date <= AUJOURDHUI_APERCU
  const noms = MINISTERES_APERCU.filter((ministere) =>
    valeurs.ministeres.includes(ministere.id),
  ).map((ministere) => ministere.nom)
  const nouvelle: SessionApercu = {
    ligne: {
      session_id: id,
      type: valeurs.type,
      date: valeurs.date,
      intitule,
      a_eu_lieu: aEuLieu,
      nb_attendus: valeurs.ministeres.length,
      nb_saisis: 0,
      manquants: aEuLieu ? noms : [],
    },
    attendus: [...valeurs.ministeres],
  }
  const sessions = [...avant.sessions, nouvelle].sort((a, b) =>
    a.ligne.date < b.ligne.date ? 1 : a.ligne.date > b.ligne.date ? -1 : 0,
  )
  return { apres: { sessions }, id }
}

/** Remplace les ministères attendus comme `modifier_session`. */
export function simulerModification(
  avant: DonneesApercu,
  sessionId: string,
  ministeres: readonly string[],
): DonneesApercu {
  return {
    sessions: avant.sessions.map((courante) => {
      if (courante.ligne.session_id !== sessionId) return courante
      const manquants = courante.ligne.a_eu_lieu
        ? MINISTERES_APERCU.filter((ministere) => ministeres.includes(ministere.id)).map(
            (ministere) => ministere.nom,
          )
        : []
      return {
        attendus: [...ministeres],
        ligne: {
          ...courante.ligne,
          nb_attendus: ministeres.length,
          manquants: courante.ligne.nb_saisis === 0 ? manquants : courante.ligne.manquants,
        },
      }
    }),
  }
}

/** Supprime une session comme `supprimer_session` : refusée si un ministère a déjà saisi. */
export function simulerSuppression(avant: DonneesApercu, sessionId: string): DonneesApercu {
  const cible = avant.sessions.find(({ ligne }) => ligne.session_id === sessionId)
  if (cible && cible.ligne.nb_saisis > 0) {
    throw refusDeSaisie('Des ministères ont déjà saisi : la session ne peut plus être supprimée.')
  }
  return { sessions: avant.sessions.filter(({ ligne }) => ligne.session_id !== sessionId) }
}

/** Réponse simulée après un court délai, comme le réseau. */
export function attendre(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 150))
}
