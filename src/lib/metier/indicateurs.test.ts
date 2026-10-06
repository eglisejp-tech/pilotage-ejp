import { describe, expect, it } from 'vitest'
import type { LigneVue } from '@/lib/base'
import {
  comparerIndicateurs,
  estAValider,
  estCalcul,
  estSaisissable,
  formaterResultatCalcul,
  libelleCompletudePeriodes,
  libelleRythme,
  libelleValeurMesure,
  phraseCalcul,
  refusDeMois,
  regrouperParRythme,
  retires,
  RYTHMES,
  texteNonCalcule,
  trierIndicateurs,
} from './indicateurs'
import type { EntreeCalcul } from './indicateurs'

// Espace fine insécable d'Intl (U+202F) : « 12 480 », « 80 % », « 5 164 € ».
const F = ' '

describe('ordre de la fiche (R6)', () => {
  it('range par rythme (dimanche, mois, à ce jour), puis par ordre alphabétique', () => {
    expect(RYTHMES).toEqual(['dimanche', 'mois', 'a_ce_jour'])
    const lignes = [
      { nature: 'mois', libelle: 'Publications' },
      { nature: 'a_ce_jour', libelle: 'Abonnés' },
      { nature: 'dimanche', libelle: 'Pages Roses : sessions' },
      { nature: 'mois', libelle: 'Articles vendus' },
      { nature: 'dimanche', libelle: 'Pages Roses : profils actifs' },
    ] as const
    expect(trierIndicateurs(lignes).map((l) => l.libelle)).toEqual([
      'Pages Roses : profils actifs',
      'Pages Roses : sessions',
      'Articles vendus',
      'Publications',
      'Abonnés',
    ])
  })

  it("l'ordre alphabétique est le français : les accents ne rejettent pas à la fin", () => {
    const lignes = [
      { nature: 'mois', libelle: 'Écoute' },
      { nature: 'mois', libelle: 'Eagles' },
      { nature: 'mois', libelle: 'Zèbre' },
      { nature: 'mois', libelle: 'Entretien' },
    ] as const
    expect(trierIndicateurs(lignes).map((l) => l.libelle)).toEqual([
      'Eagles',
      'Écoute',
      'Entretien',
      'Zèbre',
    ])
  })

  it('ne modifie pas la liste reçue', () => {
    const lignes = [
      { nature: 'mois', libelle: 'B' },
      { nature: 'dimanche', libelle: 'A' },
    ] as const
    trierIndicateurs(lignes)
    expect(lignes.map((l) => l.libelle)).toEqual(['B', 'A'])
    expect(comparerIndicateurs(lignes[0], lignes[1])).toBeGreaterThan(0)
  })

  it('regroupe par rythme avec le titre de section, sans section vide', () => {
    const sections = regrouperParRythme([
      { nature: 'a_ce_jour', libelle: 'Stock' },
      { nature: 'dimanche', libelle: 'Cultes captés' },
    ] as const)
    expect(sections.map((s) => [s.nature, s.titre, s.indicateurs.length])).toEqual([
      ['dimanche', 'Chaque dimanche', 1],
      ['a_ce_jour', 'À ce jour', 1],
    ])
    expect(regrouperParRythme([])).toEqual([])
    expect(libelleRythme('mois')).toBe('Chaque mois')
  })

  it('les retirés ne sont pas dans les sections : ils vont à part, rangés comme la fiche', () => {
    const lignes = [
      { nature: 'mois', libelle: 'Publications', etat: 'actif' },
      { nature: 'mois', libelle: 'Vieux suivi', etat: 'retire' },
      { nature: 'dimanche', libelle: 'Ancien décompte', etat: 'retire' },
      { nature: 'mois', libelle: 'Abonnements', etat: 'en_attente' },
    ] as const
    const sections = regrouperParRythme(lignes)
    expect(sections.map((s) => s.indicateurs.map((l) => l.libelle))).toEqual([
      ['Abonnements', 'Publications'],
    ])
    expect(retires(lignes).map((l) => l.libelle)).toEqual(['Ancien décompte', 'Vieux suivi'])
    expect(retires([])).toEqual([])
  })
})

