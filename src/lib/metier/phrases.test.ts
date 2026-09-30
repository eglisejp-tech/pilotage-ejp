import { describe, expect, it } from 'vitest'
import {
  libelleBoutonPrincipal,
  nomSession,
  phraseDAccueil,
  phraseDeLaFiche,
  phraseDeLaSemaine,
  phraseDeLEglise,
  phraseDoubleCompte,
  sessionDu,
  texteDePhrase,
  titreSession,
  type DonneesPhraseFiche,
  type DonneesPhraseSemaine,
  type SaisieDeLaSemaine,
} from './phrases'

const normal = (texte: string) => ({ texte, surligne: false })
const surligne = (texte: string) => ({ texte, surligne: true })

const semaine: DonneesPhraseSemaine = {
  dimanche: '2026-09-27',
  aujourdhui: '2026-09-30',
  service: { total: 52, nbSaisis: 6, nbAttendus: 8 },
  ministeres: [],
  derniereSession: null,
  nbPointsEnAttenteDeDecision: 0,
}

function avec(champs: Partial<DonneesPhraseSemaine>): DonneesPhraseSemaine {
  return { ...semaine, ...champs }
}

describe('phraseDeLaSemaine : phrase principale', () => {
  it('assemble A, B et C, avec C surligné sans le point final', () => {
    expect(phraseDeLaSemaine(avec({ nbPointsEnAttenteDeDecision: 1 })).principale).toEqual([
      normal("52 STARs au service dimanche. Deux ministères n'ont pas encore saisi, et "),
      surligne('un point attend votre décision'),
      normal('.'),
    ])
  })

  it('écrit C au pluriel, en chiffres hors du début de phrase', () => {
    const phrase = phraseDeLaSemaine(avec({ nbPointsEnAttenteDeDecision: 3 })).principale
    expect(phrase[1]).toEqual(surligne('3 points attendent votre décision'))
  })

  it('omet C sans point en attente de décision', () => {
    expect(phraseDeLaSemaine(semaine).principale).toEqual([
      normal("52 STARs au service dimanche. Deux ministères n'ont pas encore saisi."),
    ])
  })

  it('écrit B selon le nombre de ministères qui manquent', () => {
    const b = (nbSaisis: number, nbAttendus: number) =>
      texteDePhrase(
        phraseDeLaSemaine(avec({ service: { total: 52, nbSaisis, nbAttendus } })).principale,
      )
    expect(b(8, 8)).toBe('52 STARs au service dimanche. Tous les ministères ont saisi.')
    expect(b(7, 8)).toBe("52 STARs au service dimanche. Un ministère n'a pas encore saisi.")
    expect(b(1, 11)).toBe("52 STARs au service dimanche. Dix ministères n'ont pas encore saisi.")
    expect(b(1, 12)).toBe("52 STARs au service dimanche. 11 ministères n'ont pas encore saisi.")
  })

  it('écrit en lettres de un à dix le nombre qui ouvre la phrase', () => {
    const a = (total: number) =>
      texteDePhrase(
        phraseDeLaSemaine(avec({ service: { total, nbSaisis: 8, nbAttendus: 8 } })).principale,
      )
    expect(a(1)).toBe('Un STAR au service dimanche. Tous les ministères ont saisi.')
    expect(a(7)).toBe('Sept STARs au service dimanche. Tous les ministères ont saisi.')
    expect(a(10)).toBe('Dix STARs au service dimanche. Tous les ministères ont saisi.')
    expect(a(11)).toBe('11 STARs au service dimanche. Tous les ministères ont saisi.')
    expect(a(0)).toBe('Aucun STAR au service dimanche. Tous les ministères ont saisi.')
  })

  it("dit quand aucun ministère n'a saisi, sans doubler le point de « sept. »", () => {
    const personne = avec({ service: { total: null, nbSaisis: 0, nbAttendus: 8 } })
    expect(phraseDeLaSemaine(personne).principale).toEqual([
      normal("Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept."),
    ])
  })

  it("fait de C une phrase à part quand aucun ministère n'a saisi", () => {
    const personne = avec({
      service: { total: null, nbSaisis: 0, nbAttendus: 8 },
      nbPointsEnAttenteDeDecision: 2,
    })
    expect(phraseDeLaSemaine(personne).principale).toEqual([
      normal("Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept. "),
      surligne('Deux points attendent votre décision'),
      normal('.'),
    ])
  })

  it('traite 0 ministère attendu comme une semaine sans saisie', () => {
    const vide = avec({ service: { total: null, nbSaisis: 0, nbAttendus: 0 } })
    expect(texteDePhrase(phraseDeLaSemaine(vide).principale)).toBe(
      "Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept.",
    )
  })

  it('ajoute le point final après un mois sans abréviation', () => {
    const mars = avec({
      dimanche: '2026-03-29',
      service: { total: null, nbSaisis: 0, nbAttendus: 8 },
    })
    expect(texteDePhrase(phraseDeLaSemaine(mars).principale)).toBe(
      "Aucun ministère n'a encore saisi les chiffres du dimanche 29 mars.",
    )
  })

  it('ignore un nombre de points négatif', () => {
    expect(phraseDeLaSemaine(avec({ nbPointsEnAttenteDeDecision: -1 })).principale).toHaveLength(1)
  })
})

