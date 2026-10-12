import type { EtatCompte, TypeCompte } from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'

/** État affiché : celui du compte, ou « sans compte » pour un ministère actif qui n'en a pas. */
export type EtatLigne = EtatCompte | 'sans_compte'

/** Une ligne de l'écran 13 : un compte, ou un ministère actif sans compte. */
export interface LigneCompte {
  /** Clé stable de la ligne (identifiant du compte, ou du ministère sans compte). */
  cle: string
  /** Identifiant du compte (auth.users.id) ; null pour un ministère sans compte. */
  userId: string | null
  type: TypeCompte
  /** Nom affiché dans la première colonne : « Communication », « Conseil, compte 3 ». */
  nom: string
  email: string | null
  etat: EtatLigne
  /** Jour de Paris de la désactivation ; null pour un compte actif. */
  desactiveLe: DateIso | null
  ministereId: string | null
  /** Indicateurs propres actifs ou à valider (ministères seulement). */
  indicateurs: number | null
  /** Ministère FIJ : il saisit aussi ses chiffres par département. */
  fij: boolean
}

/** Ce que l'écran affiche, construit à partir des lectures. */
export interface DonneesComptes {
  ministeres: LigneCompte[]
  /** Ministères actifs (en-tête « 8 actifs, un email partagé chacun »). */
  nbMinisteresActifs: number
  bergerConseil: LigneCompte[]
  ejpTech: LigneCompte[]
  /** Un berger actif existe : « Ajouter le compte du berger » n'apparaît pas. */
  bergerActif: boolean
  /** Libellés que recevront les prochains comptes (« Conseil, compte 5 »), jamais réutilisés. */
  prochainConseil: string
  prochainEjpTech: string
}

/** Demande de création, telle que le panneau la remplit. */
export type CreationCompte =
  | { type: 'ministere'; email: string; nom: string; description?: string }
  | { type: 'ministere_existant'; email: string; ministereId: string; nom: string }
  | { type: 'berger' | 'conseil' | 'admin_plateforme'; email: string }

/** Les actions de l'écran : la page les branche sur les Edge Functions, l'aperçu les simule. */
export interface ActionsComptes {
  creer: (creation: CreationCompte) => Promise<void>
  relancer: (userId: string) => Promise<void>
  desactiver: (userId: string) => Promise<void>
  reactiver: (userId: string) => Promise<void>
  refaireActivation: (userId: string) => Promise<void>
}
