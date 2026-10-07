import { describe, expect, it } from 'vitest'
import { choisirSession, construireCetteSemaine, sessionsAffichables } from './construire'
import { exempleCetteSemaine, exemplePremierDimanche, MINISTERE_EXEMPLE } from './exemple'
import { lecturesExemple, lecturesPremierDimanche } from './lecturesExemple'
import { TEXTE_MASQUE, TEXTES_VIDES } from './textesVides'
import type { DonneesBergerConseil, DonneesCetteSemaine, DonneesMinistere, Lecteur } from './types'

const berger: Lecteur = { profil: 'berger' }
const conseil: Lecteur = { profil: 'conseil' }
const ejpTech: Lecteur = { profil: 'admin_plateforme' }
const admin: Lecteur = { profil: 'admin_eglise' }
const ministere: Lecteur = { profil: 'ministere', ministereId: MINISTERE_EXEMPLE }

function parId(donnees: DonneesCetteSemaine, id: string) {
  const ligne = donnees.chiffres.find((chiffre) => chiffre.id === id)
  if (!ligne) throw new Error(`Ligne absente : ${id}`)
  return ligne
}

function bergerConseil(donnees: DonneesCetteSemaine): DonneesBergerConseil {
  if (
    donnees.profil !== 'berger' &&
    donnees.profil !== 'conseil' &&
    donnees.profil !== 'admin_plateforme'
  ) {
    throw new Error('profil')
  }
  return donnees
}

function textesPhrase(donnees: DonneesCetteSemaine): string {
  return donnees.phrase.map((morceau) => morceau.texte).join('')
}

