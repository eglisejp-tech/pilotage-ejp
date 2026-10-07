import type { EtatBloc, PointFiche } from '@/features/fiche/modeleFiche'

/** Action d'une ligne de « Vos saisies » : « Corriger », « Saisir », « Renseigner »... */
export interface ActionLigneSaisie {
  libelle: string
  /** Adresse de la saisie (`/saisir/dimanche`, `/saisir/session/<id>`...). */
  vers: string
}

/**
 * Une ligne de « Vos saisies » sur l'accueil du ministère (maquette 07, lot E7). Chaque lot de
 * saisie écrit ses lignes (`lignesChiffres.ts`, `lignesSessions.ts`, `lignesFij.ts`,
 * `lignesReunion.ts`, `lignesEvenements.ts`) ; E7 les range et les affiche.
 */
export interface LigneVosSaisies {
  /** Clé stable de la ligne (liste React, tests) : `dimanche`, `session:<id>`... */
  cle: string
  /** « Chiffres du dimanche 27 sept. », « Bâtir l'Église du 26 sept. », « Prochaine réunion ». */
  libelle: string
  /** Fait : une saisie existe pour la période. À faire : il reste à saisir. */
  etat: 'fait' | 'a_faire'
  /** « Fait, 10 au service », « À faire, date non confirmée » ; null s'il n'y a rien à dire. */
  detail: string | null
  /** Null : ligne sans bouton (événement d'un autre ministère qui le mentionne seulement). */
  action: ActionLigneSaisie | null
}

/** Un bouton de l'ouverture de l'accueil : un lien vers une saisie. */
export interface BoutonAccueil {
  libelle: string
  vers: string
}

/**
 * Ouverture de l'accueil du ministère (maquette 07) : la phrase de ce qu'il reste à faire, le
 * bouton principal jaune (la première chose « À faire » de « Vos saisies », absent quand tout est
 * fait) et les boutons secondaires, sans celui qui est devenu le bouton principal.
 */
export interface OuvertureAccueil {
  /** Segments de la phrase ; `aDecider` porte le surligneur de ce qui reste. */
  phrase: { texte: string; aDecider?: boolean }[]
  principal: BoutonAccueil | null
  secondaires: BoutonAccueil[]
}

/** Ce que l'accueil du ministère ajoute à la vue de l'église (maquette 07). */
export interface DonneesAccueilMinistere {
  ouverture: OuvertureAccueil
  vosSaisies: LigneVosSaisies[]
  /** Lu à part : un échec garde la page et propose « Réessayer » dans le bloc. */
  vosPoints: EtatBloc<PointFiche[]>
}
