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
