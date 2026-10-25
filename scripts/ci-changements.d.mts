// Types du script de la CI économe, pour son test (src/test/ciChangements.test.ts).
export interface Decision {
  /** Vrai : tous les jobs tournent (mise en ligne de main comprise). */
  code: boolean
  raison: string
}

export function estDocumentation(chemin: string): boolean
export function decider(entree: { evenement: string; fichiers: string[] | null }): Decision
export function choisirBase(
  commitsVerts: readonly string[],
  estAncetre: (sha: string) => boolean,
): string | null
export function analyser(entree: {
  evenement: string
  lireCommitsVerts: () => Promise<string[]>
  estAncetre: (sha: string) => boolean
  fichiersDepuis: (base: string) => string[]
}): Promise<Decision & { base: string | null }>
