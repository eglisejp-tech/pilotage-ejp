import { describe, expect, it } from 'vitest'
import {
  CATEGORIES_EXEMPLE,
  detailsExemple,
  INDICATEURS_DIMANCHE,
  indicateursMoisExemple,
  MESURES_A_CE_JOUR,
  MESURES_MOIS_CORRECTION,
  mesuresDimancheExemple,
} from '@/features/saisie-chiffres/apercu/exemples'
import {
  aIndicateurDuMatin,
  champsDimanche,
  champsMois,
  detailsDesTotaux,
  dimanchesSaisis,
  indicateursDuMois,
  moisComplets,
  TEXTE_MASQUE,
  totauxQuiFontFoi,
} from '@/features/saisie-chiffres/champs'
import type { IndicateurDeSaisie } from '@/features/saisie-chiffres/champs'

const dimanche = (correction = false, matin = false) =>
  champsDimanche({
    dimanche: matin ? '2026-10-04' : '2026-09-27',
    matin,
    indicateurs: INDICATEURS_DIMANCHE,
    mesuresDimanche: mesuresDimancheExemple(correction),
    mesuresACeJour: MESURES_A_CE_JOUR,
  })

describe('champs de la saisie du dimanche', () => {
  it('les trois communs dans l’ordre de 08, avec leurs aides, notes et valeurs de départ', () => {
    const { communs, correction } = dimanche()
    expect(communs.map((champ) => [champ.code, champ.aide, champ.variante])).toEqual([
      ['service', 'dimanche.service', 'grand'],
      ['actifs', 'dimanche.actifs', 'compact'],
      ['en_fij', 'dimanche.enFij', 'compact'],
    ])
    expect(communs[0]).toMatchObject({
      note: 'Dimanche dernier : 9',
      depart: null,
      deja: null,
      obligatoire: true,
    })
    expect(communs[1]).toMatchObject({ depart: 14, note: 'Saisi le 24 sept.' })
    expect(communs[2]).toMatchObject({ depart: 11 })
    expect(correction).toBe(false)
  })

  it('« Dimanche dernier : non saisi » quand le dimanche précédent manque', () => {
    const { communs } = champsDimanche({
      dimanche: '2026-09-27',
      matin: false,
      indicateurs: INDICATEURS_DIMANCHE,
      mesuresDimanche: [],
      mesuresACeJour: [],
    })
    expect(communs[0]?.note).toBe('Dimanche dernier : non saisi')
    expect(communs[1]?.depart).toBeNull()
  })

  it('les indicateurs propres actifs ou à valider, dans l’ordre, sans aide chacun', () => {
    const { propres } = dimanche()
    expect(propres.map((champ) => champ.libelle)).toEqual([
      'Répétitions de la semaine',
      'Heure de fin du culte',
      'Présents la nuit de prière',
      'Abonnés à ce jour',
    ])
    expect(propres.every((champ) => champ.aide === null)).toBe(true)
    expect(propres.at(-1)).toMatchObject({ aValider: true, depart: 1250 })
  })

  it('une correction reprend la saisie qui fait foi pour ce dimanche', () => {
    const { communs, propres, correction } = dimanche(true)
    expect(correction).toBe(true)
    expect(communs[0]).toMatchObject({ depart: 10, deja: { valeur: 10 } })
    expect(propres[0]).toMatchObject({ depart: 3 })
  })

  it('le dimanche du jour avant midi : seuls les indicateurs saisis le matin', () => {
    const { communs, propres } = dimanche(false, true)
    expect(communs).toEqual([])
    expect(propres.map((champ) => champ.libelle)).toEqual(['Présents la nuit de prière'])
  })

  it('jamais un calcul ni un retiré', () => {
    const indicateurs: IndicateurDeSaisie[] = [
      ...INDICATEURS_DIMANCHE,
      { ...INDICATEURS_DIMANCHE[3]!, id: 'calcul', calcul: 'taux', libelle: 'Taux' },
      { ...INDICATEURS_DIMANCHE[3]!, id: 'retire', etat: 'retire', libelle: 'Retiré' },
    ]
    const { propres } = champsDimanche({
      dimanche: '2026-09-27',
      matin: false,
      indicateurs,
      mesuresDimanche: [],
      mesuresACeJour: [],
    })
    expect(propres.map((champ) => champ.id)).not.toContain('calcul')
    expect(propres.map((champ) => champ.id)).not.toContain('retire')
  })

  it('dimanches saisis et indicateur du matin', () => {
    expect(dimanchesSaisis(INDICATEURS_DIMANCHE, mesuresDimancheExemple(true))).toEqual(
      new Set(['2026-09-20', '2026-09-27']),
    )
    expect(aIndicateurDuMatin(INDICATEURS_DIMANCHE)).toBe(true)
    expect(aIndicateurDuMatin(INDICATEURS_DIMANCHE.slice(0, 3))).toBe(false)
  })
})

