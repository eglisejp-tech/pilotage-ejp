// Enveloppe commune des Edge Functions de comptes : OPTIONS, méthode POST seule, contrôle de
// l'appelant avant de lire le corps, validation Zod, puis l'action. Toute erreur devient
// { erreur: '<code>' } sans détail interne.
import type { z } from 'zod'
import { verifierAppelant, type Appelant } from './appelant.ts'
import { consigner, ErreurFonction, reponseErreur, reponseOk, reponsePreliminaire } from './http.ts'

// Un corps de demande tient largement dans 4 Kio (adresse, nom et description du ministère).
const TAILLE_MAX_CORPS = 4096

async function lireCorps<S extends z.ZodType>(requete: Request, schema: S): Promise<z.output<S>> {
  const longueurAnnoncee = Number(requete.headers.get('content-length') ?? '0')
  if (!Number.isFinite(longueurAnnoncee) || longueurAnnoncee > TAILLE_MAX_CORPS) {
    throw new ErreurFonction(400, 'requete_invalide')
  }
  let brut: unknown
  try {
    const texte = await requete.text()
    if (texte.length > TAILLE_MAX_CORPS) throw new ErreurFonction(400, 'requete_invalide')
    brut = JSON.parse(texte)
  } catch {
    throw new ErreurFonction(400, 'requete_invalide')
  }
  const resultat = schema.safeParse(brut)
  if (!resultat.success) throw new ErreurFonction(400, 'requete_invalide')
  return resultat.data
}

interface Definition<S extends z.ZodType> {
  nom: string
  schema: S
  action: (demande: z.output<S>, appelant: Appelant) => Promise<void>
}

export function servir<S extends z.ZodType>({
  nom,
  schema,
  action,
}: Definition<S>): { fetch: (requete: Request) => Promise<Response> } {
  return {
    async fetch(requete: Request): Promise<Response> {
      if (requete.method === 'OPTIONS') return reponsePreliminaire()
      try {
        if (requete.method !== 'POST') throw new ErreurFonction(405, 'methode_non_autorisee')
        const appelant = await verifierAppelant(requete, nom)
        const demande = await lireCorps(requete, schema)
        await action(demande, appelant)
        return reponseOk()
      } catch (erreur) {
        if (erreur instanceof ErreurFonction) return reponseErreur(erreur)
        consigner(nom, 'inattendue', erreur instanceof Error ? erreur.name : undefined)
        return reponseErreur(new ErreurFonction(500, 'erreur_interne'))
      }
    },
  }
}
