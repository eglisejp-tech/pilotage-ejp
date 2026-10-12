import { beforeEach, describe, expect, it, vi } from 'vitest'
import { appelsDe, fauxRequete } from '@/test/fauxRequete'
import {
  ajouterCalcul,
  ajouterIndicateur,
  compacter,
  corrigerIndicateur,
  lireLimites,
  lireTermes,
  MESSAGES_ECRITURE,
  MOTIFS_RETRAIT,
  retirerIndicateur,
  schemaAjout,
  schemaCalcul,
  schemaCorrection,
  verifierLibelle,
} from './indicateursEcriture'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const MINISTERE = '10000000-0000-4000-8000-000000000002'
const INDICATEUR = '20000000-0000-4000-8000-000000000011'
const AUTRE = '20000000-0000-4000-8000-000000000012'

let rpc: ReturnType<typeof vi.fn>

function installerRpc(reponse: { data: unknown; error: unknown }) {
  rpc = vi.fn(() => Promise.resolve(reponse))
  courant.client = { rpc }
}

beforeEach(() => {
  courant.client = undefined
})

const ajout = {
  libelle: 'Publications',
  definition: 'Publications mises en ligne dans le mois.',
  nature: 'mois' as const,
  unite: 'nombre' as const,
  sensible: false,
  pasSensible: false,
}

describe('schemaAjout : les bornes de la base avant l’appel', () => {
  it('accepte un ajout complet et réduit les espaces', () => {
    const lu = schemaAjout.parse({
      ...ajout,
      libelle: '  Pages   Roses : ateliers ',
      definition: '  Ateliers   tenus dans le mois, toutes séances confondues. ',
    })
    expect(lu.libelle).toBe('Pages Roses : ateliers')
    expect(lu.definition).toBe('Ateliers tenus dans le mois, toutes séances confondues.')
  })

  it('libellé de 2 à 60 caractères', () => {
    expect(schemaAjout.safeParse({ ...ajout, libelle: 'A' }).success).toBe(false)
    expect(schemaAjout.safeParse({ ...ajout, libelle: 'AB' }).success).toBe(true)
    expect(schemaAjout.safeParse({ ...ajout, libelle: 'x'.repeat(60) }).success).toBe(true)
    const trop = schemaAjout.safeParse({ ...ajout, libelle: 'x'.repeat(61) })
    expect(trop.success).toBe(false)
    expect(trop.error?.issues[0]?.message).toBe(MESSAGES_ECRITURE.libelle)
  })

  it('compte les caractères comme la base : un émoji en vaut un, les espaces des bords aucun', () => {
    expect(schemaAjout.safeParse({ ...ajout, libelle: '😀'.repeat(60) }).success).toBe(true)
    expect(schemaAjout.safeParse({ ...ajout, libelle: '😀'.repeat(61) }).success).toBe(false)
    expect(schemaAjout.safeParse({ ...ajout, libelle: `  ${'x'.repeat(60)}  ` }).success).toBe(true)
    expect(schemaAjout.safeParse({ ...ajout, libelle: ' A ' }).success).toBe(false)
  })

  it('définition de 10 à 140 caractères', () => {
    expect(schemaAjout.safeParse({ ...ajout, definition: 'x'.repeat(9) }).success).toBe(false)
    expect(schemaAjout.safeParse({ ...ajout, definition: 'x'.repeat(10) }).success).toBe(true)
    expect(schemaAjout.safeParse({ ...ajout, definition: 'x'.repeat(140) }).success).toBe(true)
    const trop = schemaAjout.safeParse({ ...ajout, definition: 'x'.repeat(141) })
    expect(trop.success).toBe(false)
    expect(trop.error?.issues[0]?.message).toBe(MESSAGES_ECRITURE.definition)
  })

  it('le rythme et la sorte se choisissent ; hors liste, le message de la base', () => {
    const sansRythme = schemaAjout.safeParse({ ...ajout, nature: '' })
    expect(sansRythme.error?.issues[0]?.message).toBe(MESSAGES_ECRITURE.rythme)
    const sansSorte = schemaAjout.safeParse({ ...ajout, unite: 'jours' })
    expect(sansSorte.error?.issues[0]?.message).toBe(MESSAGES_ECRITURE.sorte)
  })

  it('un domaine sensible se saisit chaque mois, en compte simple', () => {
    expect(schemaAjout.safeParse({ ...ajout, sensible: true }).success).toBe(true)
    const dimanche = schemaAjout.safeParse({ ...ajout, sensible: true, nature: 'dimanche' })
    expect(dimanche.error?.issues[0]).toMatchObject({
      path: ['nature'],
      message: MESSAGES_ECRITURE.sensibleMois,
    })
    const euros = schemaAjout.safeParse({ ...ajout, sensible: true, unite: 'euros' })
    expect(euros.error?.issues[0]).toMatchObject({ path: ['unite'] })
  })
})

