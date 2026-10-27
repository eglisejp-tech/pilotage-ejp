// File locale des incidents d'envoi (T76, lot C ; conception erreurs-envoi, section 6.3). Un
// incident naît sur le téléphone quand un envoi échoue ; il attend ici que la session de son
// espace soit en aal2, puis part vers la base (`noter_incidents`). Une file par espace (T73) :
// un incident de l'espace A ne part jamais au nom de l'espace B. Chaque accès au stockage est
// protégé : en navigation privée, la file vit en mémoire seulement.
//
// Rien de ce que la personne a saisi n'entre ici : le schéma est fermé, toute clé en trop est
// refusée, et la file relue du stockage repasse par le même schéma.

import { z } from 'zod'
import type { IncidentEnvoye } from '@/lib/base'

/** Au-delà, le plus ancien incident tombe. */
export const PLAFOND_FILE = 20

/** Un incident de plus de 7 jours tombe à l'envoi. */
export const DUREE_FILE_MS = 7 * 24 * 60 * 60 * 1000

/** Clé de la file d'un espace dans `localStorage`. */
export function cleFile(espaceId: string): string {
  return `pilotage-incidents:${espaceId}`
}

/**
 * Codes des Edge Functions des comptes gardés dans un incident (`private.codes_incident()`, même
 * liste ; supabase/functions/_shared/http.ts). Un code d'incident est un SQLSTATE, un code
 * PostgREST ou l'un d'eux, jamais un mot libre.
 */
export const CODES_FONCTIONS = [
  'requete_invalide',
  'methode_non_autorisee',
  'non_authentifie',
  'session_revoquee',
  'double_authentification_requise',
  'acces_refuse',
  'type_interdit',
  'ministere_inconnu',
  'compte_inconnu',
  'propre_compte',
  'adresse_deja_utilisee',
  'ministere_a_deja_un_compte',
  'nom_ministere_deja_pris',
  'berger_deja_actif',
  'compte_desactive',
  'compte_actif',
  'invitation_deja_acceptee',
  'invitation_trop_recente',
  'conflit',
  'invitation_non_envoyee',
  'activation_incomplete',
  'compte_deja_active',
  'ministere_non_vide',
  'ministere_de_reference',
  'suppression_incomplete',
  'erreur_interne',
] as const

/** Un code qu'un incident peut garder. */
export function estCodeIncident(code: string): boolean {
  return (
    /^([0-9A-Z]{5}|PGRST[0-9]{3})$/.test(code) ||
    (CODES_FONCTIONS as readonly string[]).includes(code)
  )
}

/** Un incident, champ par champ : listes fermées et bornes de la table `private.incident`. */
export const schemaIncident = z.strictObject({
  reference: z.string().regex(/^[2-9A-HJKMNP-Z]{6}$/),
  survenu_le: z.iso.datetime(),
  ecran: z.string().max(40),
  operation: z.string().max(40),
  genre: z.enum([
    'session',
    'sans_reponse',
    'reponse_perdue',
    'reponse_illisible',
    'delai',
    'refus_inconnu',
    'bogue',
  ]),
  issue: z.enum(['enregistre', 'inconnue', 'rien_enregistre']),
  rattrape: z.boolean(),
  statut_http: z.number().int().min(100).max(599).nullable(),
  code: z.string().refine(estCodeIncident).nullable(),
  nom_erreur: z.string().max(40).nullable(),
  duree_ms: z.number().int().min(0).max(120_000).nullable(),
  en_ligne: z.boolean().nullable(),
  visible: z.boolean().nullable(),
  version: z.string().regex(/^([0-9a-f]{7}|local)$/),
  navigateur: z.enum(['safari', 'chrome', 'firefox', 'edge', 'samsung', 'autre']).nullable(),
  version_navigateur: z.number().int().min(1).max(999).nullable(),
  systeme: z.enum(['ios', 'android', 'macos', 'windows', 'linux', 'autre']).nullable(),
}) satisfies z.ZodType<IncidentEnvoye>

/** Files gardées en mémoire quand le stockage est inaccessible (navigation privée). */
const enMemoire = new Map<string, IncidentEnvoye[]>()

