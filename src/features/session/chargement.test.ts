import { AuthApiError } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  chargerEtatSession,
  chargerEtatSessionSuivi,
  DELAI_MAX_SESSION,
  INTERVALLE_VERIFICATION_SESSION,
  MESSAGE_PASSAGE_NON_NOTE,
  verifierSessionChangee,
} from '@/features/session/chargement'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'
import { clientRequetes, CLE_SESSION, estDelaiDepasse } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

function installer(scenario: ScenarioSession) {
  const faux = fauxSupabase(scenario)
  courant.client = faux.client
  return faux
}

const berger: NonNullable<ScenarioSession['compte']> = {
  user_id: 'u-berger',
  type: 'berger',
  ministere_id: null,
  libelle: 'Berger',
  desactive_le: null,
}
const utilisateur = { id: 'u-berger', email: 'berger@exemple.test' }

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('chargerEtatSessionSuivi', () => {
  it('abandonne après 10 s : la page passe à son erreur au lieu de charger sans fin', async () => {
    vi.useFakeTimers()
    const faux = installer({})
    faux.auth.getSession.mockReturnValueOnce(new Promise(() => undefined))
    const lecture = chargerEtatSessionSuivi()
    const verification = expect(lecture).rejects.toThrow('Lecture de la session trop longue.')
    await vi.advanceTimersByTimeAsync(DELAI_MAX_SESSION)
    await verification
    // Reconnue comme un délai dépassé : l'écran d'erreur le dit (m252).
    expect(estDelaiDepasse(await lecture.catch((erreur: unknown) => erreur))).toBe(true)
  })
})

describe('verifierSessionChangee (connexion expirée, m271)', () => {
  afterEach(() => vi.restoreAllMocks())

  // Une heure fictive par test, espacées de plus que l'intervalle : chaque test vérifie.
  let heure = Date.UTC(2026, 9, 13, 8)
  function nouvelleHeure() {
    heure += 10 * INTERVALLE_VERIFICATION_SESSION
    vi.useFakeTimers({ now: heure, toFake: ['Date'] })
  }

  it('session révoquée sur le serveur : oubliée sur cet appareil, puis l’état est relu', async () => {
    nouvelleHeure()
    const faux = installer({ utilisateur, compte: berger })
    faux.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthApiError('Session not found', 403, 'session_not_found'),
    })
    const relecture = vi.spyOn(clientRequetes, 'invalidateQueries')
    await verifierSessionChangee()
    expect(faux.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(relecture).toHaveBeenCalledWith({ queryKey: CLE_SESSION })
  })

  it('session encore bonne (jeton renouvelé) : pas de déconnexion, l’état est relu', async () => {
    nouvelleHeure()
    const faux = installer({ utilisateur, compte: berger })
    const relecture = vi.spyOn(clientRequetes, 'invalidateQueries')
    await verifierSessionChangee()
    expect(faux.auth.getUser).toHaveBeenCalledTimes(1)
    expect(faux.auth.signOut).not.toHaveBeenCalled()
    expect(relecture).toHaveBeenCalledWith({ queryKey: CLE_SESSION })
  })

  it('Auth sans réponse : l’état est relu quand même, sans erreur', async () => {
    nouvelleHeure()
    const faux = installer({ utilisateur, compte: berger })
    faux.auth.getUser.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const relecture = vi.spyOn(clientRequetes, 'invalidateQueries')
    await expect(verifierSessionChangee()).resolves.toBeUndefined()
    expect(faux.auth.signOut).not.toHaveBeenCalled()
    expect(relecture).toHaveBeenCalledWith({ queryKey: CLE_SESSION })
  })

  it('une seule vérification par intervalle, même si l’écran relit son erreur', async () => {
    nouvelleHeure()
    const faux = installer({ utilisateur, compte: berger })
    await verifierSessionChangee()
    await verifierSessionChangee()
    expect(faux.auth.getUser).toHaveBeenCalledTimes(1)
    vi.setSystemTime(heure + INTERVALLE_VERIFICATION_SESSION)
    await verifierSessionChangee()
    expect(faux.auth.getUser).toHaveBeenCalledTimes(2)
  })
})

