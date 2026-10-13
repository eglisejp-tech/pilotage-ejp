import { vi } from 'vitest'
import type { TypeCompte } from '@/lib/base'

// Faux client Supabase pour les tests unitaires : seulement les appels que fait l'application.
// Chaque test décrit la session voulue et, au besoin, les lignes des vues ; aucune requête réseau.

export type ScenarioSession = {
  utilisateur?: { id: string; email: string } | null
  niveau?: { currentLevel: 'aal1' | 'aal2'; nextLevel: 'aal1' | 'aal2' }
  compte?: {
    user_id: string
    type: TypeCompte
    ministere_id: string | null
    libelle: string
    desactive_le: string | null
  } | null
  facteursVerifies?: string[]
  /**
   * La version courante des conditions est acceptée : par le compte (T53), ou, pour un compte de
   * ministère, par la personne déclarée sur la session (T61) ; vrai par défaut.
   */
  conditionsAcceptees?: boolean
  /**
   * Compte de ministère (T61) : les prénoms qui ont accepté la version courante. Donnée, elle
   * remplace `conditionsAcceptees` : `conditions_acceptees` répond pour le prénom déclaré sur la
   * session (majuscules ignorées, comme la base), et `accepter_conditions` l'ajoute.
   */
  prenomsAyantAccepte?: string[]
  /**
   * Dernière déclaration de la session (T56, `v_ma_declaration`), lue pour un compte de
   * ministère : « Marie », déclarée aujourd'hui, par défaut ; null : aucune déclaration.
   * `du_jour` (T63) : faite aujourd'hui, jour de Paris ; vrai si absent.
   */
  declaration?: { id: number; prenom: string; du_jour?: boolean } | null
  /**
   * Lignes rendues par une vue ou une table autre que `compte` (`v_semaine`, `v_point`...).
   * Absente : aucune ligne. Les filtres et tris ne sont pas appliqués : le test donne les lignes
   * telles que la base les rendrait.
   */
  lignes?: Record<string, unknown[]>
  /** Vues ou tables dont la lecture échoue (erreur PostgREST). */
  enEchec?: string[]
}

type Reponse = { data: unknown; error: { message: string; code: string } | null }

/** Requête PostgREST : chaque filtre rend la requête ; `await` ou `maybeSingle` la lit. */
export interface FausseRequete extends PromiseLike<Reponse> {
  select: (colonnes?: string) => FausseRequete
  eq: (colonne: string, valeur: unknown) => FausseRequete
  neq: (colonne: string, valeur: unknown) => FausseRequete
  gt: (colonne: string, valeur: unknown) => FausseRequete
  gte: (colonne: string, valeur: unknown) => FausseRequete
  lt: (colonne: string, valeur: unknown) => FausseRequete
  lte: (colonne: string, valeur: unknown) => FausseRequete
  in: (colonne: string, valeurs: unknown[]) => FausseRequete
  is: (colonne: string, valeur: unknown) => FausseRequete
  not: (colonne: string, operateur: string, valeur: unknown) => FausseRequete
  or: (filtres: string) => FausseRequete
  upsert: (valeurs: unknown, options?: unknown) => FausseRequete
  filter: (colonne: string, operateur: string, valeur: unknown) => FausseRequete
  match: (criteres: Record<string, unknown>) => FausseRequete
  order: (colonne: string, options?: unknown) => FausseRequete
  limit: (nombre: number) => FausseRequete
  range: (debut: number, fin: number) => FausseRequete
  abortSignal: (signal: AbortSignal) => FausseRequete
  maybeSingle: () => Promise<Reponse>
  single: () => Promise<Reponse>
}