describe('champs de « Chiffres du mois »', () => {
  const mois = (options: { correction?: boolean; masquee?: boolean; categories?: boolean } = {}) =>
    champsMois({
      mois: '2026-09',
      indicateurs: indicateursMoisExemple(options.categories ?? true),
      mesuresMois: options.correction ? MESURES_MOIS_CORRECTION : [],
      categories: CATEGORIES_EXEMPLE,
      details: options.correction ? detailsExemple(options.masquee ?? false) : [],
    })

  it('quatre aides au plus : sensible, à valider, et la grille sur le premier sensible', () => {
    const champs = mois()
    expect(champs.map((champ) => champ.aide)).toEqual([
      'mois.sensible',
      null,
      'mois.aValider',
      null,
    ])
    expect(champs[0]?.sensible).toMatchObject({
      categories: [
        { code: 'malaise', libelle: 'Malaise' },
        { code: 'blessure', libelle: 'Blessure' },
        { code: 'autre', libelle: 'Autre' },
      ],
      aideGrille: true,
      rappel: true,
      precisionDepart: null,
      repartitionDepart: null,
    })
    expect(champs[1]?.sensible).toBeNull()
  })

  it('une correction reprend le total, la précision et la répartition du total le plus récent', () => {
    const [sensible, fonds] = mois({ correction: true })
    expect(sensible).toMatchObject({ depart: 7, deja: { valeur: 7 } })
    expect(sensible?.sensible).toMatchObject({
      precisionDepart:
        'Plus de passages pendant la collecte de rentrée, tous orientés vers les bonnes permanences.',
      precisionMasquee: false,
      repartitionDepart: { malaise: 4, blessure: 3, autre: 0 },
    })
    expect(fonds).toMatchObject({ depart: 1250 })
  })

  it('une précision masquée par EJP Tech n’est pas reprise, et le champ le dit', () => {
    const [sensible] = mois({ correction: true, masquee: true })
    expect(sensible?.sensible).toMatchObject({ precisionDepart: null, precisionMasquee: true })
  })

  it('un sensible sans liste de la coordination n’a pas de grille', () => {
    const [sensible] = mois({ categories: false })
    expect(sensible?.sensible?.categories).toEqual([])
    expect(sensible?.sensible?.aideGrille).toBe(false)
  })

  it('une catégorie retirée ne se propose plus et ne se reprend pas', () => {
    const nouvelle = {
      ...CATEGORIES_EXEMPLE[0]!,
      code: 'orientation',
      libelle: 'Orientation',
      ordre: 4,
    }
    const champs = champsMois({
      mois: '2026-09',
      indicateurs: indicateursMoisExemple(true),
      mesuresMois: MESURES_MOIS_CORRECTION,
      categories: [
        ...CATEGORIES_EXEMPLE.map((categorie) =>
          categorie.code === 'autre' ? { ...categorie, retiree_le: '2026-09-15' } : categorie,
        ),
        nouvelle,
      ],
      details: detailsExemple(false),
    })
    expect(champs[0]?.sensible?.categories.map((categorie) => categorie.code)).toEqual([
      'malaise',
      'blessure',
      'orientation',
    ])
    expect(champs[0]?.sensible?.repartitionDepart).toEqual({
      malaise: 4,
      blessure: 3,
      orientation: 0,
    })
  })

  it('une liste en cours de moins de 3 ou de plus de 6 catégories : pas de grille (T42)', () => {
    const deux = CATEGORIES_EXEMPLE.slice(0, 2)
    const sept = Array.from({ length: 7 }, (_, rang) => ({
      ...CATEGORIES_EXEMPLE[0]!,
      code: `cat_${rang}`,
      ordre: rang + 1,
    }))
    for (const categories of [deux, sept]) {
      const [sensible] = champsMois({
        mois: '2026-09',
        indicateurs: indicateursMoisExemple(true),
        mesuresMois: [],
        categories,
        details: [],
      })
      expect(sensible?.sensible?.categories).toEqual([])
      expect(sensible?.aide).toBe('mois.sensible')
    }
  })

  it('sans total ce mois, aucun détail n’est repris', () => {
    const champs = champsMois({
      mois: '2026-08',
      indicateurs: indicateursMoisExemple(true),
      mesuresMois: MESURES_MOIS_CORRECTION,
      categories: CATEGORIES_EXEMPLE,
      details: detailsExemple(false),
    })
    expect(champs[0]?.sensible).toMatchObject({ precisionDepart: null, repartitionDepart: null })
  })

  it('mois complets : chaque indicateur du mois a une valeur', () => {
    const indicateurs = indicateursMoisExemple(true)
    expect(indicateursDuMois(indicateurs)).toHaveLength(4)
    expect(moisComplets(indicateurs, MESURES_MOIS_CORRECTION)).toEqual(new Set())
    const tous = indicateurs.map((indicateur) => ({
      indicateur_id: indicateur.id,
      periode: '2026-08-01',
      valeur: 0,
      saisi_le: '2026-09-02T18:00:00Z',
    }))
    expect(moisComplets(indicateurs, tous)).toEqual(new Set(['2026-08']))
  })

  it('détails : seul le total le plus récent de chaque indicateur fait foi', () => {
    const totaux = [
      { id: 30, indicateur_id: 'a' },
      { id: 20, indicateur_id: 'a' },
      { id: 10, indicateur_id: 'b' },
    ]
    expect(totauxQuiFontFoi(totaux)).toEqual([30, 10])
    expect(
      detailsDesTotaux(
        totaux,
        [
          { mesure_id: 20, categorie: 'malaise', valeur: 2 },
          { mesure_id: 10, categorie: 'autre', valeur: 1 },
        ],
        [{ mesure_id: 20, texte: 'Une précision ancienne du mois.' }],
      ),
    ).toEqual([
      // Le total le plus récent (30) n'a ni précision ni répartition : rien n'est repris.
      { indicateur_id: 'a', precision: null, repartition: null },
      { indicateur_id: 'b', precision: null, repartition: { autre: 1 } },
    ])
    expect(TEXTE_MASQUE).toBe('[texte masqué par EJP Tech]')
  })
})
