// Ce que les panneaux et les fenêtres de la configuration des indicateurs demandent à la base, sous
// forme d'une interface : l'écran réel y met les appels de `src/data/indicateursEcriture.ts`,
// l'aperçu de développement (`/apercu/indicateurs`) y met des écritures simulées. Les composants ne
// savent pas lequel des deux ils reçoivent.

import type { FiltreTermes, LigneTerme } from '@/data/indicateursEcriture'
import type { EntreeAjout, EntreeCalcul, EntreeCorrection } from '@/data/indicateursEcriture'
import type {
  LimitesIndicateurs,
  MotifRetraitChoisi,
  NatureIndicateur,
  VerificationLibelle,
} from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'

/** Le jour de Paris et le dimanche de référence (`v_semaine`), pour l'aperçu de la saisie. */
export interface SemaineApercu {
  aujourdhui: DateIso
  dimanche: DateIso
}

export interface EcrituresIndicateurs {
  /** Le jour de Paris et le dimanche de référence (`v_semaine`), `null` si la vue est vide. */
  semaine: () => Promise<SemaineApercu | null>
  /** Ajoute un indicateur ; avec `remplaceId`, retire l'ancien dans la même transaction. */
  ajouter: (ministereId: string, entree: EntreeAjout, remplaceId: string | null) => Promise<void>
  /** Ajoute un calcul ; avec `remplaceId`, retire l'ancien calcul dans la même transaction. */
  ajouterCalcul: (
    ministereId: string,
    entree: EntreeCalcul,
    remplaceId: string | null,
  ) => Promise<void>
  corriger: (ministereId: string, indicateurId: string, entree: EntreeCorrection) => Promise<void>
  /** Rend le nombre de calculs retirés avec l'indicateur. */
  retirer: (
    ministereId: string,
    indicateurId: string,
    motif: MotifRetraitChoisi | 'confidentialite',
  ) => Promise<number>
  verifier: (
    libelle: string,
    nature: NatureIndicateur,
    ministereId: string,
  ) => Promise<VerificationLibelle[]>
  limites: (ministereId: string) => Promise<LimitesIndicateurs>
  termes: (filtre: FiltreTermes) => Promise<LigneTerme[]>
}