describe('chargerEtatSession', () => {
  it('sans session : anonyme, sans aucune requête de données', async () => {
    const faux = installer({})
    expect(await chargerEtatSession()).toEqual({ statut: 'anonyme' })
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('lit sa propre ligne de compte, filtrée sur son identifiant', async () => {
    const faux = installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    })
    const etat = await chargerEtatSession()
    expect(etat).toMatchObject({
      statut: 'connecte',
      compte: { type: 'berger', libelle: 'Berger', actif: true },
    })
    // La ligne de compte, puis (en aal2 seulement) l'acceptation de la version courante.
    expect(faux.tables).toEqual(['compte'])
    expect(faux.from).toHaveBeenCalledWith('acceptation_conditions')
    expect(faux.eq).toHaveBeenCalledWith('user_id', 'u-berger')
    expect(faux.eq).toHaveBeenCalledWith('compte', 'u-berger')
    expect(faux.eq).toHaveBeenCalledWith('version', VERSION_CONDITIONS)
    // En aal2, la liste des facteurs ne sert pas.
    expect(faux.auth.mfa.listFactors).not.toHaveBeenCalled()
  })

  it('aal2 sans acceptation de la version courante : conditions', async () => {
    installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
      conditionsAcceptees: false,
    })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'conditions' })
  })

  it("aal1 : l'acceptation n'est pas lue (elle exige aal2)", async () => {
    const faux = installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal1', nextLevel: 'aal2' },
      facteursVerifies: ['f1'],
    })
    await chargerEtatSession()
    expect(faux.from).not.toHaveBeenCalledWith('acceptation_conditions')
  })

  it('aal1 avec un facteur vérifié : code, sur le premier facteur', async () => {
    installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal1', nextLevel: 'aal2' },
      facteursVerifies: ['f1', 'f2'],
    })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'code', facteurId: 'f1' })
  })

  it('aal1 sans facteur : activation', async () => {
    installer({ utilisateur, compte: berger })
    expect((await chargerEtatSession()).statut).toBe('activation')
  })

  it('compte désactivé ou absent : désactivé', async () => {
    installer({ utilisateur, compte: { ...berger, desactive_le: '2026-09-01T10:00:00Z' } })
    expect(await chargerEtatSession()).toEqual({ statut: 'desactive' })
    installer({ utilisateur, compte: null })
    expect(await chargerEtatSession()).toEqual({ statut: 'desactive' })
  })

  it('session révoquée par le serveur : déconnexion locale, puis anonyme', async () => {
    const faux = installer({
      utilisateur,
      compte: berger,
      niveau: { currentLevel: 'aal1', nextLevel: 'aal2' },
    })
    faux.auth.mfa.listFactors.mockResolvedValueOnce({
      data: null as never,
      error: new AuthApiError('Session not found', 403, 'session_not_found') as never,
    })
    expect(await chargerEtatSession()).toEqual({ statut: 'anonyme' })
    expect(faux.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('panne réseau : erreur, pour que la page propose « Réessayer »', async () => {
    const faux = installer({ utilisateur, compte: berger })
    faux.auth.mfa.getAuthenticatorAssuranceLevel.mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    )
    await expect(chargerEtatSession()).rejects.toThrow('Failed to fetch')
  })
})