describe("jeu d'exemple : valeurs du BRIEF", () => {
  const donnees = construireCetteSemaine(lecturesExemple(), berger, null)

  it('semaine 39, du 21 au 27 sept.', () => {
    expect(donnees.semaine).toEqual({ numero: 39, periode: 'du 21 au 27 sept.' })
  })

  it('52 STARs au service, 6 sur 8, +3 sur 6', () => {
    const service = parId(donnees, 'service')
    expect(service.valeur).toEqual({ etat: 'saisie', texte: '52', unite: null })
    expect(service.completude).toEqual({ texte: '6 sur 8', complet: false })
    expect(service.ecart?.texte).toBe('+3')
    expect(service.ecart?.sens).toBe('hausse')
    expect(service.ecart?.description).toBe(
      '+3 par rapport à dimanche dernier, pour les 6 ministères qui ont saisi les deux fois',
    )
    expect(service.date).toBe('Dimanche 27 sept.')
    expect(service.dateCourte).toBe('Dim. 27 sept.')
  })

  it('la courbe du service : dix dimanches, les quatre derniers incomplets', () => {
    const courbe = parId(donnees, 'service').courbe
    expect(courbe?.points.map((point) => point.valeur)).toEqual([
      52, 57, 53, 56, 54, 56, 50, 54, 55, 52,
    ])
    expect(courbe?.points.map((point) => point.incomplet === true)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ])
    expect(courbe?.description).toBe(
      'Dix derniers dimanches : 52, 57, 53, 56, 54, 56, 50, 54, 55, 52. Les quatre derniers sont incomplets.',
    )
  })

  it('83 STARs actifs, 8 sur 8, une valeur de plus de 30 jours signalée', () => {
    const actifs = parId(donnees, 'actifs')
    expect(actifs.valeur).toEqual({ etat: 'saisie', texte: '83', unite: null })
    expect(actifs.completude).toEqual({ texte: '8 sur 8', complet: true })
    expect(actifs.date).toBe('À ce jour, 1 valeur de plus de 30 jours')
    expect(actifs.dateSignalee).toBe(true)
  })

  it('64 sur 83, 77 %, 8 sur 8', () => {
    const enFij = parId(donnees, 'en_fij')
    expect(enFij.valeur).toEqual({ etat: 'saisie', texte: '77', unite: '%' })
    expect(enFij.date).toBe('64 sur 83 STARs actifs')
    expect(enFij.completude).toEqual({ texte: '8 sur 8', complet: true })
  })

  it('carte des FIJ : 29, 8 départements, saisi le 21 sept. (heure de Paris)', () => {
    const ligne = parId(donnees, 'carte_fij')
    expect(ligne.valeur).toEqual({ etat: 'saisie', texte: '29', unite: null })
    expect(ligne.completude).toEqual({ texte: '8 dép.', complet: true })
    expect(ligne.date).toBe('Saisi par FIJ le 21 sept.')
    expect(donnees.carte?.total).toBe(29)
    expect(donnees.carte?.departements.map((d) => `${d.code}:${d.valeur}`)).toEqual([
      '75:4',
      '77:3',
      '78:2',
      '91:3',
      '92:5',
      '93:6',
      '94:4',
      '95:2',
    ])
  })

  it("Bâtir l'Église : 58, 6 sur 8, +1 sur 6 par rapport à la session du 29 août", () => {
    const batir = parId(donnees, 'batir')
    expect(batir.valeur).toEqual({ etat: 'saisie', texte: '58', unite: null })
    expect(batir.completude).toEqual({ texte: '6 sur 8', complet: false })
    expect(batir.ecart?.texte).toBe('+1')
    expect(batir.ecart?.description).toBe(
      '+1 par rapport à la session du 29 août, pour les 6 ministères qui ont saisi les deux fois',
    )
    expect(batir.date).toBe('Samedi 26 sept.')
    expect(batir.courbe?.points.map((point) => point.valeur)).toEqual([63, 66, 72, 58])
    expect(batir.courbe?.description).toBe(
      'Quatre dernières sessions : 63, 66, 72, 58. La dernière est incomplète.',
    )
  })

  it('Anti-Dispersion : 61, 8 sur 8, +2 sur 8', () => {
    const anti = parId(donnees, 'anti_dispersion')
    expect(anti.valeur).toEqual({ etat: 'saisie', texte: '61', unite: null })
    expect(anti.completude).toEqual({ texte: '8 sur 8', complet: true })
    expect(anti.ecart?.description).toBe(
      '+2 par rapport à la session du 22 août, pour les 8 ministères qui ont saisi les deux fois',
    )
    expect(anti.courbe?.description).toBe('Quatre dernières sessions : 50, 53, 59, 61.')
  })

  it('À décider : en attente de décision, puis priorité, puis échéance', () => {
    expect(bergerConseil(donnees).aDecider.points.map((point) => point.id)).toEqual([
      'financement-welcome',
      'planning-trimestre',
      'salle-louange',
    ])
  })

  it('la phrase de la semaine surligne la partie C', () => {
    expect(donnees.phrase).toEqual([
      { texte: "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et " },
      { texte: 'un point attend votre décision', aDecider: true },
      { texte: '.' },
    ])
    expect(donnees.ligneSecondaire).toBe(
      "Bâtir l'Église progresse de 1 présent, et le total est incomplet : Coordination et Intégration n'ont pas saisi.",
    )
  })

  it('« Les ministères » du moins récent au plus récent', () => {
    expect(donnees.ministeres.map((m) => `${m.nom} : ${m.fraicheur.libelle}`)).toEqual([
      'Social : Il y a 24 jours',
      'Communication : Il y a 3 jours',
      'EJP Formation : Il y a 3 jours',
      'FIJ : Il y a 3 jours',
      'Jeunesse : Il y a 3 jours',
      'Prodiges Junior : Il y a 3 jours',
      'Coordination : Il y a 2 jours',
      'Intégration : Hier',
    ])
    expect(donnees.ministeres[0]?.fraicheur.etat).toBe('a_surveiller')
  })
})