describe('phraseDeLaSemaine : ligne secondaire', () => {
  it("n'a rien à dire sans retard ni session", () => {
    expect(phraseDeLaSemaine(semaine).secondaire).toBeNull()
  })

  it('signale un ministère sans mise à jour depuis plus de 30 jours', () => {
    const d = avec({
      ministeres: [
        { nom: 'Social', derniere_saisie: '2026-08-30T10:00:00Z' },
        { nom: 'Jeunesse', derniere_saisie: '2026-09-27T10:00:00Z' },
      ],
    })
    expect(phraseDeLaSemaine(d).secondaire).toBe("Social n'a rien mis à jour depuis 31 jours.")
  })

  it('regroupe plusieurs ministères en retard, du plus ancien au plus récent', () => {
    const d = avec({
      ministeres: [
        { nom: 'Social', derniere_saisie: '2026-08-30T10:00:00Z' },
        { nom: 'Jeunesse', derniere_saisie: '2026-08-01T10:00:00Z' },
        { nom: 'Coordination', derniere_saisie: '2026-08-30T12:00:00Z' },
      ],
    })
    expect(phraseDeLaSemaine(d).secondaire).toBe(
      "Jeunesse, Coordination et Social n'ont rien mis à jour depuis plus de 30 jours.",
    )
  })

  it("compte les jours à l'heure de Paris et laisse de côté 30 jours pile et « Aucune saisie »", () => {
    const d = avec({
      ministeres: [
        // 0 h 30 à Paris le 31 août : 30 jours, pas 31.
        { nom: 'Social', derniere_saisie: '2026-08-30T22:30:00Z' },
        { nom: 'Nouveau', derniere_saisie: null },
      ],
    })
    expect(phraseDeLaSemaine(d).secondaire).toBeNull()
  })

  it('dit comment évolue la dernière session et qui manque', () => {
    const d = avec({
      ministeres: [{ nom: 'Social', derniere_saisie: '2026-08-30T10:00:00Z' }],
      derniereSession: {
        type: 'batir',
        intitule: null,
        ecart: -14,
        manquants: ['Intégration', 'Coordination'],
      },
    })
    expect(phraseDeLaSemaine(d).secondaire).toBe(
      "Social n'a rien mis à jour depuis 31 jours. Bâtir l'Église recule de 14 présents, et le total est incomplet : Coordination et Intégration n'ont pas saisi.",
    )
  })

  it('écrit « progresse », « recule » et « est stable », au singulier comme au pluriel', () => {
    const session = (ecart: number, manquants: string[] = []) =>
      phraseDeLaSemaine(
        avec({ derniereSession: { type: 'anti_dispersion', intitule: null, ecart, manquants } }),
      ).secondaire
    expect(session(1)).toBe('Anti-Dispersion progresse de 1 présent.')
    expect(session(5)).toBe('Anti-Dispersion progresse de 5 présents.')
    expect(session(-1)).toBe('Anti-Dispersion recule de 1 présent.')
    expect(session(0)).toBe('Anti-Dispersion est stable.')
    expect(session(0, ['Intégration'])).toBe(
      "Anti-Dispersion est stable, et le total est incomplet : Intégration n'a pas saisi.",
    )
  })

  it('ne dit rien de la session sans écart à périmètre égal', () => {
    const d = avec({
      derniereSession: { type: 'batir', intitule: null, ecart: null, manquants: ['Social'] },
    })
    expect(phraseDeLaSemaine(d).secondaire).toBeNull()
  })

  it("utilise le nom d'un autre rassemblement", () => {
    const d = avec({
      derniereSession: { type: 'autre', intitule: 'Soirée de louange', ecart: 2, manquants: [] },
    })
    expect(phraseDeLaSemaine(d).secondaire).toBe('Soirée de louange progresse de 2 présents.')
  })
})

describe("phraseDeLEglise (administration de l'église)", () => {
  it('garde A, B et la ligne secondaire, sans C ni surligneur', () => {
    const d = avec({
      nbPointsEnAttenteDeDecision: 4,
      ministeres: [{ nom: 'Social', derniere_saisie: '2026-08-30T10:00:00Z' }],
    })
    const phrase = phraseDeLEglise(d)
    expect(phrase.principale).toEqual([
      normal("52 STARs au service dimanche. Deux ministères n'ont pas encore saisi."),
    ])
    expect(phrase.secondaire).toBe("Social n'a rien mis à jour depuis 31 jours.")
  })
})

