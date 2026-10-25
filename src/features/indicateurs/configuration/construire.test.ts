import { describe, expect, it } from 'vitest'
import { LIMITE_CHANGEMENTS } from '@/data/indicateursConfiguration'
import {
  apresChoix,
  apresCreation,
  ID_ANCIEN,
  ID_COMMUNICATION,
  ID_EAGLES,
  ID_JEUNESSE,
  ID_KUMI,
  ID_PROTOCOLE,
  lecturesExemple,
} from '@/features/indicateurs/configuration/apercu/exemples'
import { modelesDuCatalogue } from '@/features/indicateurs/configuration/catalogue'
import {
  construireConfiguration,
  construireMinistere,
} from '@/features/indicateurs/configuration/construire'
import type { LienModele } from '@/data/indicateursConfiguration'
import {
  blocPrevusVisible,
  etatPrevus,
  listesParMinistere,
} from '@/features/indicateurs/configuration/prevus'
import { nombre } from '@/lib/metier/texte'

describe('catalogue : modèles', () => {
  const modeles = modelesDuCatalogue(lecturesExemple().catalogue)

  it('un modèle par ministère de la liste, rangé par nom, sans les suggestions', () => {
    expect(modeles.map((modele) => modele.nom)).toEqual(['Communication', 'Eagles', 'Film', 'Kumi'])
    expect(modeles.some((modele) => modele.code === 'suggestion')).toBe(false)
  })

  it('les prévus d’un modèle suivent l’ordre du catalogue', () => {
    expect(modeles.find((modele) => modele.code === 'kumi')?.prevus.map((p) => p.libelle)).toEqual([
      'Activités réalisées',
      'Participantes aux rencontres',
      'Prises en charge',
      'Inscrites à ce jour',
      'Dons reçus',
      'Taux de participation',
    ])
  })
})

