import { describe, expect, it } from 'vitest'
import { construirePoints } from '@/features/points/construirePoints'
import {
  COMMUNICATION,
  COORDINATION,
  LECTURES_EXEMPLE_POINTS,
  lecturesDuMinistere,
  lecturesSansPoint,
  SOCIAL,
} from '@/features/points/apercu/exemplesPoints'

const titres = (lignes: { titre: { texte: string } }[]) => lignes.map((ligne) => ligne.titre.texte)

describe('construirePoints : les onglets', () => {
  const donnees = construirePoints(LECTURES_EXEMPLE_POINTS, 'berger', null)

  it('Ouverts : priorité, puis échéance, puis création', () => {
    expect(titres(donnees.ouverts)).toEqual([
      'Financement de Welcome Prodiges',
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
      'Visuels pour Welcome Prodiges',
      'Renfort de 4 STARs pour la sortie',
    ])
  })

  it('Traités : du plus récent au plus ancien traitement', () => {
    expect(titres(donnees.traites)).toEqual([
      "Micros pour Bâtir l'Église",
      'Transport des Prodiges Junior',
      'Clés de la salle annexe',
      'Lieu de stockage de la collecte',
    ])
  })

  it('« Traités récemment » : les 5 derniers traités au plus', () => {
    expect(donnees.recents).toHaveLength(4)
    const beaucoup = {
      ...LECTURES_EXEMPLE_POINTS,
      points: [
        ...LECTURES_EXEMPLE_POINTS.points,
        ...LECTURES_EXEMPLE_POINTS.points
          .filter((point) => point.statut === 'traite')
          .map((point) => ({ ...point, id: `${point.id}-bis` })),
      ],
    }
    const plein = construirePoints(beaucoup, 'berger', null)
    expect(plein.traites).toHaveLength(8)
    expect(plein.recents).toHaveLength(5)
    expect(plein.recents.map((ligne) => ligne.id)).toEqual(
      plein.traites.slice(0, 5).map((ligne) => ligne.id),
    )
  })

  it('aucun point : trois listes vides', () => {
    const vide = construirePoints(lecturesSansPoint(LECTURES_EXEMPLE_POINTS), 'berger', null)
    expect(vide.ouverts).toEqual([])
    expect(vide.traites).toEqual([])
    expect(vide.recents).toEqual([])
  })
})

describe('construirePoints : une rangée', () => {
  const donnees = construirePoints(LECTURES_EXEMPLE_POINTS, 'berger', null)
  const rangee = (id: string) => {
    const trouvee = [...donnees.ouverts, ...donnees.traites].find((ligne) => ligne.id === id)
    if (!trouvee) throw new Error(`Rangée ${id} absente`)
    return trouvee
  }

  it('statut, ministère créateur et mentions par leurs noms complets', () => {
    const salle = rangee('p-salle')
    expect(salle.statutLibelle).toBe('En cours')
    expect(salle.ministere).toBe('Communication')
    expect(salle.mentions).toEqual(['Coordination'])
    expect(rangee('p-financement').statutLibelle).toBe('En attente de décision')
    expect(rangee('p-financement').mentions).toEqual([])
  })

  it('un ministère désactivé garde son nom, avec « (désactivé) »', () => {
    expect(rangee('p-renfort').mentions).toEqual(['Social (désactivé)'])
    expect(rangee('p-stockage').ministere).toBe('Social (désactivé)')
  })

  it('échéance : le mot « dépassée » accompagne la couleur, jamais seul', () => {
    expect(rangee('p-planning').echeance).toEqual({ texte: '28 sept., dépassée', depassee: true })
    expect(rangee('p-financement').echeance).toEqual({ texte: '5 oct.', depassee: false })
  })

  it('l’échéance se compare au jour de Paris donné, pas à la date du navigateur', () => {
    const lendemain = { ...LECTURES_EXEMPLE_POINTS, aujourdhui: '2026-10-06' }
    const apres = construirePoints(lendemain, 'berger', null)
    expect(apres.ouverts.find((ligne) => ligne.id === 'p-financement')?.echeance).toEqual({
      texte: '5 oct., dépassée',
      depassee: true,
    })
  })

  it('un point traité : pas d’échéance, « Traité le … par … » et son commentaire', () => {
    const micros = rangee('p-micros')
    expect(micros.echeance).toBeNull()
    expect(micros.statutLibelle).toBe('Traité')
    expect(micros.traite).toEqual({
      texte: 'Traité le 26 sept. par Berger',
      auteur: 'Berger',
      commentaire: null,
    })
    expect(rangee('p-transport').traite).toMatchObject({
      texte: 'Traité le 24 sept. par Conseil, compte 3',
      commentaire: {
        texte: "Deux véhicules de l'église assurent le transport jusqu'à fin octobre.",
        masque: false,
      },
    })
  })

  it('l’auteur d’un compte de ministère est le nom du ministère, pas le libellé du compte', () => {
    expect(rangee('p-cles').traite?.texte).toBe('Traité le 21 sept. par Coordination')
  })

  it('un auteur illisible : « Traité le 30 sept. » sans « par »', () => {
    const sansAuteur = { ...LECTURES_EXEMPLE_POINTS, auteurs: [] }
    const resultat = construirePoints(sansAuteur, 'berger', null)
    expect(resultat.traites[0]?.traite).toMatchObject({ texte: 'Traité le 26 sept.', auteur: null })
  })

  it('un traitement est daté du jour de Paris, même près de minuit', () => {
    const tard = {
      ...LECTURES_EXEMPLE_POINTS,
      points: LECTURES_EXEMPLE_POINTS.points.map((point) =>
        point.id === 'p-micros' ? { ...point, traite_le: '2026-09-26T22:30:00Z' } : point,
      ),
    }
    const resultat = construirePoints(tard, 'berger', null)
    expect(resultat.traites.find((ligne) => ligne.id === 'p-micros')?.traite?.texte).toBe(
      'Traité le 27 sept. par Berger',
    )
  })

  it('un texte masqué par EJP Tech est signalé (affiché en encre 3)', () => {
    expect(rangee('p-stockage').description).toEqual({
      texte: '[texte masqué par EJP Tech]',
      masque: true,
    })
    expect(rangee('p-salle').description?.masque).toBe(false)
  })

  it('les boutons reçoivent des identifiants : point, créateur et ministères mentionnés', () => {
    expect(rangee('p-salle').actions).toEqual({
      id: 'p-salle',
      titre: { texte: 'Salle pour la soirée de louange', masque: false },
      statut: 'en_cours',
      ministereId: COMMUNICATION,
      mentions: [COORDINATION],
    })
  })
})