// Personne qui utilise un compte de ministère (T56).
describe('chargerEtatSession : « Qui utilise l’outil ? »', () => {
  const ministere: NonNullable<ScenarioSession['compte']> = {
    user_id: 'u-com',
    type: 'ministere',
    ministere_id: 'm-com',
    libelle: 'Ministère Communication',
    desactive_le: null,
  }
  const session = {
    utilisateur: { id: 'u-com', email: 'communication@exemple.test' },
    compte: ministere,
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
  } as const

  it('ministère déclaré : connecté avec son prénom, et le jour d’utilisation noté', async () => {
    const faux = installer({
      ...session,
      declaration: { id: 7, prenom: 'Marie D.' },
    })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'connecte', prenom: 'Marie D.' })
    expect(faux.from).toHaveBeenCalledWith('v_ma_declaration')
    expect(faux.from).toHaveBeenCalledWith('passage')
    // Ni l'une ni l'autre n'est une lecture de données de l'écran.
    expect(faux.tables).toEqual(['compte'])
  })

  it('jour d’utilisation refusé : l’outil s’ouvre, la console le signale sans prénom', async () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    installer({
      ...session,
      declaration: { id: 7, prenom: 'Marie D.' },
      enEchec: ['passage'],
    })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'connecte', prenom: 'Marie D.' })
    await vi.waitFor(() =>
      expect(avertir).toHaveBeenCalledWith(MESSAGE_PASSAGE_NON_NOTE, 'PGRST000'),
    )
    expect(JSON.stringify(avertir.mock.calls)).not.toContain('Marie')
    avertir.mockRestore()
  })

  it('ministère sans déclaration sur cette session : déclaration, sans jour d’utilisation', async () => {
    const faux = installer({ ...session, declaration: null })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'declaration', declaration: null })
    expect(faux.from).not.toHaveBeenCalledWith('passage')
  })

  it('déclaration d’un jour précédent (jour de Paris, lu dans la base) : la question revient (T63)', async () => {
    const faux = installer({ ...session, declaration: { id: 7, prenom: 'Marie', du_jour: false } })
    expect(await chargerEtatSession()).toMatchObject({
      statut: 'declaration',
      declaration: { id: 7, prenom: 'Marie', duJour: false },
    })
    expect(faux.selections).toContainEqual({
      table: 'v_ma_declaration',
      colonnes: 'id, prenom, du_jour',
    })
    // Le jour d'utilisation attend la confirmation du prénom (la déclaration le note).
    expect(faux.from).not.toHaveBeenCalledWith('passage')
  })

  it('rappel du jour et nouvelle version : le prénom d’abord, l’acceptation n’est pas lue (T61, T63)', async () => {
    const faux = installer({
      ...session,
      conditionsAcceptees: false,
      declaration: { id: 7, prenom: 'Marie', du_jour: false },
    })
    expect((await chargerEtatSession()).statut).toBe('declaration')
    expect(faux.questions).not.toHaveBeenCalled()
  })

  it('le prénom d’abord : sans déclaration, l’acceptation n’est pas demandée (T61)', async () => {
    const faux = installer({ ...session, conditionsAcceptees: false, declaration: null })
    expect((await chargerEtatSession()).statut).toBe('declaration')
    expect(faux.from).toHaveBeenCalledWith('v_ma_declaration')
    expect(faux.questions).not.toHaveBeenCalled()
    expect(faux.from).not.toHaveBeenCalledWith('acceptation_conditions')
  })

  it('prénom donné : la base dit si cette personne a accepté la version courante (T61)', async () => {
    const faux = installer({
      ...session,
      conditionsAcceptees: false,
      declaration: { id: 9, prenom: 'Paul' },
    })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'conditions', prenom: 'Paul' })
    expect(faux.questions).toHaveBeenCalledWith('conditions_acceptees', {
      p_version: VERSION_CONDITIONS,
    })
    // Ni la table de la personne (EJP Tech seul), ni celle des comptes non partagés.
    expect(faux.from).not.toHaveBeenCalledWith('acceptation_personne')
    expect(faux.from).not.toHaveBeenCalledWith('acceptation_conditions')
    // Pas de jour d'utilisation avant l'outil : la déclaration l'a déjà noté.
    expect(faux.from).not.toHaveBeenCalledWith('passage')
  })

  it('la personne déclarée a déjà accepté, sur cet appareil ou un autre : l’outil (T61)', async () => {
    installer({
      ...session,
      prenomsAyantAccepte: ['marie'],
      declaration: { id: 9, prenom: 'Marie' },
    })
    expect(await chargerEtatSession()).toMatchObject({ statut: 'connecte', prenom: 'Marie' })
  })

  it('la question échoue : l’erreur remonte, l’écran d’erreur s’affiche', async () => {
    installer({
      ...session,
      declaration: { id: 9, prenom: 'Paul' },
      enEchec: ['conditions_acceptees'],
    })
    await expect(chargerEtatSession()).rejects.toMatchObject({ code: 'PGRST000' })
  })

  it('les autres profils : jamais lue, jamais demandée', async () => {
    const faux = installer({
      utilisateur,
      compte: berger,
      niveau: session.niveau,
      declaration: null,
    })
    expect(await chargerEtatSession()).toStrictEqual({
      statut: 'connecte',
      compte: expect.objectContaining({ type: 'berger' }) as unknown,
      email: 'berger@exemple.test',
    })
    expect(faux.from).not.toHaveBeenCalledWith('v_ma_declaration')
    expect(faux.from).not.toHaveBeenCalledWith('passage')
    // Leur acceptation reste par compte (T53).
    expect(faux.from).toHaveBeenCalledWith('acceptation_conditions')
    expect(faux.questions).not.toHaveBeenCalled()
  })
})