describe("un profil, la même vue que l'exemple de l'aperçu", () => {
  // Les liens vers les autres types : l'aperçu garde des adresses d'aperçu.
  function sansLiens(donnees: DonneesCetteSemaine) {
    return {
      ...donnees,
      session:
        donnees.session.etat === 'session'
          ? { ...donnees.session, session: { ...donnees.session.session, autres: [] } }
          : donnees.session,
    }
  }

  it.each([berger, conseil, ejpTech] as const)(
    '%j : cinq colonnes, À décider, fiches',
    (lecteur) => {
      const construit = construireCetteSemaine(lecturesExemple(), lecteur, null)
      expect(sansLiens(construit)).toEqual(sansLiens(exempleCetteSemaine(lecteur.profil)))
      expect(construit.ministeres.every((m) => m.href?.startsWith('/ministeres/'))).toBe(true)
    },
  )

  it('EJP Tech : le contenu du berger, seuls le profil et la lecture seule changent (T29)', () => {
    const duBerger = bergerConseil(construireCetteSemaine(lecturesExemple(), berger, null))
    const dEjpTech = bergerConseil(construireCetteSemaine(lecturesExemple(), ejpTech, null))
    expect(duBerger.lectureSeule).toBe(false)
    expect(dEjpTech.lectureSeule).toBe(true)
    expect(dEjpTech.profil).toBe('admin_plateforme')
    expect({ ...dEjpTech, profil: 'berger', lectureSeule: false }).toEqual(duBerger)
    expect(dEjpTech.aDecider.points).toHaveLength(3)
    expect(dEjpTech.ministeres.every((m) => m.conseil !== null)).toBe(true)
    expect(
      bergerConseil(construireCetteSemaine(lecturesExemple(), conseil, null)).lectureSeule,
    ).toBe(false)
  })

  it('administration : sans C ni surligneur, sans lien ni colonnes du conseil, sans À décider', () => {
    const construit = construireCetteSemaine(lecturesExemple(), admin, null)
    expect(sansLiens(construit)).toEqual(sansLiens(exempleCetteSemaine('admin_eglise')))
    expect(construit.phrase.some((morceau) => morceau.aDecider === true)).toBe(false)
    expect(textesPhrase(construit)).not.toContain('décision')
    expect(construit.ministeres.every((m) => m.href === null && m.conseil === null)).toBe(true)
    expect('aDecider' in construit).toBe(false)
  })

  it('ministère : seul son nom ouvre « Ma fiche », trois chiffres de résumé', () => {
    const construit = construireCetteSemaine(lecturesExemple(), ministere, null)
    expect(sansLiens(construit)).toEqual(sansLiens(exempleCetteSemaine('ministere')))
    expect(construit.ministeres.filter((m) => m.href !== null).map((m) => m.href)).toEqual([
      '/ma-fiche',
    ])
    const { resume } = construit as DonneesMinistere
    expect(resume.map((ligne) => ligne.id)).toEqual(['service', 'en_fij', 'derniere_session'])
  })

  it('le ministère ne lit pas les points : aucune échéance à décider dans sa phrase', () => {
    const lectures = lecturesExemple()
    lectures.points = null
    const construit = construireCetteSemaine(lectures, ministere, null)
    expect(textesPhrase(construit)).toBe(
      "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi.",
    )
  })
})