describe('qui se saisit', () => {
  it('un calcul ne se saisit jamais, un retiré non plus ; un ajout à valider se saisit', () => {
    expect(estSaisissable({ calcul: null, etat: 'actif' })).toBe(true)
    expect(estSaisissable({ calcul: null, etat: 'en_attente' })).toBe(true)
    expect(estSaisissable({ calcul: null, etat: 'retire' })).toBe(false)
    expect(estSaisissable({ calcul: 'taux', etat: 'actif' })).toBe(false)
    expect(estCalcul({ calcul: 'moyenne' })).toBe(true)
    expect(estCalcul({ calcul: null })).toBe(false)
    expect(estAValider('en_attente')).toBe(true)
    expect(estAValider('actif')).toBe(false)
  })
})

describe('mois saisissable (décision du 6 octobre 2026)', () => {
  it('accepte le mois en cours, un mois fini et janvier de l’année précédente', () => {
    expect(refusDeMois('2026-10', '2026-10-06')).toBeNull()
    expect(refusDeMois('2026-09', '2026-10-06')).toBeNull()
    expect(refusDeMois('2025-01', '2026-10-06')).toBeNull()
  })

  it('refuse un mois futur, un mois trop ancien et ce qui n’est pas un mois', () => {
    expect(refusDeMois('2026-11', '2026-10-06')).toBe('futur')
    expect(refusDeMois('2027-01', '2026-10-06')).toBe('futur')
    expect(refusDeMois('2024-12', '2026-10-06')).toBe('trop_ancien')
    expect(refusDeMois('octobre', '2026-10-06')).toBe('invalide')
    expect(refusDeMois('2026-10-01', '2026-10-06')).toBe('invalide')
    expect(refusDeMois('2026-13', '2026-10-06')).toBe('invalide')
  })

  it('bascule avec le jour de Paris donné : le 1er novembre ouvre novembre', () => {
    expect(refusDeMois('2026-11', '2026-10-31')).toBe('futur')
    expect(refusDeMois('2026-11', '2026-11-01')).toBeNull()
    expect(refusDeMois('2025-01', '2027-01-01')).toBe('trop_ancien')
    expect(refusDeMois('2026-01', '2027-01-01')).toBeNull()
  })
})

describe('valeur d’une période', () => {
  it('« moins de 3 » pour un sensible masqué, la valeur avec son unité, jamais 0 pour une absence', () => {
    expect(libelleValeurMesure(null, true, 'nombre')).toBe('moins de 3')
    expect(libelleValeurMesure(12, false, 'nombre')).toBe('12')
    expect(libelleValeurMesure(0, false, 'nombre')).toBe('0')
    expect(libelleValeurMesure(642, false, 'heure')).toBe('10 h 42')
    expect(libelleValeurMesure(null, false, 'nombre')).toBeNull()
  })

  it('mois en cours d’un sensible (P45) : un 1 ou 2 masqué se dit « moins de 3 », pas une absence', () => {
    // `mois_en_cours_valeur` est null ET `mois_en_cours_moins_de_3` est vrai : pas de saisie ne se
    // confond pas avec un petit nombre masqué.
    expect(libelleValeurMesure(null, true, 'nombre')).toBe('moins de 3')
    expect(libelleValeurMesure(null, false, 'nombre')).toBeNull()
    expect(libelleValeurMesure(5, false, 'nombre')).toBe('5')
  })

  it('écrit la complétude de la somme avec son unité de période', () => {
    expect(libelleCompletudePeriodes(9, 9, 'mois')).toBe('9 mois sur 9')
    expect(libelleCompletudePeriodes(1, 5, 'mois')).toBe('1 mois sur 5')
    expect(libelleCompletudePeriodes(40, 40, 'dimanche')).toBe('40 dimanches sur 40')
    expect(libelleCompletudePeriodes(1, 40, 'dimanche')).toBe('1 dimanche sur 40')
    expect(libelleCompletudePeriodes(0, 3, 'a_ce_jour')).toBe('0 valeur sur 3')
  })
})