const fiche: DonneesPhraseFiche = {
  dimanche: '2026-09-27',
  service: 10,
  derniereSaisieService: { valeur: 10, dimanche: '2026-09-27' },
  actifs: 14,
  enFij: 11,
  nbPointsEnAttenteDeDecision: 0,
}

describe('phraseDeLaFiche', () => {
  it('écrit « 10 STARs au service dimanche, 14 actifs dont 11 en FIJ. »', () => {
    expect(phraseDeLaFiche(fiche)).toEqual([
      normal('10 STARs au service dimanche, 14 actifs dont 11 en FIJ.'),
    ])
  })

  it('surligne les points en attente de décision, sans le point final', () => {
    expect(phraseDeLaFiche({ ...fiche, nbPointsEnAttenteDeDecision: 1 })).toEqual([
      normal('10 STARs au service dimanche, 14 actifs dont 11 en FIJ. '),
      surligne('Un point attend une décision'),
      normal('.'),
    ])
    expect(phraseDeLaFiche({ ...fiche, nbPointsEnAttenteDeDecision: 2 })[1]).toEqual(
      surligne('2 points attendent une décision'),
    )
  })

  it('dit quand le dimanche de référence manque, avec la dernière saisie', () => {
    const d = {
      ...fiche,
      service: null,
      derniereSaisieService: { valeur: 9, dimanche: '2026-09-20' },
    }
    expect(texteDePhrase(phraseDeLaFiche(d))).toBe(
      'Chiffres du dimanche 27 sept. non saisis. Dernière saisie : 9 STARs au service le 20 sept. 14 STARs actifs dont 11 en FIJ.',
    )
  })

  it('omet une valeur jamais saisie', () => {
    const rien = {
      ...fiche,
      service: null,
      derniereSaisieService: null,
      actifs: null,
      enFij: null,
    }
    expect(texteDePhrase(phraseDeLaFiche(rien))).toBe('Chiffres du dimanche 27 sept. non saisis.')
    expect(texteDePhrase(phraseDeLaFiche({ ...fiche, actifs: null, enFij: null }))).toBe(
      '10 STARs au service dimanche.',
    )
    expect(texteDePhrase(phraseDeLaFiche({ ...fiche, enFij: null }))).toBe(
      '10 STARs au service dimanche, 14 actifs.',
    )
  })

  it('accorde au singulier et dit « Aucun STAR » pour zéro', () => {
    expect(texteDePhrase(phraseDeLaFiche({ ...fiche, service: 1, actifs: 1, enFij: 0 }))).toBe(
      '1 STAR au service dimanche, 1 actif dont 0 en FIJ.',
    )
    expect(texteDePhrase(phraseDeLaFiche({ ...fiche, service: 0 }))).toBe(
      'Aucun STAR au service dimanche, 14 actifs dont 11 en FIJ.',
    )
  })

  it('termine la dernière saisie par un point après un mois sans abréviation', () => {
    const d = {
      ...fiche,
      dimanche: '2026-03-29',
      service: null,
      derniereSaisieService: { valeur: 1, dimanche: '2026-03-22' },
      actifs: null,
    }
    expect(texteDePhrase(phraseDeLaFiche(d))).toBe(
      'Chiffres du dimanche 29 mars non saisis. Dernière saisie : 1 STAR au service le 22 mars.',
    )
  })
})