function stockage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Les incidents valables d'un texte stocké ; un texte abîmé donne une file vide. */
function analyser(brut: string | null): IncidentEnvoye[] {
  if (brut === null) return []
  try {
    const valeur: unknown = JSON.parse(brut)
    if (!Array.isArray(valeur)) return []
    return valeur.flatMap((element) => {
      const lu = schemaIncident.safeParse(element)
      return lu.success ? [lu.data] : []
    })
  } catch {
    return []
  }
}

/** Sans les incidents de plus de 7 jours ni ceux d'au-delà du plafond (les plus anciens). */
function elaguer(file: IncidentEnvoye[], maintenant: number): IncidentEnvoye[] {
  return file
    .filter((incident) => maintenant - Date.parse(incident.survenu_le) <= DUREE_FILE_MS)
    .slice(-PLAFOND_FILE)
}

/** Texte stocké sous une clé, ou null (absent, ou stockage inaccessible). */
function lireStockage(cle: string): string | null {
  try {
    return stockage()?.getItem(cle) ?? null
  } catch {
    return null
  }
}

/** La file d'un espace, élaguée. */
export function lireFile(espaceId: string, maintenant = Date.now()): IncidentEnvoye[] {
  const cle = cleFile(espaceId)
  const brut = lireStockage(cle)
  const file = brut === null ? (enMemoire.get(cle) ?? []) : analyser(brut)
  return elaguer(file, maintenant)
}

function ecrireFile(espaceId: string, file: IncidentEnvoye[]): void {
  const cle = cleFile(espaceId)
  enMemoire.set(cle, file)
  try {
    const magasin = stockage()
    if (!magasin) return
    if (file.length === 0) magasin.removeItem(cle)
    else magasin.setItem(cle, JSON.stringify(file))
  } catch {
    // Stockage plein ou bloqué : la file reste en mémoire.
  }
}

/** Ajoute un incident à la file d'un espace ; un incident mal formé n'entre pas. */
export function ajouterAFile(
  espaceId: string,
  incident: IncidentEnvoye,
  maintenant = Date.now(),
): void {
  const lu = schemaIncident.safeParse(incident)
  if (!lu.success) return
  const file = lireFile(espaceId, maintenant).filter(
    (autre) => autre.reference !== lu.data.reference,
  )
  ecrireFile(espaceId, elaguer([...file, lu.data], maintenant))
}

/** Retire de la file les incidents envoyés (même ceux que la base a ignorés). */
export function retirerDeFile(espaceId: string, references: readonly string[]): void {
  const envoyes = new Set(references)
  ecrireFile(
    espaceId,
    lireFile(espaceId).filter((incident) => !envoyes.has(incident.reference)),
  )
}

/** Envois en cours, par espace : un seul à la fois. */
const enCours = new Set<string>()

/** Au plus quelques lots de suite : des incidents arrivés pendant un envoi partent aussitôt. */
const LOTS_DE_SUITE = 3

/**
 * Envoie la file d'un espace par `noter` (`noter_incidents`). Un seul envoi à la fois ; les
 * incidents arrivés pendant l'envoi partent dans un lot suivant. Après une réponse reçue, les
 * incidents envoyés sortent de la file, même ceux que la base a ignorés (sinon une boucle) ;
 * après un échec, ils restent. Un échec de cet envoi ne crée jamais d'incident et ne dit rien à
 * l'écran.
 */
export async function envoyerFile(
  espaceId: string,
  noter: (lot: IncidentEnvoye[]) => Promise<unknown>,
): Promise<void> {
  if (enCours.has(espaceId)) return
  enCours.add(espaceId)
  try {
    for (let rang = 0; rang < LOTS_DE_SUITE; rang += 1) {
      const lot = lireFile(espaceId)
      ecrireFile(espaceId, lot)
      if (lot.length === 0) return
      await noter(lot)
      retirerDeFile(
        espaceId,
        lot.map((incident) => incident.reference),
      )
    }
  } catch {
    // La file attend le prochain envoi (retour du réseau, nouvelle session, écriture réussie).
  } finally {
    enCours.delete(espaceId)
  }
}

/** Vide la mémoire de secours (tests). */
export function viderMemoireFiles(): void {
  enMemoire.clear()
  enCours.clear()
}