describe('bloc de la session', () => {
  it("la dernière session, avec ses apports triés (T21) et un lien vers l'autre type", () => {
    const donnees = construireCetteSemaine(lecturesExemple(), berger, null)
    if (donnees.session.etat !== 'session') throw new Error('état')
    const { session } = donnees.session
    expect(session.titre).toBe("Bâtir l'Église, samedi 26 septembre")
    expect(session.total).toBe(58)
    expect([session.saisis, session.attendus]).toEqual([6, 8])
    expect(session.apports.map((a) => `${a.ministere}:${a.valeur}`)).toEqual([
      'Communication:13',
      'Jeunesse:13',
      'FIJ:10',
      'Prodiges Junior:8',
      'EJP Formation:7',
      'Social:7',
      'Coordination:null',
      'Intégration:null',
    ])
    expect(session.noteDoubleCompte).toBeNull()
    expect(session.autres).toEqual([
      { libelle: 'Voir Anti-Dispersion', href: '/?session=anti_dispersion' },
    ])
  })

  it('?session=anti_dispersion montre la plus récente de ce type (T20)', () => {
    const donnees = construireCetteSemaine(lecturesExemple(), berger, 'anti_dispersion')
    if (donnees.session.etat !== 'session') throw new Error('état')
    expect(donnees.session.session.titre).toBe('Anti-Dispersion, samedi 19 septembre')
    expect(donnees.session.session.total).toBe(61)
    expect(donnees.session.session.autres).toEqual([
      { libelle: "Voir Bâtir l'Église", href: '/?session=batir' },
    ])
  })

  it('un autre rassemblement a un lien « Voir les autres rassemblements »', () => {
    const lectures = lecturesExemple()
    lectures.sessions.unshift({
      session_id: 's-autre',
      type: 'autre',
      date: '2026-09-28',
      intitule: 'Soirée des parents',
      a_eu_lieu: true,
      nb_attendus: 2,
      nb_saisis: 2,
      total_saisi: 30,
      total: 30,
      manquants: [],
    })
    const donnees = construireCetteSemaine(lectures, berger, 'batir')
    if (donnees.session.etat !== 'session') throw new Error('état')
    expect(donnees.session.session.autres.map((lien) => lien.href)).toEqual([
      '/?session=anti_dispersion',
      '/?session=autre',
    ])
    const autre = construireCetteSemaine(lectures, berger, null)
    if (autre.session.etat !== 'session') throw new Error('état')
    expect(autre.session.session.titre).toBe('Soirée des parents, lundi 28 septembre')
  })

  it('choisirSession : type choisi, sinon la plus récente', () => {
    const { sessions } = lecturesExemple()
    expect(choisirSession(sessions, null)?.session_id).toBe('s-b4')
    expect(choisirSession(sessions, 'anti_dispersion')?.session_id).toBe('s-a4')
    expect(choisirSession(sessions, 'autre')).toBeNull()
    expect(choisirSession([], null)).toBeNull()
  })

  it('sessionsAffichables : la dernière session de chaque type, toutes lues en une fois', () => {
    const { sessions } = lecturesExemple()
    expect(sessionsAffichables(sessions)).toEqual(['s-b4', 's-a4'])
    expect(sessionsAffichables([])).toEqual([])
    // Chaque choix de `?session=` tombe sur une session dont les participations sont lues.
    for (const type of [null, 'batir', 'anti_dispersion'] as const) {
      expect(sessionsAffichables(sessions)).toContain(choisirSession(sessions, type)?.session_id)
    }
  })

  it('la note du double compte quand des STARs sont saisis par deux ministères', () => {
    const lectures = lecturesExemple()
    const batir = lectures.sessions[0]
    if (!batir) throw new Error('session')
    batir.total_saisi = 61
    batir.total = 58
    const donnees = construireCetteSemaine(lectures, berger, null)
    if (donnees.session.etat !== 'session') throw new Error('état')
    expect(donnees.session.session.noteDoubleCompte).toBe(
      "61 présences saisies : 3 STARs saisis par deux ministères ne sont comptés qu'une fois.",
    )
  })

  it('un apport diffère des présents saisis : « (13 saisis) »', () => {
    const lectures = lecturesExemple()
    const participation = lectures.participations.find((p) => p.ministere_id === 'com')
    if (!participation) throw new Error('participation')
    participation.deja_comptes = 3
    participation.compte_dans_total = 10
    const donnees = construireCetteSemaine(lectures, berger, null)
    if (donnees.session.etat !== 'session') throw new Error('état')
    const apport = donnees.session.session.apports.find((a) => a.ministere === 'Communication')
    expect(apport).toEqual({ ministere: 'Communication', valeur: 10, saisis: 13 })
  })
})