describe('schemaCalcul et schemaCorrection', () => {
  const calcul = {
    libelle: 'Taux de résolution',
    definition: 'Demandes résolues sur demandes reçues.',
    type: 'taux' as const,
    hautId: INDICATEUR,
    basId: AUTRE,
  }

  it('un taux ou une moyenne de deux chiffres distincts', () => {
    expect(schemaCalcul.safeParse(calcul).success).toBe(true)
    expect(schemaCalcul.safeParse({ ...calcul, type: 'moyenne' }).success).toBe(true)
    expect(schemaCalcul.safeParse({ ...calcul, type: 'somme' }).error?.issues[0]?.message).toBe(
      MESSAGES_ECRITURE.type,
    )
  })

  it('le même chiffre en haut et en bas est refusé sous « Chiffre du bas »', () => {
    const lu = schemaCalcul.safeParse({ ...calcul, basId: INDICATEUR })
    expect(lu.error?.issues[0]).toMatchObject({
      path: ['basId'],
      message: MESSAGES_ECRITURE.distincts,
    })
  })

  it('un chiffre manquant dit lequel choisir', () => {
    expect(schemaCalcul.safeParse({ ...calcul, hautId: '' }).error?.issues[0]?.message).toBe(
      MESSAGES_ECRITURE.haut,
    )
    expect(schemaCalcul.safeParse({ ...calcul, basId: '' }).error?.issues[0]?.message).toBe(
      MESSAGES_ECRITURE.bas,
    )
  })

  it('la correction a les mêmes bornes de texte', () => {
    expect(schemaCorrection.safeParse({ libelle: 'A', definition: ajout.definition }).success).toBe(
      false,
    )
    expect(
      schemaCorrection.safeParse({ libelle: 'Publications', definition: 'courte' }).success,
    ).toBe(false)
    expect(
      schemaCorrection.safeParse({ libelle: 'Publications', definition: ajout.definition }).success,
    ).toBe(true)
  })

  it('compacter réduit les espaces comme la base', () => {
    expect(compacter('  a \n  b\t c  ')).toBe('a b c')
  })
})

describe('ajouterIndicateur', () => {
  it('envoie à creer_indicateur ce que la base attend, sans « Pourquoi »', async () => {
    installerRpc({ data: INDICATEUR, error: null })
    expect(await ajouterIndicateur(MINISTERE, ajout)).toBe(INDICATEUR)
    expect(rpc).toHaveBeenCalledWith('creer_indicateur', {
      p_ministere_id: MINISTERE,
      p_libelle: 'Publications',
      p_definition: ajout.definition,
      p_nature: 'mois',
      p_unite: 'nombre',
      p_sensible: false,
      p_pas_sensible: false,
      p_remplace_id: null,
    })
  })

  it('un remplacement envoie l’indicateur remplacé', async () => {
    installerRpc({ data: INDICATEUR, error: null })
    await ajouterIndicateur(MINISTERE, ajout, AUTRE)
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_remplace_id: AUTRE })
  })

  it('« Ce n’est pas un domaine sensible » ne part que si la case sensible est décochée', async () => {
    installerRpc({ data: INDICATEUR, error: null })
    await ajouterIndicateur(MINISTERE, { ...ajout, pasSensible: true })
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_pas_sensible: true, p_sensible: false })
    await ajouterIndicateur(MINISTERE, { ...ajout, sensible: true, pasSensible: true })
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({
      p_pas_sensible: false,
      p_sensible: true,
      p_unite: 'nombre',
    })
  })

  it('refuse avant tout appel un ajout hors des bornes ou un identifiant mal formé', async () => {
    installerRpc({ data: INDICATEUR, error: null })
    await expect(ajouterIndicateur(MINISTERE, { ...ajout, libelle: 'A' })).rejects.toThrow()
    await expect(ajouterIndicateur('pas-un-uuid', ajout)).rejects.toThrow()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rend l’erreur de la base telle quelle', async () => {
    const refus = { code: 'P0001', message: 'Cette fiche a déjà « Publications ».' }
    installerRpc({ data: null, error: refus })
    await expect(ajouterIndicateur(MINISTERE, ajout)).rejects.toBe(refus)
  })
})

