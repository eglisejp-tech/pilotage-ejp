// Réponses communes des Edge Functions de comptes (BRIEF, section 8, « Contrat commun ») :
// { ok: true } ou { erreur: '<code>' }, jamais de détail interne ; en-têtes CORS et OPTIONS.
// Le front traduit chaque code en français.

export const enTetesCors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export type StatutErreur = 400 | 401 | 403 | 405 | 409 | 500

export type CodeErreur =
  | 'requete_invalide'
  | 'methode_non_autorisee'
  | 'non_authentifie'
  | 'double_authentification_requise'
  | 'acces_refuse'
  | 'type_interdit'
  | 'ministere_inconnu'
  | 'compte_inconnu'
  | 'propre_compte'
  | 'adresse_deja_utilisee'
  | 'ministere_a_deja_un_compte'
  | 'nom_ministere_deja_pris'
  | 'berger_deja_actif'
  | 'compte_desactive'
  | 'compte_actif'
  | 'invitation_deja_acceptee'
  | 'invitation_trop_recente'
  | 'conflit'
  | 'invitation_non_envoyee'
  | 'erreur_interne'

// Refus attendu : il devient une réponse { erreur } avec son statut.
export class ErreurFonction extends Error {
  readonly statut: StatutErreur
  readonly code: CodeErreur

  constructor(statut: StatutErreur, code: CodeErreur) {
    super(code)
    this.name = 'ErreurFonction'
    this.statut = statut
    this.code = code
  }
}

function reponseJson(statut: number, corps: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      ...enTetesCors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function reponseOk(): Response {
  return reponseJson(200, { ok: true })
}

export function reponseErreur(erreur: ErreurFonction): Response {
  return reponseJson(erreur.statut, { erreur: erreur.code })
}

export function reponsePreliminaire(): Response {
  return new Response(null, { status: 204, headers: enTetesCors })
}

// Journal technique de la fonction : le nom de la fonction, l'étape et un code court (code
// d'erreur Auth, SQLSTATE). Jamais de message, d'email, de jeton ni de mot de passe.
export function consigner(fonction: string, etape: string, code?: unknown): void {
  const codeSur = typeof code === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(code) ? code : 'autre'
  console.error(JSON.stringify({ fonction, etape, code: codeSur }))
}