describe('état des prévus (7.1, T72 : la liste choisie)', () => {
  const lectures = lecturesExemple()
  const modeles = modelesDuCatalogue(lectures.catalogue)
  const liens = listesParMinistere(lectures.liens)
  const de = (id: string) =>
    etatPrevus(
      liens.get(id),
      lectures.indicateurs.filter((indicateur) => indicateur.ministere_id === id),
      modeles,
    )
  const lien = (modele: string | null, suggere: string | null = null): LienModele => ({
    ministere_id: 'm',
    modele,
    choisi_le: null,
    suggere,
  })

  it('liste choisie, rien créé : « 6 à créer », la liste se change encore', () => {
    const etat = de(ID_KUMI)
    expect(etat.genre).toBe('a_creer')
    if (etat.genre === 'a_creer') {
      expect(etat.modele.code).toBe('kumi')
      expect(etat.manquants).toHaveLength(6)
      expect(etat.modifiable).toBe(true)
    }
  })

  it('tous les prévus de la liste sont sur la fiche : « Créés », la liste ne se change plus', () => {
    expect(de(ID_COMMUNICATION)).toMatchObject({ genre: 'crees', modifiable: false })
    expect(de(ID_EAGLES)).toMatchObject({ genre: 'crees', modifiable: false })
  })

  it('rien de choisi : « À choisir », sans suggestion pour un nom inconnu', () => {
    expect(de(ID_JEUNESSE)).toEqual({ genre: 'a_choisir', suggestion: null })
  })

  it('« Aucun prévu » choisi : « Aucun prévu », jamais « À choisir »', () => {
    expect(de(ID_PROTOCOLE).genre).toBe('aucun')
  })

  it('la suggestion présélectionne sans choisir : un modèle du catalogue ou « aucun »', () => {
    expect(etatPrevus(lien(null, 'kumi'), [], modeles)).toEqual({
      genre: 'a_choisir',
      suggestion: 'kumi',
    })
    expect(etatPrevus(lien(null, 'aucun'), [], modeles)).toEqual({
      genre: 'a_choisir',
      suggestion: 'aucun',
    })
    // Une suggestion inconnue du catalogue lu n'est pas proposée.
    expect(etatPrevus(lien(null, 'tech'), [], modeles)).toEqual({
      genre: 'a_choisir',
      suggestion: null,
    })
    expect(etatPrevus(undefined, [], modeles)).toEqual({ genre: 'a_choisir', suggestion: null })
  })

  it('le nom ne décide plus : sans lien, des prévus créés ne valent pas un choix', () => {
    const indicateurs = lectures.indicateurs.filter(
      (indicateur) => indicateur.ministere_id === ID_EAGLES,
    )
    expect(etatPrevus(lien(null), indicateurs, modeles).genre).toBe('a_choisir')
  })

  it('la liste choisie fait foi, même si les prévus d’une autre liste sont sur la fiche', () => {
    const etat = etatPrevus(
      lien('kumi'),
      [{ modele_code: 'eagles_rencontres', etat: 'actif' }],
      modeles,
    )
    expect(etat).toMatchObject({ genre: 'a_creer', modifiable: true })
  })

  it('un prévu retiré ne renaît pas : il compte comme créé', () => {
    const etat = etatPrevus(
      lien('eagles'),
      [
        { modele_code: 'eagles_rencontres', etat: 'retire' },
        { modele_code: 'eagles_presents', etat: 'actif' },
      ],
      modeles,
    )
    expect(etat).toMatchObject({ genre: 'crees', modifiable: false })
  })

  it('des prévus tous retirés : « Créés », et la liste se change (correctif du 8 octobre 2026)', () => {
    const etat = etatPrevus(
      lien('eagles'),
      [
        { modele_code: 'eagles_rencontres', etat: 'retire' },
        { modele_code: 'eagles_presents', etat: 'retire' },
      ],
      modeles,
    )
    expect(etat).toMatchObject({ genre: 'crees', modifiable: true })
    expect(blocPrevusVisible(etat)).toBe(true)
  })

  it('une liste choisie absente du catalogue lu se lit comme « À choisir »', () => {
    expect(etatPrevus(lien('liste disparue'), [], modeles).genre).toBe('a_choisir')
  })

  it('le bloc de la fiche : à choisir, à créer et « Aucun prévu » ; pas une liste créée et suivie', () => {
    expect(blocPrevusVisible(de(ID_JEUNESSE))).toBe(true)
    expect(blocPrevusVisible(de(ID_KUMI))).toBe(true)
    expect(blocPrevusVisible(de(ID_PROTOCOLE))).toBe(true)
    expect(blocPrevusVisible(de(ID_COMMUNICATION))).toBe(false)
  })
})