export function fauxSupabase(scenario: ScenarioSession = {}) {
  const utilisateur = scenario.utilisateur ?? null
  const niveau = scenario.niveau ?? { currentLevel: 'aal1', nextLevel: 'aal1' }
  const facteurs = (scenario.facteursVerifies ?? []).map((id) => ({
    id,
    factor_type: 'totp',
    status: 'verified',
  }))

  const tables: string[] = []
  const eq = vi.fn<(colonne: string, valeur: unknown) => void>()
  /** Colonnes demandées (`select`) et filtres posés (`eq`, `neq`, `or`), par table lue. */
  const selections: { table: string; colonnes: string }[] = []
  const filtres: {
    table: string
    operateur: 'eq' | 'neq' | 'or'
    colonne: string
    valeur: unknown
  }[] = []

  // Déclaration de la session : `declarer_intervenant` la remplace, comme la base (T56, T63), pour
  // que la session relue après « Continuer » voie le nouveau prénom, déclaré aujourd'hui.
  let declaration =
    scenario.declaration === undefined ? { id: 1, prenom: 'Marie' } : scenario.declaration

  // Personnes qui ont accepté la version courante (T61), quand le test les donne.
  const ontAccepte =
    scenario.prenomsAyantAccepte === undefined
      ? null
      : new Set(scenario.prenomsAyantAccepte.map((prenom) => prenom.toLowerCase()))

  /** Réponse de `conditions_acceptees` pour la personne déclarée sur la session. */
  function personneAAccepte(): boolean {
    if (ontAccepte === null) return scenario.conditionsAcceptees ?? true
    return declaration !== null && ontAccepte.has(declaration.prenom.toLowerCase())
  }

  function lignesDe(table: string): unknown[] {
    if (table === 'compte') return scenario.compte ? [scenario.compte] : []
    if (table === 'acceptation_conditions') {
      return (scenario.conditionsAcceptees ?? true) ? [{ id: 'acceptation-1' }] : []
    }
    if (table === 'v_ma_declaration') {
      return declaration ? [{ du_jour: true, ...declaration }] : []
    }
    return scenario.lignes?.[table] ?? []
  }

  function requete(table: string): FausseRequete {
    const echec = scenario.enEchec?.includes(table) ?? false
    const repondre = (data: unknown): Promise<Reponse> =>
      Promise.resolve(
        echec
          ? { data: null, error: { message: 'Lecture refusée (test).', code: 'PGRST000' } }
          : { data, error: null },
      )
    const lignes = lignesDe(table)
    const suite = () => fausse
    const fausse: FausseRequete = {
      select: (colonnes) => {
        selections.push({ table, colonnes: colonnes ?? '*' })
        return fausse
      },
      eq: (colonne, valeur) => {
        eq(colonne, valeur)
        filtres.push({ table, operateur: 'eq', colonne, valeur })
        return fausse
      },
      neq: (colonne, valeur) => {
        filtres.push({ table, operateur: 'neq', colonne, valeur })
        return fausse
      },
      gt: suite,
      gte: suite,
      lt: suite,
      lte: suite,
      in: suite,
      is: suite,
      not: suite,
      or: (valeurs) => {
        filtres.push({ table, operateur: 'or', colonne: '', valeur: valeurs })
        return fausse
      },
      upsert: suite,
      filter: suite,
      match: suite,
      order: suite,
      limit: suite,
      range: suite,
      abortSignal: suite,
      maybeSingle: () => repondre(lignes[0] ?? null),
      single: () => repondre(lignes[0] ?? null),
      then: (siReponse, siErreur) => repondre(lignes).then(siReponse, siErreur),
    }
    return fausse
  }

  const from = vi.fn((table: string) => {
    // L'acceptation des conditions est lue par la session en aal2 (T53 ; par personne pour un
    // ministère, T61, par `conditions_acceptees`), la déclaration et le jour d'utilisation d'un
    // compte de ministère aussi (T56) : `tables` ne note que les lectures de données, que les
    // tests comparent ; `from` garde la trace de celles-ci.
    const lecturesDeSession = ['acceptation_conditions', 'v_ma_declaration', 'passage']
    if (!lecturesDeSession.includes(table)) {
      tables.push(table)
    }
    return requete(table)
  })

  const auth = {
    getSession: vi.fn(() =>
      Promise.resolve({
        data: {
          session: utilisateur ? { user: { id: utilisateur.id, email: utilisateur.email } } : null,
        },
        error: null,
      }),
    ),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    mfa: {
      getAuthenticatorAssuranceLevel: vi.fn(() => Promise.resolve({ data: niveau, error: null })),
      listFactors: vi.fn(() =>
        Promise.resolve({ data: { all: facteurs, totp: facteurs, phone: [] }, error: null }),
      ),
      unenroll: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      enroll: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'facteur-nouveau',
            type: 'totp',
            totp: {
              qr_code: 'data:image/svg+xml;utf-8,<svg></svg>',
              secret: 'JBSWY3DPEHPK3PXP',
              uri: '',
            },
          },
          error: null,
        }),
      ),
      challengeAndVerify: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  }

  const rpc = vi.fn<(nom: string, args?: unknown) => Promise<Reponse>>((nom, args) => {
    if (nom === 'declarer_intervenant') {
      const { p_prenom: prenom } = args as { p_prenom: string }
      declaration = { id: (declaration?.id ?? 0) + 1, prenom, du_jour: true }
    }
    if (nom === 'accepter_conditions' && ontAccepte !== null && declaration !== null) {
      ontAccepte.add(declaration.prenom.toLowerCase())
    }
    return Promise.resolve({ data: null, error: null })
  })

  /**
   * Question de la session d'un compte de ministère (T61), notée à part comme les autres lectures
   * de session : `rpc` ne garde que les écritures, que les tests comparent.
   */
  const questions = vi.fn<(nom: string, args?: unknown) => Promise<Reponse>>(() =>
    Promise.resolve(
      scenario.enEchec?.includes('conditions_acceptees')
        ? { data: null, error: { message: 'Lecture refusée (test).', code: 'PGRST000' } }
        : { data: personneAAccepte(), error: null },
    ),
  )
  const appeler = (nom: string, args?: unknown) =>
    nom === 'conditions_acceptees' ? questions(nom, args) : rpc(nom, args)

  /** Une autre déclaration sur la même session (un deuxième onglet, « Ce n'est pas moi »). */
  function declarerAilleurs(prenom: string) {
    declaration = { id: (declaration?.id ?? 0) + 1, prenom, du_jour: true }
  }

  /**
   * Client pour un test qui répond lui-même aux fonctions de la base : ses appels passent par
   * `autreRpc`, sauf la question de la session (`conditions_acceptees`, T61), qui reste celle du
   * faux.
   */
  function clientAvecRpc(autreRpc: (nom: string, args: unknown) => unknown) {
    return {
      from,
      auth,
      rpc: (nom: string, args?: unknown) =>
        nom === 'conditions_acceptees' ? questions(nom, args) : autreRpc(nom, args),
    }
  }

  return {
    clientAvecRpc,
    client: { from, auth, rpc: appeler },
    tables,
    selections,
    filtres,
    auth,
    from,
    eq,
    rpc,
    questions,
    declarerAilleurs,
  }
}
