// Types du script de contrôle, pour son test (src/test/verifierDeploiement.test.ts).
export interface Resultat {
  nom: string
  ok: boolean
  detail?: string
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export interface SystemeFichiers {
  lister(dossier: string): string[]
  lire(chemin: string): string
}

export interface Options {
  siteUrl: URL
  supabaseUrl: URL
  cle: string
  google: boolean
  dist: string
}

export const FONCTIONS: string[]

export function verifierCle(cle: unknown): string
export function analyserArguments(argv: string[]): Options
export function trouverSecrets(texte: string): string[]
export function verifierSite(options: {
  siteUrl: URL
  supabaseUrl: URL
  fetchImpl?: Fetch
}): Promise<Resultat[]>
export function verifierAuth(options: {
  supabaseUrl: URL
  cle: string
  google: boolean
  fetchImpl?: Fetch
}): Promise<Resultat[]>
export function verifierFonctions(options: {
  siteUrl: URL
  supabaseUrl: URL
  cle: string
  fetchImpl?: Fetch
}): Promise<Resultat[]>
export function verifierDist(options?: { dossier?: string; systeme?: SystemeFichiers }): Resultat[]
export function verifierDeploiement(options: {
  siteUrl: URL
  supabaseUrl: URL
  cle: string
  google?: boolean
  dist?: string
  fetchImpl?: Fetch
  systeme?: SystemeFichiers
}): Promise<Resultat[]>
export function formaterResultats(resultats: Resultat[]): string