describe('états vides : premier dimanche', () => {
  it.each([berger, conseil, admin, ministere] as const)(
    '%j : tout dit ce qui manque',
    (lecteur) => {
      const donnees = construireCetteSemaine(lecturesPremierDimanche(), lecteur, null)
      expect(donnees).toEqual(exemplePremierDimanche(lecteur.profil))
    },
  )

  it('aucun point ouvert, aucune session, aucune carte, aucun événement', () => {
    const donnees = bergerConseil(construireCetteSemaine(lecturesPremierDimanche(), berger, null))
    expect(donnees.aDecider.points).toEqual([])
    expect(donnees.aDecider.urgent).toBe(false)
    expect(donnees.session).toEqual({ etat: 'aucune_session' })
    expect(donnees.carte).toBeNull()
    expect(donnees.ligneSecondaire).toBeNull()
    expect(donnees.ministeres.every((m) => m.prochainEvenement.etat === 'aucun')).toBe(true)
    expect(donnees.ministeres.every((m) => m.fraicheur.libelle === 'Aucune saisie')).toBe(true)
  })

  it('un type de session sans session garde sa ligne « Pas encore de saisie »', () => {
    const donnees = construireCetteSemaine(lecturesPremierDimanche(), berger, null)
    const anti = parId(donnees, 'anti_dispersion')
    expect(anti.valeur).toEqual({ etat: 'vide' })
    expect(anti.date).toBe(TEXTES_VIDES.chiffres.dateSansSession)
    expect(anti.completude).toBeNull()
    expect(anti.ecart).toBeNull()
    expect(anti.courbe).toBeNull()
  })

  it('la liste des ministères vide reste une liste vide', () => {
    const lectures = lecturesPremierDimanche()
    lectures.tableauMinisteres = []
    const donnees = construireCetteSemaine(lectures, berger, null)
    expect(donnees.ministeres).toEqual([])
    expect(parId(donnees, 'service').completude).toEqual({ texte: '0 sur 8', complet: false })
  })
})

