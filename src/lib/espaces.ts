import { z } from 'zod'
import type { TypeCompte } from '@/lib/base'

// Comptes ouverts sur cet appareil (T73, « Changer d'espace »). Chaque compte garde sa propre
// connexion, dans sa propre clé de stockage, gérée par auth-js (rotation des jetons, verrou et
// onglets par clé) ; un seul client Supabase, celui de l'espace actif, existe dans la page. Ce
// registre ne contient aucun jeton ni email : l'id Auth (déjà dans la session de Supabase), le
// libellé du compte (jamais le nom d'une personne) et son type, pour la liste de l'en-tête.

/** Clé du registre dans localStorage. */
export const CLE_REGISTRE = 'pilotage-espaces'

/** Premier espace : la clé de stockage par défaut de Supabase (les connexions déjà ouvertes restent). */
export const ESPACE_PRINCIPAL = 'principal'

/** Au plus quatre comptes ouverts sur un appareil (Proposé, T73). */
export const NOMBRE_MAX_ESPACES = 4

/** Événement de la page quand le registre change (l'événement `storage` ne vient que des autres onglets). */
export const EVENEMENT_REGISTRE = 'pilotage-espaces-change'

const PREFIXE_CLE = 'sb-pilotage-espace-'
const TYPES = ['ministere', 'berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const

const schemaEspace = z.object({
  id: z.string().regex(/^[a-z0-9]{1,24}$/),
  /** null : la clé par défaut de Supabase (espace principal). */
  cle: z
    .string()
    .regex(/^sb-pilotage-espace-[a-z0-9]{1,24}-auth-token$/)
    .nullable(),
  utilisateur: z
    .string()
    .regex(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i)
    .optional(),
  libelle: z.string().min(1).max(120).optional(),
  type: z.enum(TYPES).optional(),
})

const schemaRegistre = z.object({
  actif: z.string(),
  espaces: z.array(schemaEspace).min(1).max(NOMBRE_MAX_ESPACES),
})

export type Espace = z.infer<typeof schemaEspace>
export type Registre = z.infer<typeof schemaRegistre>

/** Registre d'un appareil où un seul compte s'est connecté (ou aucun). */
export function registreParDefaut(): Registre {
  return { actif: ESPACE_PRINCIPAL, espaces: [{ id: ESPACE_PRINCIPAL, cle: null }] }
}

/** Lit un registre enregistré ; illisible, incomplet ou absent : le registre par défaut. */
export function analyserRegistre(brut: string | null): Registre {
  if (brut === null) return registreParDefaut()
  let valeur: unknown
  try {
    valeur = JSON.parse(brut)
  } catch {
    return registreParDefaut()
  }
  const resultat = schemaRegistre.safeParse(valeur)
  if (!resultat.success) return registreParDefaut()
  const registre = resultat.data
  const ids = new Set(registre.espaces.map(({ id }) => id))
  const premier = registre.espaces[0]
  if (!premier || ids.size !== registre.espaces.length) return registreParDefaut()
  if (!ids.has(registre.actif)) return { ...registre, actif: premier.id }
  return registre
}

function stockage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Texte brut du registre (null s'il n'existe pas ou si le stockage est inaccessible). */
export function lireRegistreBrut(): string | null {
  try {
    return stockage()?.getItem(CLE_REGISTRE) ?? null
  } catch {
    return null
  }
}

export function lireRegistre(): Registre {
  return analyserRegistre(lireRegistreBrut())
}

export function ecrireRegistre(registre: Registre): void {
  try {
    stockage()?.setItem(CLE_REGISTRE, JSON.stringify(registre))
  } catch {
    // Stockage plein ou bloqué : le registre reste celui de la page.
  }
  window.dispatchEvent(new Event(EVENEMENT_REGISTRE))
}

/** Plus qu'un compte possible, dans la clé par défaut : l'appareil revient au cas d'un seul compte. */
export function effacerRegistre(): void {
  try {
    stockage()?.removeItem(CLE_REGISTRE)
  } catch {
    // Stockage bloqué : rien n'y est enregistré.
  }
  window.dispatchEvent(new Event(EVENEMENT_REGISTRE))
}

export function espaceActif(registre: Registre = lireRegistre()): Espace {
  return (
    registre.espaces.find(({ id }) => id === registre.actif) ??
    registre.espaces[0] ?? { id: ESPACE_PRINCIPAL, cle: null }
  )
}

/** Clé de stockage par défaut de supabase-js (`sb-<premier mot de l'hôte>-auth-token`). */
export function cleParDefaut(urlSupabase: string): string {
  return `sb-${new URL(urlSupabase).hostname.split('.')[0]}-auth-token`
}

export function cleDeStockage(espace: Espace, urlSupabase: string): string {
  return espace.cle ?? cleParDefaut(urlSupabase)
}

function nouvelId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

/** Nouvel espace vide, devenu l'espace actif. Null au-delà de NOMBRE_MAX_ESPACES. */
export function avecNouvelEspace(
  registre: Registre,
): { registre: Registre; espace: Espace } | null {
  if (registre.espaces.length >= NOMBRE_MAX_ESPACES) return null
  const id = nouvelId()
  const espace: Espace = { id, cle: `${PREFIXE_CLE}${id}-auth-token` }
  return { registre: { actif: id, espaces: [...registre.espaces, espace] }, espace }
}

/** Retire un espace ; s'il était actif, le premier restant le devient. Jamais le dernier. */
export function sansEspace(registre: Registre, id: string): Registre {
  const espaces = registre.espaces.filter((espace) => espace.id !== id)
  const premier = espaces[0]
  if (!premier) return registre
  const actif = espaces.some((espace) => espace.id === registre.actif) ? registre.actif : premier.id
  return { actif, espaces }
}

export function avecActif(registre: Registre, id: string): Registre {
  return registre.espaces.some((espace) => espace.id === id) ? { ...registre, actif: id } : registre
}

/** Le compte connecté dans un espace : son id Auth, son libellé et son type. */
export type CompteDeLEspace = { utilisateur: string; libelle: string; type: TypeCompte }

/**
 * Note le compte connecté dans l'espace `id`. Rend aussi les autres espaces du même compte
 * (doublons : le compte a été ouvert une deuxième fois), à fermer.
 */
export function avecCompte(
  registre: Registre,
  id: string,
  compte: CompteDeLEspace,
): { registre: Registre; doublons: Espace[] } {
  const espaces = registre.espaces.map((espace) =>
    espace.id === id ? { ...espace, ...compte } : espace,
  )
  const doublons = espaces.filter(
    (espace) => espace.id !== id && espace.utilisateur === compte.utilisateur,
  )
  return { registre: { ...registre, espaces }, doublons }
}

/** L'espace `id` n'a plus de compte connu (déconnexion, compte désactivé). */
export function sansCompte(registre: Registre, id: string): Registre {
  return {
    ...registre,
    espaces: registre.espaces.map((espace) =>
      espace.id === id ? { id: espace.id, cle: espace.cle } : espace,
    ),
  }
}

/** Les espaces dont le compte est connu, l'actif compris : la liste « Changer d'espace ». */
export function espacesConnus(registre: Registre): Espace[] {
  return registre.espaces.filter((espace) => espace.libelle !== undefined)
}

// Un passage d'un espace à l'autre recharge la page : l'ouverture de l'outil (T67) ne rejoue
// pas, ce n'est pas une ouverture. Marqueur à usage unique, propre à l'onglet.
const CLE_PASSAGE = 'pilotage-passage-espace'

export function noterPassageDEspace(): void {
  try {
    window.sessionStorage.setItem(CLE_PASSAGE, '1')
  } catch {
    // Stockage bloqué : l'ouverture jouera, rien d'autre ne change.
  }
}

/** Vrai une fois, au chargement qui suit un passage d'un espace à l'autre. */
export function lirePassageDEspace(): boolean {
  try {
    const present = window.sessionStorage.getItem(CLE_PASSAGE) !== null
    window.sessionStorage.removeItem(CLE_PASSAGE)
    return present
  } catch {
    return false
  }
}
