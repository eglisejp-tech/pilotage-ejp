import type { LigneSession } from '@/features/sessions/construire'
import type { MinistereAChoisir } from '@/features/sessions/ChoixMinisteres'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import type { DateIso } from '@/lib/metier/dates'

/** Ce que l'écran 14 lit : les sessions, les ministères actifs et le jour de Paris. */
export interface DonneesSessions {
  lignes: LigneSession[]
  /** Ministères actifs, dans l'ordre alphabétique. */
  ministeres: MinistereAChoisir[]
  /** `v_semaine.aujourdhui` : jamais la date du navigateur. */
  aujourdhui: DateIso
}

/** Ce que l'écran 14 fait : branché sur la base par la page, simulé par l'aperçu. */
export interface ActionsSessions {
  /** Rend l'identifiant de la session déclarée. */
  declarer: (valeurs: ValeursDeclaration) => Promise<string>
  modifier: (sessionId: string, ministeres: readonly string[]) => Promise<void>
  supprimer: (sessionId: string) => Promise<void>
  /** Ministères attendus d'une session, pour préremplir « Modifier ». */
  lireAttendus: (sessionId: string) => Promise<string[]>
}