describe('phraseDAccueil et libelleBoutonPrincipal (accueil du ministère)', () => {
  const dimanche = (fait: boolean): SaisieDeLaSemaine => ({
    type: 'dimanche',
    dimanche: '2026-10-04',
    fait,
  })
  const batir = (fait: boolean): SaisieDeLaSemaine => ({
    type: 'session',
    session: 'batir',
    intitule: null,
    date: '2026-09-26',
    fait,
  })
  const reunion = (fait: boolean): SaisieDeLaSemaine => ({ type: 'reunion', fait })
  const carte = (fait: boolean): SaisieDeLaSemaine => ({ type: 'carte_fij', fait })

  it('dit « Vos chiffres sont à jour. » puis, surligné, ce qui reste', () => {
    const saisies = [dimanche(true), batir(true), reunion(false)]
    expect(phraseDAccueil(saisies, 39)).toEqual([
      normal('Vos chiffres sont à jour. '),
      surligne('Il reste la date de la prochaine réunion'),
      normal('.'),
    ])
    expect(libelleBoutonPrincipal(saisies)).toBe('Renseigner la prochaine réunion')
  })

  it('liste tout ce qui reste quand les chiffres manquent', () => {
    const saisies = [dimanche(false), batir(true), reunion(false)]
    expect(phraseDAccueil(saisies, 40)).toEqual([
      surligne('Il reste les chiffres du dimanche 4 oct. et la date de la prochaine réunion'),
      normal('.'),
    ])
    expect(libelleBoutonPrincipal(saisies)).toBe('Saisir les chiffres du dimanche')
  })

  it("garde le point de l'abréviation comme point final", () => {
    expect(phraseDAccueil([dimanche(false), reunion(true)], 40)).toEqual([
      surligne('Il reste les chiffres du dimanche 4 oct.'),
    ])
  })

  it('nomme la session qui reste et en fait le bouton principal', () => {
    const saisies = [dimanche(true), batir(false), reunion(false)]
    expect(texteDePhrase(phraseDAccueil(saisies, 39))).toBe(
      "Il reste la présence à Bâtir l'Église du 26 sept. et la date de la prochaine réunion.",
    )
    expect(libelleBoutonPrincipal(saisies)).toBe("Saisir la présence à Bâtir l'Église")
    const autre: SaisieDeLaSemaine = {
      type: 'session',
      session: 'autre',
      intitule: 'Soirée de louange',
      date: '2026-09-26',
      fait: false,
    }
    expect(libelleBoutonPrincipal([dimanche(true), autre])).toBe(
      'Saisir la présence à Soirée de louange',
    )
  })

  it('traite la carte des FIJ en dernier', () => {
    const saisies = [dimanche(true), batir(true), reunion(true), carte(false)]
    expect(texteDePhrase(phraseDAccueil(saisies, 39))).toBe(
      'Vos chiffres sont à jour. Il reste la carte des FIJ.',
    )
    expect(libelleBoutonPrincipal(saisies)).toBe('Mettre à jour la carte des FIJ')
  })

  it('écrit « A, B et C » quand trois choses restent', () => {
    const saisies = [dimanche(false), batir(false), reunion(false)]
    expect(texteDePhrase(phraseDAccueil(saisies, 40))).toBe(
      "Il reste les chiffres du dimanche 4 oct., la présence à Bâtir l'Église du 26 sept. et la date de la prochaine réunion.",
    )
  })

  it('dit « Tout est à jour pour la semaine 39. » sans bouton jaune', () => {
    const saisies = [dimanche(true), batir(true), reunion(true), carte(true)]
    expect(phraseDAccueil(saisies, 39)).toEqual([normal('Tout est à jour pour la semaine 39.')])
    expect(libelleBoutonPrincipal(saisies)).toBeNull()
    expect(phraseDAccueil([], 39)).toEqual([normal('Tout est à jour pour la semaine 39.')])
  })
})

describe('sessions', () => {
  it('nomme les sessions', () => {
    expect(nomSession('batir', null)).toBe("Bâtir l'Église")
    expect(nomSession('anti_dispersion', null)).toBe('Anti-Dispersion')
    expect(nomSession('autre', 'Soirée de louange')).toBe('Soirée de louange')
    expect(nomSession('autre', null)).toBe('Autre rassemblement')
  })

  it("écrit le titre du bloc : « Bâtir l'Église, samedi 26 septembre »", () => {
    expect(titreSession('batir', null, '2026-09-26')).toBe("Bâtir l'Église, samedi 26 septembre")
    expect(titreSession('autre', 'Soirée de louange', '2026-10-17')).toBe(
      'Soirée de louange, samedi 17 octobre',
    )
  })

  it("écrit « Bâtir l'Église du 26 sept. »", () => {
    expect(sessionDu('batir', null, '2026-09-26')).toBe("Bâtir l'Église du 26 sept.")
  })

  it('explique les STARs comptés une seule fois', () => {
    expect(phraseDoubleCompte(61, 58)).toBe(
      "61 présences saisies : 3 STARs saisis par deux ministères ne sont comptés qu'une fois.",
    )
    expect(phraseDoubleCompte(59, 58)).toBe(
      "59 présences saisies : 1 STAR saisi par deux ministères n'est compté qu'une fois.",
    )
  })

  it('ne dit rien sans STAR déjà compté', () => {
    expect(phraseDoubleCompte(58, 58)).toBeNull()
    expect(phraseDoubleCompte(0, 0)).toBeNull()
  })
})

describe('texteDePhrase', () => {
  it('rend le texte brut de la phrase', () => {
    expect(
      texteDePhrase([normal('Vos chiffres sont à jour. '), surligne('Il reste'), normal('.')]),
    ).toBe('Vos chiffres sont à jour. Il reste.')
    expect(texteDePhrase([])).toBe('')
  })
})
