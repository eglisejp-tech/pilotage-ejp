import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import type { ReponseFausse } from '@/test/fauxRequete'
import {
  ajouterSuggestion,
  lireDecisionsRecentes,
  lireMesIndicateurs,
  lireMesRefus,
  lireMesRetraits,
  lireRetraitsRecents,
  retirerMonIndicateur,
  validerIndicateur,
} from './validationIndicateurs'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const KUMI = '10000000-0000-4000-8000-000000000011'
const INDICATEUR = '00000000-0000-4000-8000-0000000000b1'
const DEMANDE = '00000000-0000-4000-8000-0000000000a1'

/** Faux client : les requêtes de `fauxRequete`, plus `rpc` pour les fonctions de la base. */
function installer(
  reponses: Parameters<typeof fauxRequete>[0] = {},
  rpc: ReponseFausse = { data: null, error: null },
) {
  const faux = fauxRequete(reponses)
  const appelRpc = vi.fn<(nom: string, args: unknown) => Promise<ReponseFausse>>(() =>
    Promise.resolve(rpc),
  )
  courant.client = { from: faux.client.from, rpc: appelRpc }
  return { ...faux, rpc: appelRpc }
}

beforeEach(() => {
  courant.client = undefined
})

describe('ajouterSuggestion', () => {
  it('appelle ajouter_suggestion avec le ministère, le code et le « Pourquoi » sans espaces autour', async () => {
    const faux = installer({}, { data: INDICATEUR, error: null })
    const id = await ajouterSuggestion({
      ministereId: COMMUNICATION,
      code: 'suggestion_demandes_recues',
      pourquoi: '  Voir les demandes de chaque mois.  ',
    })
    expect(id).toBe(INDICATEUR)
    expect(faux.rpc).toHaveBeenCalledWith('ajouter_suggestion', {
      p_ministere_id: COMMUNICATION,
      p_code: 'suggestion_demandes_recues',
      p_pourquoi: 'Voir les demandes de chaque mois.',
    })
    // Jamais d'ajout direct dans `indicateur` ni dans `demande_indicateur`.
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('un « Pourquoi » trop court ou trop long ne part jamais à la base', async () => {
    const faux = installer()
    await expect(
      ajouterSuggestion({ ministereId: COMMUNICATION, code: 'suggestion_x', pourquoi: 'court' }),
    ).rejects.toThrow()
    await expect(
      ajouterSuggestion({
        ministereId: COMMUNICATION,
        code: 'suggestion_x',
        pourquoi: 'a'.repeat(281),
      }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: 'Votre ministère a déjà 3 indicateurs à lui.' }
    installer({}, { data: null, error: refus })
    await expect(
      ajouterSuggestion({
        ministereId: COMMUNICATION,
        code: 'suggestion_x',
        pourquoi: 'Voir les demandes de chaque mois.',
      }),
    ).rejects.toBe(refus)
  })
})

describe('validerIndicateur', () => {
  it('valider : ni motif ni fenêtre, la demande seule', async () => {
    const faux = installer()
    await validerIndicateur({ demandeId: DEMANDE, decision: 'valide' })
    expect(faux.rpc).toHaveBeenCalledWith('valider_indicateur', {
      p_demande_id: DEMANDE,
      p_decision: 'valide',
      p_motif: null,
    })
  })

  it('refuser : le motif sans espaces autour', async () => {
    const faux = installer()
    await validerIndicateur({
      demandeId: DEMANDE,
      decision: 'refuse',
      motif: '  Ce chiffre existe déjà sur la fiche.  ',
    })
    expect(faux.rpc).toHaveBeenCalledWith('valider_indicateur', {
      p_demande_id: DEMANDE,
      p_decision: 'refuse',
      p_motif: 'Ce chiffre existe déjà sur la fiche.',
    })
  })

  it('un refus sans motif valide ne part jamais à la base', async () => {
    const faux = installer()
    await expect(
      validerIndicateur({ demandeId: DEMANDE, decision: 'refuse', motif: 'court' }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('« Cette demande a déjà été décidée. » est relancé tel quel', async () => {
    const refus = { code: 'P0001', message: 'Cette demande a déjà été décidée.' }
    installer({}, { data: null, error: refus })
    await expect(validerIndicateur({ demandeId: DEMANDE, decision: 'valide' })).rejects.toBe(refus)
  })
})

describe('décisions des 30 derniers jours (EJP Tech)', () => {
  it('part du jour de Paris de v_semaine, jamais de la date du navigateur', async () => {
    const faux = installer({
      v_semaine: { data: { aujourdhui: '2026-10-12' }, error: null },
      validation: {
        data: [
          {
            id: 'v1',
            demande_id: DEMANDE,
            ministere_id: KUMI,
            decision: 'refuse',
            motif: 'Ce chiffre existe déjà sur la fiche.',
            saisi_le: '2026-10-08T11:00:00+02:00',
          },
        ],
        error: null,
      },
      demande_indicateur: { data: [{ id: DEMANDE, libelle: 'Demandes reçues' }], error: null },
      ministere: { data: [{ id: KUMI, nom: 'Kumi' }], error: null },
    })
    const decisions = await lireDecisionsRecentes()
    expect(decisions).toEqual([
      {
        validation_id: 'v1',
        ministere_nom: 'Kumi',
        libelle: 'Demandes reçues',
        decision: 'refuse',
        motif: 'Ce chiffre existe déjà sur la fiche.',
        saisi_le: '2026-10-08T11:00:00+02:00',
      },
    ])
    const appels = appelsDe(faux.de('validation')[0])
    // Minuit du 12 septembre, heure de Paris (UTC+2 en été) : un instant, pas une date nue.
    expect(appels[1]).toBe('gte("saisi_le", "2026-09-11T22:00:00.000Z")')
  })

  it('sans décision : aucune autre lecture', async () => {
    const faux = installer({
      v_semaine: { data: { aujourdhui: '2026-10-12' }, error: null },
      validation: { data: [], error: null },
    })
    expect(await lireDecisionsRecentes()).toEqual([])
    expect(faux.de('demande_indicateur')).toHaveLength(0)
  })

  it('sans jour de Paris, la lecture échoue : aucune date inventée', async () => {
    installer({ v_semaine: { data: null, error: null } })
    await expect(lireDecisionsRecentes()).rejects.toThrow()
  })
})

describe('T62 : retrait d’un ajout par son ministère', () => {
  it('appelle retirer_mon_indicateur avec l’indicateur et le motif sans espaces autour', async () => {
    const faux = installer({
      retrait_indicateur: { data: { etat_avant: 'en_attente' }, error: null },
    })
    expect(
      await retirerMonIndicateur({
        indicateurId: INDICATEUR,
        motif: '  Ce chiffre ne nous sert plus.  ',
      }),
    ).toBe('en_attente')
    expect(faux.rpc).toHaveBeenCalledWith('retirer_mon_indicateur', {
      p_indicateur_id: INDICATEUR,
      p_motif: 'Ce chiffre ne nous sert plus.',
    })
    // Jamais d'écriture directe dans `indicateur` ni dans `retrait_indicateur` : une seule
    // lecture, après l'appel, de l'état d'avant le retrait de cet indicateur.
    expect(faux.requetes.map((requete) => requete.table)).toEqual(['retrait_indicateur'])
    expect(appelsDe(faux.de('retrait_indicateur')[0])).toEqual([
      'select("etat_avant")',
      `eq("indicateur_id", "${INDICATEUR}")`,
      'maybeSingle()',
    ])
  })

  it('rend l’état relu dans la base : une demande validée entre-temps dit « actif »', async () => {
    installer({ retrait_indicateur: { data: { etat_avant: 'actif' }, error: null } })
    expect(
      await retirerMonIndicateur({
        indicateurId: INDICATEUR,
        motif: 'Ce chiffre ne nous sert plus.',
      }),
    ).toBe('actif')
  })

  it('une relecture en échec ne fait pas échouer un retrait déjà écrit : null', async () => {
    installer({ retrait_indicateur: { data: null, error: { message: 'Lecture refusée.' } } })
    expect(
      await retirerMonIndicateur({
        indicateurId: INDICATEUR,
        motif: 'Ce chiffre ne nous sert plus.',
      }),
    ).toBeNull()
    installer({ retrait_indicateur: () => Promise.reject(new TypeError('Failed to fetch')) })
    expect(
      await retirerMonIndicateur({
        indicateurId: INDICATEUR,
        motif: 'Ce chiffre ne nous sert plus.',
      }),
    ).toBeNull()
  })

  it('un motif trop court ou trop long ne part jamais à la base', async () => {
    const faux = installer()
    await expect(
      retirerMonIndicateur({ indicateurId: INDICATEUR, motif: 'court' }),
    ).rejects.toThrow()
    await expect(
      retirerMonIndicateur({ indicateurId: INDICATEUR, motif: 'a'.repeat(281) }),
    ).rejects.toThrow()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus de la base est relancé tel quel', async () => {
    const refus = {
      code: 'P0001',
      message: 'Ce chiffre sert au calcul « Taux » : demandez à EJP Tech de le retirer.',
    }
    installer({}, { data: null, error: refus })
    await expect(
      retirerMonIndicateur({ indicateurId: INDICATEUR, motif: 'Ce chiffre ne nous sert plus.' }),
    ).rejects.toBe(refus)
  })

  it('le ministère lit ses retraits avec leur motif', async () => {
    const faux = installer()
    await lireMesRetraits(COMMUNICATION)
    expect(appelsDe(faux.de('retrait_indicateur')[0])).toEqual([
      'select("indicateur_id, etat_avant, motif, saisi_le")',
      `eq("ministere_id", "${COMMUNICATION}")`,
    ])
  })

  it('EJP Tech lit les retraits des 30 derniers jours, à partir du jour de Paris', async () => {
    const VALIDE = '00000000-0000-4000-8000-0000000000b2'
    const faux = installer({
      v_semaine: { data: { aujourdhui: '2026-10-12' }, error: null },
      retrait_indicateur: {
        data: [
          {
            id: 'r1',
            indicateur_id: INDICATEUR,
            ministere_id: KUMI,
            etat_avant: 'en_attente',
            motif: 'Nous le suivons déjà ailleurs.',
            saisi_le: '2026-10-09T17:30:00+02:00',
          },
          {
            id: 'r2',
            indicateur_id: VALIDE,
            ministere_id: KUMI,
            etat_avant: 'actif',
            motif: 'Nous ne le suivons plus.',
            saisi_le: '2026-10-08T10:00:00+02:00',
          },
        ],
        error: null,
      },
      indicateur: {
        data: [
          { id: INDICATEUR, libelle: 'Projets en cours' },
          { id: VALIDE, libelle: 'Demandes reçues' },
        ],
        error: null,
      },
      ministere: { data: [{ id: KUMI, nom: 'Kumi' }], error: null },
      demande_indicateur: {
        data: [{ id: DEMANDE, indicateur_id: INDICATEUR, pourquoi: 'Voir les projets ouverts.' }],
        error: null,
      },
    })
    expect(await lireRetraitsRecents()).toEqual([
      {
        retrait_id: 'r1',
        ministere_nom: 'Kumi',
        libelle: 'Projets en cours',
        etat_avant: 'en_attente',
        motif: 'Nous le suivons déjà ailleurs.',
        saisi_le: '2026-10-09T17:30:00+02:00',
        // La demande a quitté la file d'EJP Tech : son « Pourquoi » se lit et se masque ici.
        demande: { id: DEMANDE, pourquoi: 'Voir les projets ouverts.' },
      },
      {
        retrait_id: 'r2',
        ministere_nom: 'Kumi',
        libelle: 'Demandes reçues',
        etat_avant: 'actif',
        motif: 'Nous ne le suivons plus.',
        saisi_le: '2026-10-08T10:00:00+02:00',
        demande: null,
      },
    ])
    const appels = appelsDe(faux.de('retrait_indicateur')[0])
    // Minuit du 12 septembre, heure de Paris : la même borne que les décisions.
    expect(appels[1]).toBe('gte("saisi_le", "2026-09-11T22:00:00.000Z")')
    // Le « Pourquoi » des seules demandes retirées avant la décision.
    expect(appelsDe(faux.de('demande_indicateur')[0])).toEqual([
      'select("id, indicateur_id, pourquoi")',
      'eq("objet", "ajout")',
      `in("indicateur_id", ["${INDICATEUR}"])`,
    ])
  })

  it('sans demande retirée avant la décision : aucune lecture des demandes', async () => {
    const faux = installer({
      v_semaine: { data: { aujourdhui: '2026-10-12' }, error: null },
      retrait_indicateur: {
        data: [
          {
            id: 'r2',
            indicateur_id: INDICATEUR,
            ministere_id: KUMI,
            etat_avant: 'actif',
            motif: 'Nous ne le suivons plus.',
            saisi_le: '2026-10-08T10:00:00+02:00',
          },
        ],
        error: null,
      },
    })
    expect((await lireRetraitsRecents())[0]?.demande).toBeNull()
    expect(faux.de('demande_indicateur')).toHaveLength(0)
  })

  it('sans retrait : aucune autre lecture ; sans jour de Paris : la lecture échoue', async () => {
    const faux = installer({
      v_semaine: { data: { aujourdhui: '2026-10-12' }, error: null },
      retrait_indicateur: { data: [], error: null },
    })
    expect(await lireRetraitsRecents()).toEqual([])
    expect(faux.de('indicateur')).toHaveLength(0)
    installer({ v_semaine: { data: null, error: null } })
    await expect(lireRetraitsRecents()).rejects.toThrow()
  })
})

describe('lectures du ministère', () => {
  it('« Mes indicateurs » : les définitions de la fiche, jamais une valeur', async () => {
    const faux = installer()
    await lireMesIndicateurs(COMMUNICATION)
    expect(appelsDe(faux.de('indicateur')[0])).toEqual([
      'select("id, libelle, definition, nature, calcul, etat, origine, modele_code, cree_le, retire_le, retrait_motif")',
      `eq("ministere_id", "${COMMUNICATION}")`,
    ])
    expect(faux.de('mesure')).toHaveLength(0)
  })

  it('les refus : le motif écrit par EJP Tech, relié à l’indicateur par la demande', async () => {
    const faux = installer({
      validation: {
        data: [
          {
            demande_id: DEMANDE,
            decision: 'refuse',
            motif: 'Ce chiffre existe déjà sur la fiche.',
            saisi_le: '2026-10-05T16:45:00+02:00',
          },
          {
            demande_id: 'autre',
            decision: 'valide',
            motif: null,
            saisi_le: '2026-10-06T10:00:00Z',
          },
        ],
        error: null,
      },
      demande_indicateur: {
        data: [
          { id: DEMANDE, indicateur_id: INDICATEUR },
          { id: 'autre', indicateur_id: 'deux' },
        ],
        error: null,
      },
    })
    const refus = await lireMesRefus(COMMUNICATION)
    expect(refus).toEqual([
      {
        indicateur_id: INDICATEUR,
        saisi_le: '2026-10-05T16:45:00+02:00',
        motif: 'Ce chiffre existe déjà sur la fiche.',
      },
    ])
    expect(appelsDe(faux.de('validation')[0])).toEqual([
      'select("demande_id, decision, motif, saisi_le")',
      `eq("ministere_id", "${COMMUNICATION}")`,
      'eq("decision", "refuse")',
    ])
  })
})
