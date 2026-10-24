// Types du script des garde-fous du design, pour son test (src/test/verifierDesign.test.ts).
export interface Regle {
  code: string
  motif: RegExp
  conseil: string
  permis?: string[]
}

/** Lignes où chaque règle trouve un motif, par code de règle. */
export type Comptes = Record<string, Record<string, number[]>>

/** Plafonds par règle, puis par fichier. */
export type Plafonds = Record<string, Record<string, number>>

export const REGLES: Regle[]
export const CHEMIN_SCRIPT: string
export function estAnalyse(chemin: string): boolean
export function compter(texte: string, fichier?: string): Record<string, number[]>
export function comparer(
  comptes: Comptes,
  plafonds: Plafonds,
): {
  erreurs: { regle: Regle; fichier: string; nombre: number; limite: number; lignes: number[] }[]
  aBaisser: { regle: string; fichier: string; nombre: number; limite: number }[]
}
export function verifierLargeurs(css: string, largeursTs: string): string[]
export function lireComptes(racine: string): Comptes