describe('construireConfiguration : écran /indicateurs', () => {
  const configuration = construireConfiguration(lecturesExemple(), 'admin_eglise')
  const ligne = (nom: string) => configuration.lignes.find((candidate) => candidate.nom === nom)

  it('liste les ministères actifs par ordre alphabétique, jamais un désactivé', () => {
    expect(configuration.lignes.map((candidate) => candidate.nom)).toEqual([
      'Communication',
      'Eagles',
      'Jeunesse',
      'Kumi',
      'Protocole',
    ])
    expect(configuration.lignes.some((candidate) => candidate.id === ID_ANCIEN)).toBe(false)
  })

  it('phrases : actifs, ministères, ajout à valider, rappel de plus de 7 jours pour l’administration', () => {
    expect(configuration.phrases).toEqual([
      '8 indicateurs actifs pour 5 ministères.',
      '1 indicateur attend sa validation depuis plus de 7 jours. Prévenez EJP Tech.',
    ])
    expect(construireConfiguration(lecturesExemple(), 'admin_plateforme').phrases).toEqual([
      '8 indicateurs actifs pour 5 ministères.',
      '1 indicateur à valider.',
    ])
  })

  it('colonne « Indicateurs » : suivis sur 30, sans le détail des ajouts (T66, t325)', () => {
    expect(ligne('Communication')?.texteIndicateurs).toBe('5 sur 30')
    expect(ligne('Eagles')?.texteIndicateurs).toBe('2 sur 30')
    expect(ligne('Kumi')?.texteIndicateurs).toBe('0 sur 30')
  })

  it('colonne « Saisie » : le nombre d’indicateurs peu saisis, calculs et retirés exclus', () => {
    expect(ligne('Communication')?.peuSaisis).toBe(2)
    expect(ligne('Eagles')?.peuSaisis).toBe(1)
    expect(ligne('Jeunesse')?.peuSaisis).toBe(0)
    expect(ligne('Kumi')?.peuSaisis).toBe(0)
  })

  it('colonne « Dernier changement » : le geste le plus récent du journal, à l’heure de Paris', () => {
    expect(ligne('Communication')?.dernierChangement).toBe('5 oct.')
    expect(ligne('Eagles')?.dernierChangement).toBe('2 oct.')
    expect(ligne('Jeunesse')?.dernierChangement).toBeNull()
  })

  it('journal lu jusqu’à sa limite : un ministère sans geste lu n’affiche pas « Aucun » mais « Plus ancien »', () => {
    const lectures = lecturesExemple()
    const modele = lectures.changements[0]!
    lectures.changements = Array.from({ length: LIMITE_CHANGEMENTS }, () => ({
      ...modele,
      ministere_id: ID_COMMUNICATION,
    }))
    const resultat = construireConfiguration(lectures, 'admin_eglise')
    const dernier = (nom: string) =>
      resultat.lignes.find((candidate) => candidate.nom === nom)?.dernierChangement
    expect(dernier('Jeunesse')).toBe('Plus ancien')
    expect(dernier('Communication')).not.toBe('Plus ancien')
    expect(dernier('Communication')).not.toBeNull()
  })

  it('colonne « Prévus » : à créer, créés, à choisir, aucun prévu', () => {
    expect(ligne('Kumi')?.prevus.genre).toBe('a_creer')
    expect(ligne('Communication')?.prevus.genre).toBe('crees')
    expect(ligne('Jeunesse')?.prevus.genre).toBe('a_choisir')
    expect(ligne('Protocole')?.prevus.genre).toBe('aucun')
  })

  it('chaque ligne ouvre l’écran de son ministère', () => {
    expect(ligne('Kumi')?.href).toBe(`/indicateurs/${ID_KUMI}`)
  })

  it('un ministère désactivé ne compte ni dans les phrases ni dans le tableau', () => {
    const lectures = lecturesExemple()
    lectures.ministeres = lectures.ministeres.map((ministere) =>
      ministere.id === ID_JEUNESSE
        ? { ...ministere, desactive_le: '2026-09-30T10:00:00+00:00' }
        : ministere,
    )
    const resultat = construireConfiguration(lectures, 'admin_eglise')
    expect(resultat.lignes.some((candidate) => candidate.id === ID_JEUNESSE)).toBe(false)
    expect(resultat.phrases[0]).toBe('6 indicateurs actifs pour 4 ministères.')
  })

  it('aucun ministère actif : aucune ligne', () => {
    expect(
      construireConfiguration({ ...lecturesExemple(), ministeres: [] }, 'admin_eglise').lignes,
    ).toEqual([])
  })
})

