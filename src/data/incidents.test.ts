import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { envoyer, surEchecEnvoi } from '@/data/envoi'
import type { EchecVu } from '@/data/envoi'
import {
  ECRANS_INCIDENT,
  ecranDe,
  incidentDepuisEchec,
  navigateurDe,
  OPERATIONS_INCIDENT,
  operationDe,
} from '@/data/incidents'
import { ADRESSES_APPLICATION } from '@/features/navigation/profils'
import { PAGES_DES_ADRESSES } from '@/pages/pagesDesAdresses'
import { CODES_FONCTIONS } from '@/lib/fileIncidents'
import { supabase } from '@/lib/supabase'

// Incidents d'envoi (T76, lot C ; conception erreurs-envoi, 6.1 et 14, tests 16 et 17). Le cas
// réel d'abord : l'ajout d'événement de Coordination resté sans réponse devient un incident
// « Pas de réponse, issue inconnue », sans rien de ce qui a été saisi.

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const TEMOIN = 'Texte témoin du formulaire'

const CONTEXTE = {
  chemin: '/saisir/evenement',
  userAgent: IPHONE,
  visible: true,
  maintenant: new Date('2026-10-26T11:37:00Z'),
}

/** L'ajout de Coordination, envoyé par `envoyer` avec un fetch simulé ; rend l'échec vu. */
async function echecDeLAjout(repondre: () => Promise<Response>): Promise<EchecVu> {
  vi.stubGlobal('fetch', vi.fn(repondre))
  let vu: EchecVu | undefined
  const desabonner = surEchecEnvoi((echec) => {
    vu = echec
  })
  await envoyer('rpc/ajouter_evenement', () =>
    supabase().rpc('ajouter_evenement', {
      p_titre: TEMOIN,
      p_date: '2026-10-26',
      p_statut: 'attente_validation',
      p_mentions: [],
      p_heure_prevue: null,
      p_cle: 'a1000000-0000-4000-8000-000000000001',
    }),
  )
  desabonner()
  if (!vu) throw new Error('aucun échec vu')
  return vu
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('incidentDepuisEchec', () => {
  it('le cas réel : « Load failed » sans réponse, un incident « Pas de réponse, issue inconnue »', async () => {
    const echec = await echecDeLAjout(() => Promise.reject(new TypeError('Load failed')))
    const incident = incidentDepuisEchec(echec, CONTEXTE)
    expect(incident).toMatchObject({
      reference: echec.suivi.reference,
      survenu_le: '2026-10-26T11:37:00.000Z',
      ecran: '/saisir/evenement',
      operation: 'ajouter_evenement',
      genre: 'sans_reponse',
      issue: 'inconnue',
      rattrape: false,
      statut_http: null,
      code: null,
      nom_erreur: 'TypeError',
      en_ligne: true,
      visible: true,
      navigateur: 'safari',
      version_navigateur: 26,
      systeme: 'ios',
    })
    expect(incident?.version).toMatch(/^([0-9a-f]{7}|local)$/)
  })

  it('rien de ce qui a été saisi, aucun message d’erreur, aucune adresse complète', async () => {
    const echec = await echecDeLAjout(() => Promise.reject(new TypeError('Load failed')))
    const incident = incidentDepuisEchec(echec, {
      ...CONTEXTE,
      chemin: '/ministeres/10000000-0000-4000-8000-000000000001',
    })
    const texte = JSON.stringify(incident)
    expect(texte).not.toContain(TEMOIN)
    expect(texte).not.toContain('Load failed')
    expect(texte).not.toContain('10000000-0000-4000-8000-000000000001')
    expect(texte).not.toContain('Mozilla')
    expect(incident?.ecran).toBe('/ministeres/:id')
  })

  it('un refus inattendu garde son code et son statut, jamais son message', async () => {
    const echec = await echecDeLAjout(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: '23505', message: 'duplicate key value' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const incident = incidentDepuisEchec(echec, CONTEXTE)
    expect(incident).toMatchObject({ genre: 'refus_inconnu', code: '23505', statut_http: 409 })
    expect(JSON.stringify(incident)).not.toContain('duplicate')
  })

  it('un refus que la base a dit n’est pas un incident', async () => {
    const echec = await echecDeLAjout(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: 'P0001', message: 'La date ne peut pas être passée.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    expect(incidentDepuisEchec(echec, CONTEXTE)).toBeNull()
  })

  it('une connexion expirée en est un (il partira après la reconnexion)', async () => {
    const echec = await echecDeLAjout(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: '42501', message: 'Double authentification requise.' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )
    expect(incidentDepuisEchec(echec, CONTEXTE)).toMatchObject({ genre: 'session' })
  })
})

describe('listes fermées', () => {
  it('ecranDe : le modèle d’adresse, sinon « autre »', () => {
    expect(ecranDe('/saisir/evenement')).toBe('/saisir/evenement')
    expect(ecranDe('/saisir/evenement/42000000-0000-4000-8000-000000000001')).toBe(
      '/saisir/evenement/:id',
    )
    expect(ecranDe('/')).toBe('/')
    expect(ecranDe('/adresse/inconnue')).toBe('autre')
  })

  it('operationDe : le nom de l’écriture, sinon « autre »', () => {
    expect(operationDe('rpc/ajouter_evenement')).toBe('ajouter_evenement')
    expect(operationDe('table/mesure')).toBe('mesure')
    expect(operationDe('functions/creer-compte')).toBe('creer-compte')
    expect(operationDe('rpc/inconnue')).toBe('autre')
  })

  it('navigateurDe : famille, version majeure et système, jamais l’user agent', () => {
    expect(navigateurDe(IPHONE)).toEqual({
      navigateur: 'safari',
      version_navigateur: 26,
      systeme: 'ios',
    })
    expect(
      navigateurDe(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
      ),
    ).toEqual({ navigateur: 'edge', version_navigateur: 140, systeme: 'windows' })
    expect(
      navigateurDe(
        'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
      ),
    ).toEqual({ navigateur: 'samsung', version_navigateur: 27, systeme: 'android' })
    expect(
      navigateurDe(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0',
      ),
    ).toEqual({ navigateur: 'firefox', version_navigateur: 131, systeme: 'macos' })
  })

  // Test 17 de la conception : la base et l'écran ont les mêmes listes, et chaque adresse de
  // l'application y est (sinon ses incidents arriveraient en « autre »).
  const MIGRATIONS = import.meta.glob<string>('../../supabase/migrations/*.sql', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  /** Les valeurs du tableau de la dernière définition d'une fonction de liste. */
  function listeSql(fonction: string): string[] {
    const definitions = Object.keys(MIGRATIONS)
      .sort()
      .flatMap((fichier) => {
        const source = MIGRATIONS[fichier] ?? ''
        const motif = new RegExp(
          `function private\\.${fonction}\\(\\)[\\s\\S]*?select array\\[([\\s\\S]*?)\\]`,
          'g',
        )
        return Array.from(source.matchAll(motif), (trouve) => trouve[1] ?? '')
      })
    const derniere = definitions.at(-1) ?? ''
    return Array.from(derniere.matchAll(/'([^']*)'/g), (valeur) => valeur[1] ?? '')
  }

  it('la liste des écrans est celle de la base', () => {
    expect(listeSql('ecrans_incident')).toEqual([...ECRANS_INCIDENT])
  })

  it('la liste des opérations est celle de la base', () => {
    expect(listeSql('operations_incident')).toEqual([...OPERATIONS_INCIDENT])
  })

  it('la liste des codes d’Edge Function est celle de la base', () => {
    expect(listeSql('codes_incident')).toEqual([...CODES_FONCTIONS])
  })

  it('chaque adresse de l’application est dans la liste des écrans', () => {
    const ecrans = new Set<string>(ECRANS_INCIDENT)
    const adresses = [
      ...ADRESSES_APPLICATION.map((adresse) => adresse.chemin),
      ...Object.keys(PAGES_DES_ADRESSES),
    ]
    expect(adresses.filter((adresse) => !ecrans.has(adresse))).toEqual([])
  })
})