describe('construirePoints : le filtre « Tous les ministères »', () => {
  it('garde les points créés par le ministère choisi ou qui le mentionnent', () => {
    const donnees = construirePoints(LECTURES_EXEMPLE_POINTS, 'berger', COORDINATION)
    expect(donnees.ministereChoisi).toEqual({ id: COORDINATION, nom: 'Coordination' })
    // Créés : Planning, Clés. Mentionnée : Salle, Lieu de stockage.
    expect(titres(donnees.ouverts)).toEqual([
      'Planning du trimestre à valider',
      'Salle pour la soirée de louange',
    ])
    expect(titres(donnees.traites)).toEqual([
      'Clés de la salle annexe',
      'Lieu de stockage de la collecte',
    ])
  })

  it('les nombres des onglets suivent le filtre', () => {
    const donnees = construirePoints(LECTURES_EXEMPLE_POINTS, 'conseil', COMMUNICATION)
    expect(donnees.ouverts).toHaveLength(2)
    expect(donnees.traites).toHaveLength(1)
  })

  it('un identifiant inconnu vaut « Tous les ministères »', () => {
    const donnees = construirePoints(LECTURES_EXEMPLE_POINTS, 'berger', 'n-importe-quoi')
    expect(donnees.ministereChoisi).toBeNull()
    expect(donnees.ouverts).toHaveLength(5)
  })

  it('les choix : les ministères actifs, plus un désactivé seulement s’il a un point', () => {
    const donnees = construirePoints(LECTURES_EXEMPLE_POINTS, 'berger', null)
    expect(donnees.ministeres?.map((option) => option.nom)).toEqual([
      'Communication',
      'Coordination',
      'Intégration',
      'Jeunesse',
      'Prodiges Junior',
      'Social (désactivé)',
    ])
    const sansSocial = {
      ...LECTURES_EXEMPLE_POINTS,
      points: LECTURES_EXEMPLE_POINTS.points.filter((point) => point.ministere_id !== SOCIAL),
      mentions: LECTURES_EXEMPLE_POINTS.mentions.filter(
        (mention) => mention.ministere_id !== SOCIAL,
      ),
    }
    const sans = construirePoints(sansSocial, 'berger', null)
    expect(sans.ministeres?.map((option) => option.nom)).not.toContain('Social (désactivé)')
  })

  it('un ministère n’a pas de filtre : « Mes points » montre ce que la base lui laisse lire', () => {
    const lectures = lecturesDuMinistere(LECTURES_EXEMPLE_POINTS, COMMUNICATION)
    // Créés : Salle, Micros. Mentionné : Visuels.
    const donnees = construirePoints(lectures, 'ministere', COORDINATION)
    expect(donnees.ministeres).toBeNull()
    expect(donnees.ministereChoisi).toBeNull()
    expect(titres(donnees.ouverts)).toEqual([
      'Salle pour la soirée de louange',
      'Visuels pour Welcome Prodiges',
    ])
    expect(titres(donnees.traites)).toEqual(["Micros pour Bâtir l'Église"])
  })
})