describe('ajouterCalcul', () => {
  it('envoie le type et les deux chiffres, sans part', async () => {
    installerRpc({ data: INDICATEUR, error: null })
    await ajouterCalcul({
      libelle: 'Taux de résolution',
      definition: 'Demandes résolues sur demandes reçues.',
      type: 'taux',
      hautId: INDICATEUR,
      basId: AUTRE,
    })
    expect(rpc).toHaveBeenCalledWith('creer_calcul', {
      p_libelle: 'Taux de résolution',
      p_definition: 'Demandes résolues sur demandes reçues.',
      p_type: 'taux',
      p_haut_id: INDICATEUR,
      p_bas_id: AUTRE,
      p_remplace_id: null,
    })
  })

  it('un calcul sur deux fois le même chiffre n’atteint jamais la base', async () => {
    installerRpc({ data: INDICATEUR, error: null })
    await expect(
      ajouterCalcul({
        libelle: 'Taux',
        definition: 'Demandes résolues sur demandes reçues.',
        type: 'taux',
        hautId: INDICATEUR,
        basId: INDICATEUR,
      }),
    ).rejects.toThrow()
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('corrigerIndicateur et retirerIndicateur', () => {
  it('corrige libellé et définition', async () => {
    installerRpc({ data: 'corrige', error: null })
    await corrigerIndicateur(INDICATEUR, { libelle: ' Visuels ', definition: ajout.definition })
    expect(rpc).toHaveBeenCalledWith('corriger_indicateur', {
      p_indicateur_id: INDICATEUR,
      p_libelle: 'Visuels',
      p_definition: ajout.definition,
    })
  })

  it('retire avec un motif de la liste fermée et rend le nombre de calculs retirés', async () => {
    installerRpc({ data: 1, error: null })
    expect(await retirerIndicateur(INDICATEUR, 'doublon')).toBe(1)
    expect(rpc).toHaveBeenCalledWith('retirer_indicateur', {
      p_indicateur_id: INDICATEUR,
      p_motif: 'doublon',
    })
  })

  it('le motif « confidentialité » est celui du retrait qui masque les textes', async () => {
    installerRpc({ data: 0, error: null })
    await retirerIndicateur(INDICATEUR, 'confidentialite')
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_motif: 'confidentialite' })
  })

  it('les motifs posés par la base (remplacé, refusé, source retirée) ne se choisissent pas', async () => {
    installerRpc({ data: 0, error: null })
    for (const motif of ['remplace', 'refuse', 'source_retiree', 'autre']) {
      await expect(
        retirerIndicateur(INDICATEUR, motif as Parameters<typeof retirerIndicateur>[1]),
      ).rejects.toThrow()
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('les sept motifs de l’écran sont ceux de la base', () => {
    expect(MOTIFS_RETRAIT.map((motif) => motif.code)).toEqual([
      'plus_suivi',
      'doublon',
      'erreur',
      'se_calcule',
      'deja_commun',
      'domaine_sensible',
      'hors_regles',
    ])
  })
})

describe('contrôles, limites et termes', () => {
  it('verifier_libelle part en POST avec le rythme et le ministère', async () => {
    const reponse = [{ famille: 'doublon', message: 'Cette fiche a déjà « X ».', bloquant: true }]
    installerRpc({ data: reponse, error: null })
    expect(await verifierLibelle('X', 'mois', MINISTERE)).toEqual(reponse)
    expect(rpc).toHaveBeenCalledWith('verifier_libelle', {
      p_libelle: 'X',
      p_nature: 'mois',
      p_ministere_id: MINISTERE,
    })
  })

  it('limites_indicateurs rend la première ligne, et refuse une réponse vide', async () => {
    installerRpc({
      data: [{ ajouts: 1, ajouts_max: 3, lignes: 12, lignes_max: 30 }],
      error: null,
    })
    expect(await lireLimites(MINISTERE)).toEqual({
      ajouts: 1,
      ajouts_max: 3,
      lignes: 12,
      lignes_max: 30,
    })
    installerRpc({ data: [], error: null })
    await expect(lireLimites(MINISTERE)).rejects.toThrow()
  })

  it('lit les termes d’un calcul, ou les calculs qui se servent d’une source', async () => {
    const faux = fauxRequete({
      indicateur_terme: {
        data: [{ calcul_id: AUTRE, source_id: INDICATEUR, role: 'haut' }],
        error: null,
      },
    })
    courant.client = { from: faux.from }
    expect(await lireTermes({ calculId: AUTRE })).toHaveLength(1)
    expect(await lireTermes({ sourceId: INDICATEUR })).toHaveLength(1)
    const [parCalcul, parSource] = faux.de('indicateur_terme')
    expect(appelsDe(parCalcul)).toEqual([
      'select("calcul_id, source_id, role")',
      `eq("calcul_id", "${AUTRE}")`,
    ])
    expect(appelsDe(parSource)).toEqual([
      'select("calcul_id, source_id, role")',
      `eq("source_id", "${INDICATEUR}")`,
    ])
  })
})