describe('résultat d’un calcul', () => {
  it('un taux est un pour cent entier, arrondi à l’entier le plus proche', () => {
    expect(formaterResultatCalcul('taux', 80, 'nombre')).toBe(`80${F}%`)
    expect(formaterResultatCalcul('taux', 77.5, 'nombre')).toBe(`78${F}%`)
    expect(formaterResultatCalcul('taux', 77.4, 'nombre')).toBe(`77${F}%`)
    expect(formaterResultatCalcul('taux', 0, 'nombre')).toBe(`0${F}%`)
  })

  it('une moyenne a une décimale et l’unité de son haut', () => {
    expect(formaterResultatCalcul('moyenne', 23.396, 'euros')).toBe(`23,4${F}€`)
    expect(formaterResultatCalcul('moyenne', 12, 'nombre')).toBe('12,0')
    expect(formaterResultatCalcul('moyenne', 1.5, 'jours')).toBe('1,5 jour')
    expect(formaterResultatCalcul('moyenne', 3.2, 'jours')).toBe('3,2 jours')
    expect(formaterResultatCalcul('moyenne', 1.96, 'jours')).toBe('2,0 jours')
    expect(formaterResultatCalcul('moyenne', 1.04, 'jours')).toBe('1,0 jour')
    expect(formaterResultatCalcul('moyenne', 630.4, 'heure')).toBe('10 h 30')
  })
})

describe('texte du « Non calculé »', () => {
  const mois = { nature: 'mois', periode: '2026-09-01' } as const

  it('dit la raison et la source entre guillemets', () => {
    expect(
      texteNonCalcule({ ...mois, raison: 'source_non_saisie', libelleSource: 'Demandes reçues' }),
    ).toBe('Non calculé : aucune saisie de « Demandes reçues » pour septembre.')
    expect(texteNonCalcule({ ...mois, raison: 'bas_nul', libelleSource: 'Demandes reçues' })).toBe(
      'Non calculé : « Demandes reçues » vaut 0 pour septembre.',
    )
  })

  it('reste juste sans libellé de source et sans raison', () => {
    expect(texteNonCalcule({ ...mois, raison: 'source_non_saisie' })).toBe(
      'Non calculé : une saisie de septembre manque.',
    )
    expect(texteNonCalcule({ ...mois, raison: 'bas_nul', libelleSource: null })).toBe(
      'Non calculé : le total de comparaison vaut 0 pour septembre.',
    )
    expect(texteNonCalcule({ ...mois, raison: null })).toBe('Non calculé.')
  })

  it('nomme la période du dimanche et du « à ce jour »', () => {
    expect(
      texteNonCalcule({
        raison: 'source_non_saisie',
        nature: 'dimanche',
        periode: '2026-09-27',
        libelleSource: 'Cultes',
      }),
    ).toBe('Non calculé : aucune saisie de « Cultes » pour le dimanche 27 sept.')
    expect(
      texteNonCalcule({
        raison: 'bas_nul',
        nature: 'a_ce_jour',
        periode: '2026-09-24',
        libelleSource: 'Inscrits',
      }),
    ).toBe('Non calculé : « Inscrits » vaut 0 pour le 24 sept.')
  })
})