describe('construireMinistere : écran /indicateurs/:id', () => {
  const donnees = construireMinistere(ID_COMMUNICATION, lecturesExemple())

  it('un ministère inconnu ou désactivé : null', () => {
    expect(construireMinistere('autre', lecturesExemple())).toBeNull()
    expect(construireMinistere(ID_ANCIEN, lecturesExemple())).toBeNull()
  })

  it('phrase du ministère : le nombre d’indicateurs suivis (T66, t329)', () => {
    expect(donnees?.phrase).toBe('5 indicateurs suivis.')
  })

  it('sections dans l’ordre : rythmes, puis calculs ; rangées par ordre alphabétique', () => {
    expect(
      donnees?.sections.map((section) => [section.titre, section.lignes.map((l) => l.libelle)]),
    ).toEqual([
      ['Chaque mois', ['Demandes reçues', 'Publications', 'Visuels livrés']],
      ['À ce jour', ['Projets en cours']],
      ['Calculs', ['Taux de demandes traitées']],
    ])
  })

  it('une ligne : usage, mentions, jamais une valeur', () => {
    const lignes = donnees?.sections.flatMap((section) => section.lignes) ?? []
    const demandes = lignes.find((l) => l.libelle === 'Demandes reçues')
    expect(demandes).toMatchObject({
      usage: 'Jamais saisi',
      peuSaisi: true,
      jamaisSaisi: true,
      mentions: ['Nom corrigé le 5 oct.'],
      aValider: null,
    })
    const publications = lignes.find((l) => l.libelle === 'Publications')
    expect(publications).toMatchObject({
      usage: 'Saisi 4 mois sur 5, dernier le 2 oct.',
      peuSaisi: false,
      mentions: [],
    })
    expect(JSON.stringify(donnees)).not.toMatch(/valeur/)
  })

  it('un ajout à valider : mentions, durée d’attente, jamais « peu saisi » faute de période attendue', () => {
    const lignes = donnees?.sections.flatMap((section) => section.lignes) ?? []
    const ajout = lignes.find((l) => l.libelle === 'Projets en cours')
    expect(ajout).toMatchObject({
      enAttente: true,
      aValider: 'À valider depuis 9 jours',
      mentions: ['Indicateur prévu', 'Ajouté par Communication le 28 sept.'],
      peuSaisi: false,
      jamaisSaisi: true,
    })
  })

  it('un calcul : aucun usage, aucune mention technique (la colonne de droite dit « Se calcule tout seul »)', () => {
    const calcul = donnees?.sections.at(-1)?.lignes[0]
    expect(calcul).toMatchObject({
      calcul: 'taux',
      usage: null,
      mentions: [],
      jamaisSaisi: false,
    })
  })

  it('retirés : rangés par rythme, avec la date et le motif', () => {
    expect(donnees?.retires).toEqual([
      {
        id: expect.any(String),
        libelle: 'Affiches distribuées',
        rythme: 'Chaque dimanche',
        detail: 'Retiré le 3 oct. : doublon.',
      },
      {
        id: expect.any(String),
        libelle: 'Événements couverts',
        rythme: 'Chaque mois',
        detail: 'Refusé le 1 oct.',
      },
    ])
  })

  it('prévus créés : le bloc « Indicateurs prévus » n’a rien à montrer', () => {
    expect(donnees?.prevus.genre).toBe('crees')
    expect(donnees?.sansIndicateur).toBe(false)
  })

  it('Kumi : 6 prévus à créer, aucun indicateur suivi, aucune phrase', () => {
    const kumi = construireMinistere(ID_KUMI, lecturesExemple())
    expect(kumi?.prevus.genre).toBe('a_creer')
    expect(kumi?.phrase).toBeNull()
    expect(kumi?.sansIndicateur).toBe(true)
    expect(kumi?.sections).toEqual([])
    expect(kumi?.modeles.map((modele) => modele.nom)).toContain('Film')
  })

  it('Jeunesse : « À choisir », ses indicateurs de l’église, mentions d’unité', () => {
    const jeunesse = construireMinistere(ID_JEUNESSE, lecturesExemple())
    expect(jeunesse?.prevus.genre).toBe('a_choisir')
    expect(jeunesse?.phrase).toBe('2 indicateurs suivis.')
    const mentions = jeunesse?.sections.flatMap((s) => s.lignes).map((l) => l.mentions)
    expect(mentions).toEqual([[`Grand nombre, jusqu'à ${nombre(9_999_999)}`], ['Compté en jours']])
  })

  it('Protocole : « Aucun prévu », rien à suivre', () => {
    const protocole = construireMinistere(ID_PROTOCOLE, lecturesExemple())
    expect(protocole?.prevus.genre).toBe('aucun')
    expect(protocole?.sansIndicateur).toBe(true)
  })

  it('un remplacement garde la trace de l’ancien : « Remplace « X » (chaque dimanche) »', () => {
    const lectures = lecturesExemple()
    const ancien = lectures.indicateurs.find((i) => i.libelle === 'Affiches distribuées')
    const nouveau = {
      ...lectures.indicateurs[0]!,
      id: '30000000-0000-4000-8000-000000000001',
      libelle: 'Affiches posées',
      remplace_id: ancien?.id ?? null,
    }
    lectures.indicateurs = [...lectures.indicateurs, nouveau]
    const resultat = construireMinistere(ID_COMMUNICATION, lectures)
    const ligne = resultat?.sections
      .flatMap((s) => s.lignes)
      .find((l) => l.libelle === 'Affiches posées')
    expect(ligne?.mentions).toContain('Remplace « Affiches distribuées » (chaque dimanche)')
  })
})

