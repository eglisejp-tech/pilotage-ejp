import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReponseFausse } from '@/test/fauxRequete'
import { fauxRequete } from '@/test/fauxRequete'
import {
  changerStatutPoint,
  creerPoint,
  marquerTraite,
  messageDeRefusPoint,
  MESSAGES_POINT,
  schemaBaseNouveauPoint,
  schemaCommentaireTraiteMinistere,
} from './pointsEcriture'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const POINT = '30000000-0000-4000-8000-000000000001'
const MINISTERE = '10000000-0000-4000-8000-000000000002'

/** Faux client : `rpc` pour les fonctions de la base, `from` pour vérifier qu'on n'écrit jamais en direct. */
function installer(rpc: ReponseFausse = { data: null, error: null }) {
  const faux = fauxRequete()
  const appelRpc = vi.fn<(nom: string, args: unknown) => Promise<ReponseFausse>>(() =>
    Promise.resolve(rpc),
  )
  courant.client = { from: faux.client.from, rpc: appelRpc }
  return { ...faux, rpc: appelRpc }
}

beforeEach(() => {
  courant.client = undefined
})

describe('creerPoint', () => {
  it('appelle creer_point avec ses six arguments et rend l’identifiant', async () => {
    const faux = installer({ data: POINT, error: null })
    const id = await creerPoint({
      titre: '  Salle pour la soirée  ',
      description: 'Il faut une salle de 80 places.',
      attendu: 'Une réponse',
      priorite: 'haute',
      echeance: '2026-10-12',
      mentions: [MINISTERE, MINISTERE],
    })
    expect(id).toBe(POINT)
    expect(faux.rpc).toHaveBeenCalledWith('creer_point', {
      p_titre: 'Salle pour la soirée',
      p_description: 'Il faut une salle de 80 places.',
      p_action_attendue: 'Une réponse',
      p_priorite: 'haute',
      p_echeance: '2026-10-12',
      p_mentions: [MINISTERE],
    })
    // Jamais d'ajout direct dans point_attention, point_mention ni point_suivi.
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('envoie null pour une description, une action et une échéance absentes', async () => {
    const faux = installer({ data: POINT, error: null })
    await creerPoint({
      titre: 'Clés',
      description: null,
      attendu: null,
      priorite: 'normale',
      echeance: null,
      mentions: [],
    })
    expect(faux.rpc).toHaveBeenCalledWith('creer_point', {
      p_titre: 'Clés',
      p_description: null,
      p_action_attendue: null,
      p_priorite: 'normale',
      p_echeance: null,
      p_mentions: [],
    })
  })

  it('lit les textes facultatifs comme la base : bords retirés, vide devenu null', async () => {
    const faux = installer({ data: POINT, error: null })
    await creerPoint({
      titre: 'Clés',
      description: '   ',
      attendu: `  ${'x'.repeat(80)}  `,
      priorite: 'normale',
      echeance: null,
      mentions: [],
    })
    expect(faux.rpc).toHaveBeenCalledWith(
      'creer_point',
      expect.objectContaining({ p_description: null, p_action_attendue: 'x'.repeat(80) }),
    )
  })

  it('refuse avant tout appel un titre vide ou trop long, une priorité inconnue, une mention fausse', async () => {
    const faux = installer()
    const valide = {
      titre: 'Clés',
      description: null,
      attendu: null,
      priorite: 'normale' as const,
      echeance: null,
      mentions: [],
    }
    await expect(creerPoint({ ...valide, titre: '   ' })).rejects.toThrow()
    await expect(creerPoint({ ...valide, titre: 'x'.repeat(81) })).rejects.toThrow()
    await expect(creerPoint({ ...valide, description: 'x'.repeat(281) })).rejects.toThrow()
    await expect(creerPoint({ ...valide, attendu: 'x'.repeat(81) })).rejects.toThrow()
    await expect(creerPoint({ ...valide, echeance: '12/10/2026' })).rejects.toThrow()
    await expect(creerPoint({ ...valide, mentions: ['social'] })).rejects.toThrow()
    await expect(
      creerPoint({ ...valide, priorite: 'critique' as unknown as 'normale' }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: MESSAGES_POINT.refus.echeancePassee }
    installer({ data: null, error: refus })
    await expect(
      creerPoint({
        titre: 'Clés',
        description: null,
        attendu: null,
        priorite: 'normale',
        echeance: '2026-10-01',
        mentions: [],
      }),
    ).rejects.toBe(refus)
  })

  it('le schéma garde 80 caractères pour le titre', () => {
    const base = {
      description: null,
      attendu: null,
      priorite: 'normale',
      echeance: null,
      mentions: [],
    }
    expect(schemaBaseNouveauPoint.safeParse({ ...base, titre: 'x'.repeat(80) }).success).toBe(true)
    expect(schemaBaseNouveauPoint.safeParse({ ...base, titre: 'x'.repeat(81) }).success).toBe(false)
  })
})

describe('changerStatutPoint', () => {
  it('appelle changer_statut_point, jamais une mise à jour directe', async () => {
    const faux = installer()
    await changerStatutPoint(POINT, 'attente_decision')
    expect(faux.rpc).toHaveBeenCalledWith('changer_statut_point', {
      p_point_id: POINT,
      p_statut: 'attente_decision',
    })
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('refuse « traite » (il passe par marquer_traite) et un identifiant faux', async () => {
    const faux = installer()
    await expect(changerStatutPoint(POINT, 'traite' as unknown as 'en_cours')).rejects.toThrow()
    await expect(changerStatutPoint('1', 'en_cours')).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: MESSAGES_POINT.refus.pointTraiteStatut }
    installer({ data: null, error: refus })
    await expect(changerStatutPoint(POINT, 'en_cours')).rejects.toBe(refus)
  })
})

describe('marquerTraite', () => {
  it('envoie le commentaire du ministère', async () => {
    const faux = installer()
    await marquerTraite(POINT, 'Salle réservée pour le 10 octobre.')
    expect(faux.rpc).toHaveBeenCalledWith('marquer_traite', {
      p_point_id: POINT,
      p_commentaire: 'Salle réservée pour le 10 octobre.',
    })
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('envoie null quand le berger ou le conseil n’écrit rien', async () => {
    const faux = installer()
    await marquerTraite(POINT, null)
    expect(faux.rpc).toHaveBeenCalledWith('marquer_traite', {
      p_point_id: POINT,
      p_commentaire: null,
    })
  })

  it('envoie null pour un commentaire fait d’espaces, et le commentaire sans ses bords', async () => {
    const faux = installer()
    await marquerTraite(POINT, '   ')
    expect(faux.rpc).toHaveBeenLastCalledWith('marquer_traite', {
      p_point_id: POINT,
      p_commentaire: null,
    })
    await marquerTraite(POINT, `  ${'x'.repeat(280)}  `)
    expect(faux.rpc).toHaveBeenLastCalledWith('marquer_traite', {
      p_point_id: POINT,
      p_commentaire: 'x'.repeat(280),
    })
  })

  it('refuse un commentaire de plus de 280 caractères avant tout appel', async () => {
    const faux = installer()
    await expect(marquerTraite(POINT, 'x'.repeat(281))).rejects.toThrow()
    await expect(marquerTraite('1', null)).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: '42501', message: MESSAGES_POINT.refus.acces }
    installer({ data: null, error: refus })
    await expect(marquerTraite(POINT, null)).rejects.toBe(refus)
  })
})

describe('schemaCommentaireTraiteMinistere', () => {
  it('demande 10 à 280 caractères une fois les bords retirés, avec les messages de la base', () => {
    const court = schemaCommentaireTraiteMinistere.safeParse(`  ${'x'.repeat(9)}  `)
    expect(court.success).toBe(false)
    expect(court.error?.issues[0]?.message).toBe(MESSAGES_POINT.refus.commentaireCourt)
    const long = schemaCommentaireTraiteMinistere.safeParse('x'.repeat(281))
    expect(long.error?.issues[0]?.message).toBe(MESSAGES_POINT.refus.commentaireLong)
    expect(schemaCommentaireTraiteMinistere.parse(` ${'x'.repeat(10)} `)).toBe('x'.repeat(10))
    expect(schemaCommentaireTraiteMinistere.safeParse('x'.repeat(280)).success).toBe(true)
  })
})

describe('messageDeRefusPoint', () => {
  it('montre telle quelle une erreur de saisie de la base (P0001)', () => {
    expect(
      messageDeRefusPoint({ code: 'P0001', message: MESSAGES_POINT.refus.commentaireCourt }),
    ).toBe('Expliquez ce qui a été traité et comment (10 caractères au moins).')
  })

  it('dit seulement que le point n’est pas accessible pour un refus de droit (42501)', () => {
    expect(messageDeRefusPoint({ code: '42501', message: 'autre texte interne' })).toBe(
      "Ce point n'existe pas ou vous n'y avez pas accès.",
    )
  })

  it('garde le refus de création réservée aux ministères, et tait la double authentification', () => {
    expect(
      messageDeRefusPoint({ code: '42501', message: MESSAGES_POINT.refus.creationReservee }),
    ).toBe('Seul un compte de ministère peut créer un point.')
    expect(
      messageDeRefusPoint({ code: '42501', message: 'Double authentification requise.' }),
    ).toBe(MESSAGES_POINT.refus.acces)
  })

  it('rend null pour une panne de connexion ou une erreur inconnue', () => {
    expect(messageDeRefusPoint(new Error('Failed to fetch'))).toBeNull()
    expect(messageDeRefusPoint({ code: '57014', message: 'timeout' })).toBeNull()
    expect(messageDeRefusPoint(null)).toBeNull()
    expect(messageDeRefusPoint('boom')).toBeNull()
  })

  it('les messages de réussite sont ceux du plan', () => {
    expect(MESSAGES_POINT.reussite.creation).toBe('Point créé.')
    expect(MESSAGES_POINT.reussite.traite).toBe('Point marqué traité.')
    expect(MESSAGES_POINT.reussite.statut('En cours')).toBe('Statut enregistré : En cours.')
  })
})