describe('états vides : cas particuliers', () => {
  it('pourcentage FIJ : ligne sans pourcentage donne « Non calculé »', () => {
    const lectures = lecturesExemple()
    lectures.pourcentageFij = { en_fij: 0, actifs: 0, nb_ministeres: 2, pourcentage: null }
    const enFij = parId(construireCetteSemaine(lectures, berger, null), 'en_fij')
    expect(enFij.valeur).toEqual({ etat: 'non_calcule' })
    expect(enFij.completude).toEqual({ texte: '2 sur 8', complet: false })
  })

  it('pourcentage FIJ : aucune ligne, valeur vide avec « 0 sur 8 »', () => {
    const lectures = lecturesExemple()
    lectures.pourcentageFij = null
    const enFij = parId(construireCetteSemaine(lectures, berger, null), 'en_fij')
    expect(enFij.valeur).toEqual({ etat: 'vide' })
    expect(enFij.date).toBe('À ce jour')
    expect(enFij.completude).toEqual({ texte: '0 sur 8', complet: false })
  })

  it('un dimanche sans total : trou dans la courbe et description « sans saisie »', () => {
    const lectures = lecturesExemple()
    const quatrieme = lectures.totauxDimanche[3]
    if (!quatrieme) throw new Error('dimanche')
    quatrieme.total = null
    quatrieme.nb_saisis = 0
    const courbe = parId(construireCetteSemaine(lectures, berger, null), 'service').courbe
    expect(courbe?.points[3]).toEqual({ valeur: null })
    expect(courbe?.description).toContain('53, sans saisie, 54')
  })

  it('service du dimanche de référence sans saisie : vide, sans écart, courbe conservée', () => {
    const lectures = lecturesExemple()
    const dernier = lectures.totauxDimanche[9]
    if (!dernier) throw new Error('dimanche')
    dernier.total = null
    dernier.nb_saisis = 0
    const donnees = construireCetteSemaine(lectures, berger, null)
    const service = parId(donnees, 'service')
    expect(service.valeur).toEqual({ etat: 'vide' })
    expect(service.ecart).toBeNull()
    expect(service.completude).toEqual({ texte: '0 sur 8', complet: false })
    expect(service.courbe?.points).toHaveLength(10)
    expect(textesPhrase(donnees)).toContain(
      "Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept.",
    )
  })

  it('actifs sans ligne : « Pas encore de saisie », date « À ce jour »', () => {
    const lectures = lecturesExemple()
    lectures.totauxACeJour = lectures.totauxACeJour.filter((total) => total.code !== 'actifs')
    const actifs = parId(construireCetteSemaine(lectures, berger, null), 'actifs')
    expect(actifs.valeur).toEqual({ etat: 'vide' })
    expect(actifs.date).toBe(TEXTES_VIDES.chiffres.dateAceJour)
    expect(actifs.dateSignalee).toBe(false)
    expect(actifs.completude).toEqual({ texte: '0 sur 8', complet: false })
  })

  it('carte partielle : les départements sans valeur restent nuls', () => {
    const lectures = lecturesExemple()
    lectures.carteFij = lectures.carteFij.slice(0, 3)
    const donnees = construireCetteSemaine(lectures, berger, null)
    expect(parId(donnees, 'carte_fij').completude).toEqual({ texte: '3 dép.', complet: false })
    expect(donnees.carte?.total).toBe(9)
    expect(donnees.carte?.departements.filter((d) => d.valeur === null)).toHaveLength(5)
  })

  it('session passée sans saisie : total nul (jamais 0), trou dans la courbe', () => {
    const lectures = lecturesExemple()
    lectures.sessions.unshift({
      session_id: 's-b5',
      type: 'batir',
      date: '2026-09-29',
      intitule: null,
      a_eu_lieu: true,
      nb_attendus: 8,
      nb_saisis: 0,
      total_saisi: 0,
      total: 0,
      manquants: ['Communication', 'Social'],
    })
    lectures.participations = []
    const donnees = construireCetteSemaine(lectures, berger, null)
    if (donnees.session.etat !== 'session') throw new Error('état')
    expect(donnees.session.session.total).toBeNull()
    expect(donnees.session.session.noteDoubleCompte).toBeNull()
    expect(donnees.session.session.apports).toEqual([
      { ministere: 'Communication', valeur: null, saisis: null },
      { ministere: 'Social', valeur: null, saisis: null },
    ])
    const batir = parId(donnees, 'batir')
    expect(batir.valeur).toEqual({ etat: 'vide' })
    expect(batir.ecart).toBeNull()
    expect(batir.completude).toEqual({ texte: '0 sur 8', complet: false })
    expect(batir.courbe?.points.map((point) => point.valeur)).toEqual([66, 72, 58, null])
    expect(batir.courbe?.description).toContain('66, 72, 58, sans saisie')
  })

  it("une courbe de session sans aucune saisie n'existe pas", () => {
    const lectures = lecturesExemple()
    lectures.sessions = [
      {
        session_id: 's-x',
        type: 'batir',
        date: '2026-09-26',
        intitule: null,
        a_eu_lieu: true,
        nb_attendus: 8,
        nb_saisis: 0,
        total_saisi: 0,
        total: 0,
        manquants: [],
      },
    ]
    lectures.ecartsSessions = []
    lectures.participations = []
    const batir = parId(construireCetteSemaine(lectures, berger, null), 'batir')
    expect(batir.courbe).toBeNull()
    expect(batir.valeur).toEqual({ etat: 'vide' })
  })

  it('type choisi sans session : état dédié, avec les liens des types qui en ont une', () => {
    const lectures = lecturesExemple()
    lectures.sessions = lectures.sessions.filter((s) => s.type === 'batir')
    const donnees = construireCetteSemaine(lectures, berger, 'anti_dispersion')
    expect(donnees.session).toEqual({
      etat: 'aucune_session_du_type',
      type: 'anti_dispersion',
      titre: 'Anti-Dispersion',
      autres: [{ libelle: "Voir Bâtir l'Église", href: '/?session=batir' }],
    })
    expect(parId(donnees, 'anti_dispersion').valeur).toEqual({ etat: 'vide' })
  })

  it('type choisi sans aucune session passée : aucun lien', () => {
    const donnees = construireCetteSemaine(lecturesPremierDimanche(), berger, 'autre')
    expect(donnees.session).toEqual({
      etat: 'aucune_session_du_type',
      type: 'autre',
      titre: 'Autre rassemblement',
      autres: [],
    })
  })

  it('ministère sans session : le résumé garde sa troisième ligne vide, au libellé habituel', () => {
    const donnees = construireCetteSemaine(lecturesPremierDimanche(), ministere, null)
    const { resume } = donnees as DonneesMinistere
    expect(resume[2]).toMatchObject({
      id: 'derniere_session',
      libelle: "Présents à Bâtir l'Église",
      valeur: { etat: 'vide' },
      date: TEXTES_VIDES.chiffres.dateSansSession,
      completude: null,
    })
  })

  it("l'écart du dimanche vient de la ligne du dimanche de référence seulement", () => {
    const lectures = lecturesExemple()
    lectures.ecartsDimanche = [
      { indicateur_id: 'ind-service', dimanche: '2026-09-20', ecart: -2, nb_comparables: 5 },
    ]
    expect(parId(construireCetteSemaine(lectures, berger, null), 'service').ecart).toBeNull()
  })

  it('écart négatif : signe moins, jamais un tiret', () => {
    const lectures = lecturesExemple()
    lectures.ecartsDimanche = [
      { indicateur_id: 'ind-service', dimanche: '2026-09-27', ecart: -3, nb_comparables: 6 },
    ]
    const ecart = parId(construireCetteSemaine(lectures, berger, null), 'service').ecart
    expect(ecart?.texte).toBe('−3')
    expect(ecart?.sens).toBe('baisse')
    for (const code of [0x2013, 0x2014]) {
      expect(ecart?.description).not.toContain(String.fromCharCode(code))
    }
  })
})

