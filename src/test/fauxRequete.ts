import { vi } from 'vitest'

// Faux client Supabase pour les tests des lectures (src/data) : chaque `from(nom)` rend une
// requête chaînable qui note ses appels (select, eq, order...) et répond comme le client réel.
// Aucune requête réseau.

export interface AppelRequete {
  methode: string
  args: unknown[]
}

export interface RequeteNotee {
  table: string
  appels: AppelRequete[]
}

export interface ReponseFausse {
  data: unknown
  error: unknown
}

type Reponses = Record<string, ReponseFausse | (() => ReponseFausse | Promise<ReponseFausse>)>

/** Les appels notés d'une requête, sous la forme « methode(args) ». */
export function appelsDe(requete: RequeteNotee | undefined): string[] {
  return (requete?.appels ?? []).map(
    (appel) => `${appel.methode}(${appel.args.map((arg) => JSON.stringify(arg)).join(', ')})`,
  )
}

/**
 * `reponses` : par nom de table ou de vue, la réponse `{ data, error }` (ou une fonction qui la
 * rend, pour simuler un retard ou un échec). Une table sans réponse rend `{ data: [], error: null }`.
 */
export function fauxRequete(reponses: Reponses = {}) {
  const requetes: RequeteNotee[] = []
  const from = vi.fn((table: string) => {
    const note: RequeteNotee = { table, appels: [] }
    requetes.push(note)
    const choix = reponses[table]
    const reponse = (): Promise<ReponseFausse> =>
      Promise.resolve(typeof choix === 'function' ? choix() : (choix ?? { data: [], error: null }))
    const requete: object = new Proxy(
      {},
      {
        get(_cible, propriete) {
          if (propriete === 'then') {
            return (
              resolu: (valeur: ReponseFausse) => unknown,
              rejete: (raison: unknown) => unknown,
            ) => reponse().then(resolu, rejete)
          }
          return (...args: unknown[]) => {
            note.appels.push({ methode: String(propriete), args })
            return requete
          }
        },
      },
    )
    return requete
  })
  return {
    client: { from },
    from,
    requetes,
    /** Les requêtes faites sur une table ou une vue, dans l'ordre. */
    de: (table: string) => requetes.filter((requete) => requete.table === table),
  }
}