describe('apresCreation (aperçu) : « Créer » comme la base', () => {
  it('ajoute les prévus manquants, tout ou rien, et écrit la ligne de journal', () => {
    const { lectures, nombre } = apresCreation(
      lecturesExemple(),
      ID_KUMI,
      'kumi',
      '2026-10-07T10:00:00+00:00',
    )
    expect(nombre).toBe(6)
    const kumi = construireMinistere(ID_KUMI, lectures)
    expect(kumi?.prevus.genre).toBe('crees')
    expect(kumi?.sansIndicateur).toBe(false)
    expect(kumi?.phrase).toBe('6 indicateurs suivis.')
    expect(lectures.changements[0]).toMatchObject({
      ministere_id: ID_KUMI,
      action: 'indicateurs_prevus_crees',
    })
  })

  it('un second « Créer » n’ajoute rien (aucun doublon)', () => {
    const premier = apresCreation(lecturesExemple(), ID_KUMI, 'kumi', '2026-10-07T10:00:00+00:00')
    const second = apresCreation(premier.lectures, ID_KUMI, 'kumi', '2026-10-07T10:05:00+00:00')
    expect(second.nombre).toBe(0)
  })

  it('« Aucun prévu » : aucun indicateur, la fiche sans liste reçoit « aucun », comme la base', () => {
    const { lectures, nombre } = apresCreation(
      lecturesExemple(),
      ID_JEUNESSE,
      'aucun',
      '2026-10-07T10:00:00+00:00',
    )
    expect(nombre).toBe(0)
    expect(lectures.liens.find((lien) => lien.ministere_id === ID_JEUNESSE)?.modele).toBe('aucun')
    expect(construireMinistere(ID_JEUNESSE, lectures)?.prevus.genre).toBe('aucun')
  })
})

describe('apresChoix (aperçu) : « Enregistrer le choix » comme la base (T72)', () => {
  it('la liste choisie remplace la précédente, avec sa ligne de journal {avant, apres}', () => {
    const lectures = apresChoix(lecturesExemple(), ID_JEUNESSE, 'film', '2026-10-07T10:00:00+00:00')
    const jeunesse = construireMinistere(ID_JEUNESSE, lectures)
    expect(jeunesse?.prevus).toMatchObject({ genre: 'a_creer', modifiable: true })
    expect(lectures.changements[0]).toEqual({
      ministere_id: ID_JEUNESSE,
      le: '2026-10-07T10:00:00+00:00',
      action: 'modele_prevus_choisi',
      detail: { avant: null, apres: 'film' },
    })
    expect(lectures.liens.filter((lien) => lien.ministere_id === ID_JEUNESSE)).toHaveLength(1)
  })

  it('« Aucun prévu » se change en liste', () => {
    const lectures = apresChoix(
      lecturesExemple(),
      ID_PROTOCOLE,
      'film',
      '2026-10-07T10:00:00+00:00',
    )
    expect(construireMinistere(ID_PROTOCOLE, lectures)?.prevus.genre).toBe('a_creer')
    expect(lectures.changements[0]?.detail).toEqual({ avant: 'aucun', apres: 'film' })
  })
})