describe('points à décider', () => {
  it('au plus trois points, avec échéance dépassée, noms complets et désactivés', () => {
    const lectures = lecturesExemple()
    const social = lectures.ministeres.find((m) => m.id === 'soc')
    const pju = lectures.ministeres.find((m) => m.id === 'pju')
    if (!social || !pju) throw new Error('ministère')
    social.desactive_le = '2026-09-29T00:00:00+00:00'
    lectures.points?.mentions.push({ point_id: 'planning-trimestre', ministere_id: 'pju' })
    lectures.points?.mentions.push({ point_id: 'planning-trimestre', ministere_id: 'soc' })
    const { aDecider } = bergerConseil(construireCetteSemaine(lectures, berger, null))
    expect(aDecider.points).toHaveLength(3)
    expect(aDecider.lienTousLesPoints).toBe('/points?vue=ouverts')
    expect(aDecider.urgent).toBe(true)
    const planning = aDecider.points[1]
    expect(planning?.echeance).toEqual({ texte: 'avant le 28 sept.', depassee: true })
    expect(planning?.mentions).toEqual(['Prodiges Junior', 'Social (désactivé)'])
    expect(aDecider.points[0]?.echeance).toEqual({ texte: 'avant le 5 oct.', depassee: false })
    expect(aDecider.points[0]?.ministere).toBe('Intégration')
  })

  it('échéance, description et attendu vides : null', () => {
    const lectures = lecturesExemple()
    const premier = lectures.points?.points[0]
    if (!premier) throw new Error('point')
    premier.echeance = null
    premier.description = null
    premier.action_attendue = ''
    const point = bergerConseil(construireCetteSemaine(lectures, berger, null)).aDecider.points[0]
    expect(point?.echeance).toBeNull()
    expect(point?.description).toBeNull()
    expect(point?.attendu).toBeNull()
  })

  it('un texte masqué par EJP Tech porte masque : true, titre, description et attendu', () => {
    const lectures = lecturesExemple()
    const premier = lectures.points?.points[0]
    if (!premier) throw new Error('point')
    premier.titre = TEXTE_MASQUE
    premier.description = TEXTE_MASQUE
    premier.action_attendue = TEXTE_MASQUE
    const donnees = bergerConseil(construireCetteSemaine(lectures, berger, null))
    const point = donnees.aDecider.points[0]
    expect(point?.titre).toEqual({ texte: TEXTE_MASQUE, masque: true })
    expect(point?.description).toEqual({ texte: TEXTE_MASQUE, masque: true })
    expect(point?.attendu).toEqual({ texte: TEXTE_MASQUE, masque: true })
    expect(donnees.aDecider.points[1]?.titre.masque).toBe(false)
  })

  it('les identifiants des boutons viennent de v_point et de point_mention, point par point', () => {
    const lectures = lecturesExemple()
    lectures.points?.mentions.push({ point_id: 'financement-welcome', ministere_id: 'pju' })
    lectures.points?.mentions.push({ point_id: 'financement-welcome', ministere_id: 'soc' })
    const { aDecider } = bergerConseil(construireCetteSemaine(lectures, berger, null))
    const identifiants = aDecider.points.map((point) => ({
      id: point.id,
      statut: point.statut,
      ministereId: point.ministereId,
      mentionIds: [...point.mentionIds].sort(),
    }))
    expect(identifiants).toEqual([
      {
        id: 'financement-welcome',
        statut: 'attente_decision',
        ministereId: 'int',
        mentionIds: ['pju', 'soc'],
      },
      { id: 'planning-trimestre', statut: 'a_traiter', ministereId: 'coo', mentionIds: [] },
      { id: 'salle-louange', statut: 'a_traiter', ministereId: 'com', mentionIds: ['coo'] },
    ])
  })

  it("le nom d'un événement masqué porte masque : true", () => {
    const lectures = lecturesExemple()
    const ligne = lectures.tableauMinisteres[0]
    if (!ligne) throw new Error('ligne')
    ligne.prochain_evenement_titre = TEXTE_MASQUE
    const donnees = construireCetteSemaine(lectures, berger, null)
    const social = donnees.ministeres.find((m) => m.id === ligne.ministere_id)
    expect(social?.prochainEvenement).toEqual({
      etat: 'prevu',
      date: '14 nov.',
      nom: { texte: TEXTE_MASQUE, masque: true },
    })
  })

  it('aucun point ouvert : liste vide', () => {
    const lectures = lecturesExemple()
    lectures.points = { points: [], mentions: [] }
    const donnees = bergerConseil(construireCetteSemaine(lectures, berger, null))
    expect(donnees.aDecider.points).toEqual([])
    expect(textesPhrase(donnees)).not.toContain('décision')
  })
})