describe('ligne d’un calcul', () => {
  const ligneTaux: EntreeCalcul['ligne'] = {
    calcul: 'taux',
    periode: '2026-09-01',
    haut: 16,
    bas: 20,
    resultat: 80,
    annee_resultat: 78,
    annee_nb_periodes: 9,
    annee_nb_attendues: 9,
    non_calcule_raison: null,
  }

  it('taux du mois et de l’année : « 80 % en septembre (16 sur 20). Depuis janvier : 78 % (9 mois sur 9). »', () => {
    expect(
      phraseCalcul({
        libelle: 'Taux de résolution',
        nature: 'mois',
        unite: 'nombre',
        ligne: ligneTaux,
        depuis: 'Depuis janvier',
      }),
    ).toBe(
      `Taux de résolution : 80${F}% en septembre (16 sur 20). Depuis janvier : 78${F}% (9 mois sur 9).`,
    )
  })

  it('sans départ nommé, la somme de l’année dit « Sur l’année » ; sans année, elle disparaît', () => {
    const base = { libelle: 'Taux', nature: 'mois', unite: 'nombre' } as const
    expect(phraseCalcul({ ...base, ligne: ligneTaux })).toContain(
      `Sur l'année : 78${F}% (9 mois sur 9).`,
    )
    expect(phraseCalcul({ ...base, ligne: { ...ligneTaux, annee_resultat: null } })).toBe(
      `Taux : 80${F}% en septembre (16 sur 20).`,
    )
    expect(
      phraseCalcul({
        ...base,
        ligne: { ...ligneTaux, haut: null, bas: null, annee_resultat: null },
      }),
    ).toBe(`Taux : 80${F}% en septembre.`)
  })

  it('moyenne : unité du haut et « pour » entre le haut et le bas', () => {
    expect(
      phraseCalcul({
        libelle: 'Panier moyen',
        nature: 'mois',
        unite: 'euros',
        ligne: {
          ...ligneTaux,
          calcul: 'moyenne',
          haut: 1240,
          bas: 53,
          resultat: 23.396,
          annee_resultat: null,
        },
      }),
    ).toBe(`Panier moyen : 23,4${F}€ en septembre (1${F}240${F}€ pour 53).`)
  })

  it('moyenne en heure : sommes de minutes sans détail, jamais d’erreur', () => {
    expect(
      phraseCalcul({
        libelle: 'Heure moyenne du culte',
        nature: 'mois',
        unite: 'heure',
        ligne: {
          ...ligneTaux,
          calcul: 'moyenne',
          haut: 2520,
          bas: 4,
          resultat: 630,
          annee_resultat: null,
        },
      }),
    ).toBe('Heure moyenne du culte : 10 h 30 en septembre.')
  })

  it('un mois d’une autre année que le jour de Paris porte son année', () => {
    const entree: EntreeCalcul = {
      libelle: 'Taux de résolution',
      nature: 'mois',
      unite: 'nombre',
      ligne: { ...ligneTaux, periode: '2026-12-01' },
      aujourdhui: '2027-01-05',
    }
    expect(phraseCalcul(entree)).toContain(`80${F}% en décembre 2026 (16 sur 20).`)
    expect(phraseCalcul({ ...entree, aujourdhui: '2026-12-20' })).toContain(
      `80${F}% en décembre (16 sur 20).`,
    )
    expect(
      phraseCalcul({
        ...entree,
        ligne: {
          ...ligneTaux,
          periode: '2026-12-01',
          resultat: null,
          non_calcule_raison: 'bas_nul',
        },
        libelleSource: 'Demandes reçues',
      }),
    ).toBe('Non calculé : « Demandes reçues » vaut 0 pour décembre 2026.')
  })

  it('un calcul du dimanche dit le jour, sans « en »', () => {
    expect(
      phraseCalcul({
        libelle: 'Taux',
        nature: 'dimanche',
        unite: 'nombre',
        ligne: { ...ligneTaux, periode: '2026-09-27', annee_resultat: null },
      }),
    ).toBe(`Taux : 80${F}% le dimanche 27 sept. (16 sur 20).`)
  })

  it('un calcul sans résultat rend seulement le « Non calculé », avec sa source', () => {
    const ligne: EntreeCalcul['ligne'] = {
      ...ligneTaux,
      haut: 16,
      bas: null,
      resultat: null,
      annee_resultat: null,
      non_calcule_raison: 'source_non_saisie',
    }
    expect(
      phraseCalcul({
        libelle: 'Taux de résolution',
        nature: 'mois',
        unite: 'nombre',
        ligne,
        libelleSource: 'Demandes reçues',
      }),
    ).toBe('Non calculé : aucune saisie de « Demandes reçues » pour septembre.')
  })

  it('accepte les lignes de la vue telles que la base les rend', () => {
    const vue: LigneVue<'v_calcul'> = {
      indicateur_id: 'c1',
      ministere_id: 'm1',
      calcul: 'taux',
      periode: '2026-09-01',
      haut: 16,
      bas: 20,
      resultat: 80,
      annee_haut: 70,
      annee_bas: 90,
      annee_resultat: 77.7,
      annee_nb_periodes: 9,
      annee_nb_attendues: 9,
      non_calcule_raison: null,
      non_calcule_source_id: null,
    }
    expect(
      phraseCalcul({ libelle: 'Taux', nature: 'mois', unite: 'nombre', ligne: vue }),
    ).toContain(`78${F}%`)
  })
})