describe("dates à l'heure de Paris", () => {
  it('une carte saisie tard le soir en UTC compte pour le jour de Paris', () => {
    const lectures = lecturesExemple()
    lectures.carteFij = lectures.carteFij.map((ligne) => ({
      ...ligne,
      saisi_le: '2026-09-20T22:30:00+00:00',
    }))
    expect(parId(construireCetteSemaine(lectures, berger, null), 'carte_fij').date).toBe(
      'Saisi par FIJ le 21 sept.',
    )
  })

  it('la fraîcheur se compte depuis v_semaine.aujourdhui, pas depuis le navigateur', () => {
    const lectures = lecturesExemple()
    lectures.semaine = { ...lectures.semaine, aujourdhui: '2026-10-01' }
    const donnees = construireCetteSemaine(lectures, berger, null)
    expect(donnees.ministeres.at(-1)).toMatchObject({
      nom: 'Intégration',
      fraicheur: { libelle: 'Il y a 2 jours', etat: 'a_jour' },
    })
  })

  it('un ministère sans saisie : « Aucune saisie » en rouge, rangé en premier', () => {
    const lectures = lecturesExemple()
    const ligne = lectures.tableauMinisteres[7]
    if (!ligne) throw new Error('ligne')
    ligne.derniere_saisie = null
    const donnees = construireCetteSemaine(lectures, berger, null)
    expect(donnees.ministeres[0]).toMatchObject({
      nom: 'Intégration',
      fraicheur: { libelle: 'Aucune saisie', etat: 'en_retard' },
    })
  })
})
