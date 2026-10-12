import { describe, expect, it } from 'vitest'
import type { Ajout, Calcul } from '@/data/indicateursEcriture'
import {
  ID_COMMUNICATION,
  lecturesExemple,
  termesExemple,
} from '@/features/indicateurs/configuration/apercu/exemples'
import {
  ajouterCalculSimule,
  ajouterSimule,
  corrigerSimule,
  limitesSimulees,
  RefusSimule,
  retirerSimule,
  verifierSimule,
} from '@/features/indicateurs/configuration/apercu/simulation'
import type { EtatSimule } from '@/features/indicateurs/configuration/apercu/simulation'

const MAINTENANT = '2026-10-12T09:00:00+00:00'

function etat(): EtatSimule {
  const lectures = lecturesExemple()
  return { lectures, termes: termesExemple(lectures), compteur: 0 }
}

const idDe = (courant: EtatSimule, libelle: string) => {
  const trouve = courant.lectures.indicateurs.find((ligne) => ligne.libelle === libelle)
  if (trouve === undefined) throw new Error(`« ${libelle} » absent de l'exemple`)
  return trouve.id
}
const ligneDe = (courant: EtatSimule, id: string) =>
  courant.lectures.indicateurs.find((ligne) => ligne.id === id)

const ajout: Ajout = {
  libelle: 'Tournages',
  definition: 'Tournages réalisés dans le mois.',
  nature: 'mois',
  unite: 'nombre',
  sensible: false,
  pasSensible: false,
}

describe('ajouterSimule', () => {
  it('ajoute un indicateur actif et sans saisie, avec un geste au journal', () => {
    const suivant = ajouterSimule(etat(), ID_COMMUNICATION, ajout, null, MAINTENANT)
    const cree = suivant.lectures.indicateurs.at(-1)
    expect(cree).toMatchObject({
      libelle: 'Tournages',
      etat: 'actif',
      origine: 'eglise',
      calcul: null,
      cree_le: MAINTENANT,
    })
    expect(suivant.lectures.usage.at(-1)).toMatchObject({
      indicateur_id: cree?.id,
      jamais_saisi: true,
    })
    expect(suivant.lectures.changements[0]).toMatchObject({
      ministere_id: ID_COMMUNICATION,
      action: 'indicateur_cree',
    })
  })

  it('refuse un doublon du libellé, comme la base', () => {
    expect(() =>
      ajouterSimule(
        etat(),
        ID_COMMUNICATION,
        { ...ajout, libelle: 'publications' },
        null,
        MAINTENANT,
      ),
    ).toThrow(new RefusSimule('Cette fiche a déjà « Publications ».'))
  })

  it('un remplacement retire l’ancien avec le motif « remplacé » et garde son nom libre', () => {
    const courant = etat()
    const ancien = idDe(courant, 'Publications')
    const suivant = ajouterSimule(
      courant,
      ID_COMMUNICATION,
      { ...ajout, libelle: 'Publications' },
      ancien,
      MAINTENANT,
    )
    expect(ligneDe(suivant, ancien)).toMatchObject({ etat: 'retire', retrait_motif: 'remplace' })
    expect(suivant.lectures.indicateurs.at(-1)).toMatchObject({
      libelle: 'Publications',
      remplace_id: ancien,
    })
  })

  it('remplacer la source d’un calcul retire le calcul avec elle (source retirée), comme la base', () => {
    const courant = etat()
    const source = idDe(courant, 'Demandes reçues')
    const calcul = idDe(courant, 'Taux de demandes traitées')
    const suivant = ajouterSimule(
      courant,
      ID_COMMUNICATION,
      { ...ajout, libelle: 'Demandes reçues par mail' },
      source,
      MAINTENANT,
    )
    expect(ligneDe(suivant, source)).toMatchObject({ retrait_motif: 'remplace' })
    expect(ligneDe(suivant, calcul)).toMatchObject({
      etat: 'retire',
      retrait_motif: 'source_retiree',
    })
  })

  it('un mot sensible du libellé ou de la définition demande la case ou la confirmation', () => {
    const courant = etat()
    const refus = /Ce chiffre semble sensible/
    expect(() =>
      ajouterSimule(courant, ID_COMMUNICATION, { ...ajout, libelle: 'Enfants' }, null, MAINTENANT),
    ).toThrow(refus)
    expect(() =>
      ajouterSimule(
        courant,
        ID_COMMUNICATION,
        { ...ajout, definition: 'Annonces faites aux enfants.' },
        null,
        MAINTENANT,
      ),
    ).toThrow(refus)
    const confirme = { ...ajout, definition: 'Annonces faites aux enfants.', pasSensible: true }
    expect(() => ajouterSimule(courant, ID_COMMUNICATION, confirme, null, MAINTENANT)).not.toThrow()
    const coche = { ...ajout, definition: 'Annonces faites aux enfants.', sensible: true }
    expect(() => ajouterSimule(courant, ID_COMMUNICATION, coche, null, MAINTENANT)).not.toThrow()
  })

  it('refuse l’ajout quand la fiche compte 30 indicateurs, mais pas le remplacement', () => {
    let plein = etat()
    for (let rang = 0; limitesSimulees(plein, ID_COMMUNICATION).lignes < 30; rang += 1) {
      plein = ajouterSimule(
        plein,
        ID_COMMUNICATION,
        { ...ajout, libelle: `Indicateur ${rang}` },
        null,
        MAINTENANT,
      )
    }
    expect(limitesSimulees(plein, ID_COMMUNICATION).lignes).toBe(30)
    expect(() =>
      ajouterSimule(plein, ID_COMMUNICATION, { ...ajout, libelle: 'Un de trop' }, null, MAINTENANT),
    ).toThrow('Cette fiche compte déjà 30 indicateurs. Retirez-en un pour en ajouter un autre.')
    expect(
      ajouterSimule(
        plein,
        ID_COMMUNICATION,
        { ...ajout, libelle: 'Un de trop' },
        idDe(plein, 'Publications'),
        MAINTENANT,
      ).lectures.indicateurs.at(-1)?.libelle,
    ).toBe('Un de trop')
  })
})

describe('ajouterCalculSimule', () => {
  const calcul = (courant: EtatSimule, surcharge: Partial<Calcul> = {}): Calcul => ({
    libelle: 'Taux de publications',
    definition: 'Publications sur demandes reçues.',
    type: 'taux',
    hautId: idDe(courant, 'Publications'),
    basId: idDe(courant, 'Demandes reçues'),
    ...surcharge,
  })

  it('prend le rythme du haut, enregistre les deux termes et ne se saisit pas', () => {
    const courant = etat()
    const suivant = ajouterCalculSimule(
      courant,
      ID_COMMUNICATION,
      calcul(courant),
      null,
      MAINTENANT,
    )
    const cree = suivant.lectures.indicateurs.at(-1)
    expect(cree).toMatchObject({ calcul: 'taux', nature: 'mois', unite: 'nombre' })
    expect(suivant.termes.filter((terme) => terme.calcul_id === cree?.id)).toEqual([
      { calcul_id: cree?.id, source_id: calcul(courant).hautId, role: 'haut' },
      { calcul_id: cree?.id, source_id: calcul(courant).basId, role: 'bas' },
    ])
  })

  it('une moyenne garde l’unité du haut', () => {
    const courant = etat()
    const avecGrand = ajouterSimule(
      courant,
      ID_COMMUNICATION,
      { ...ajout, libelle: 'Vues', unite: 'euros' },
      null,
      MAINTENANT,
    )
    const vues = idDe(avecGrand, 'Vues')
    const suivant = ajouterCalculSimule(
      avecGrand,
      ID_COMMUNICATION,
      calcul(avecGrand, { type: 'moyenne', hautId: vues, libelle: 'Vues par demande' }),
      null,
      MAINTENANT,
    )
    expect(suivant.lectures.indicateurs.at(-1)).toMatchObject({ calcul: 'moyenne', unite: 'euros' })
  })

  it('refuse un nom déjà pris et un chiffre inconnu', () => {
    const courant = etat()
    expect(() =>
      ajouterCalculSimule(
        courant,
        ID_COMMUNICATION,
        calcul(courant, { libelle: 'Publications' }),
        null,
        MAINTENANT,
      ),
    ).toThrow('Cette fiche a déjà « Publications ».')
    expect(() =>
      ajouterCalculSimule(
        courant,
        ID_COMMUNICATION,
        calcul(courant, { basId: '20000000-0000-4000-8000-0000000000ff' }),
        null,
        MAINTENANT,
      ),
    ).toThrow('Ces deux chiffres ne se calculent pas ensemble.')
  })
})

describe('corrigerSimule', () => {
  it('corrige un indicateur jamais saisi et date la correction', () => {
    const courant = etat()
    const id = idDe(courant, 'Demandes reçues')
    const suivant = corrigerSimule(
      courant,
      ID_COMMUNICATION,
      id,
      { libelle: 'Demandes reçues par mail', definition: 'Demandes reçues par courriel.' },
      MAINTENANT,
    )
    expect(ligneDe(suivant, id)).toMatchObject({
      libelle: 'Demandes reçues par mail',
      texte_le: MAINTENANT,
    })
  })

  it('refuse un chiffre déjà saisi : on le remplace', () => {
    const courant = etat()
    expect(() =>
      corrigerSimule(
        courant,
        ID_COMMUNICATION,
        idDe(courant, 'Publications'),
        { libelle: 'Posts', definition: 'Publications mises en ligne.' },
        MAINTENANT,
      ),
    ).toThrow('Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.')
  })

  it('refuse un calcul dont une source est déjà saisie', () => {
    const courant = etat()
    expect(() =>
      corrigerSimule(
        courant,
        ID_COMMUNICATION,
        idDe(courant, 'Taux de demandes traitées'),
        { libelle: 'Taux traité', definition: 'Demandes traitées sur demandes reçues.' },
        MAINTENANT,
      ),
    ).toThrow('déjà des valeurs')
  })

  it('refuse une correction qui ne change rien', () => {
    const courant = etat()
    const id = idDe(courant, 'Demandes reçues')
    const ligne = ligneDe(courant, id)
    expect(() =>
      corrigerSimule(
        courant,
        ID_COMMUNICATION,
        id,
        { libelle: ligne?.libelle ?? '', definition: ligne?.definition ?? '' },
        MAINTENANT,
      ),
    ).toThrow("Rien n'a changé")
  })
})

describe('retirerSimule : les saisies restent, les calculs partent avec leur source', () => {
  it('retire avec le motif choisi, sans toucher aux textes', () => {
    const courant = etat()
    const id = idDe(courant, 'Publications')
    const { etat: suivant, calculs } = retirerSimule(
      courant,
      ID_COMMUNICATION,
      id,
      'doublon',
      MAINTENANT,
    )
    expect(calculs).toBe(0)
    expect(ligneDe(suivant, id)).toMatchObject({
      etat: 'retire',
      retrait_motif: 'doublon',
      retire_le: MAINTENANT,
      libelle: 'Publications',
    })
  })

  it('retirer une source retire le calcul avec elle, avec le motif « source retirée »', () => {
    const courant = etat()
    const { etat: suivant, calculs } = retirerSimule(
      courant,
      ID_COMMUNICATION,
      idDe(courant, 'Demandes reçues'),
      'plus_suivi',
      MAINTENANT,
    )
    expect(calculs).toBe(1)
    expect(ligneDe(suivant, idDe(courant, 'Taux de demandes traitées'))).toMatchObject({
      etat: 'retire',
      retrait_motif: 'source_retiree',
    })
  })

  it('la confidentialité masque le libellé et la définition', () => {
    const courant = etat()
    const id = idDe(courant, 'Publications')
    const { etat: suivant } = retirerSimule(
      courant,
      ID_COMMUNICATION,
      id,
      'confidentialite',
      MAINTENANT,
    )
    expect(ligneDe(suivant, id)).toMatchObject({
      etat: 'retire',
      retrait_motif: 'confidentialite',
      libelle: '[retiré pour confidentialité]',
      definition: '[retiré pour confidentialité]',
    })
  })

  it('un indicateur déjà retiré ne se retire pas deux fois', () => {
    const courant = etat()
    const id = idDe(courant, 'Publications')
    const { etat: suivant } = retirerSimule(courant, ID_COMMUNICATION, id, 'erreur', MAINTENANT)
    expect(() => retirerSimule(suivant, ID_COMMUNICATION, id, 'erreur', MAINTENANT)).toThrow(
      'Cet indicateur est déjà retiré.',
    )
  })
})

describe('verifierSimule', () => {
  it('signale ce que la base refuserait', () => {
    const courant = etat()
    const familles = (libelle: string) =>
      verifierSimule(courant, ID_COMMUNICATION, libelle).map((verification) => verification.famille)
    expect(familles('Publications')).toEqual(['doublon'])
    expect(familles('Taux de réponse')).toEqual(['calcul'])
    expect(familles('Prises en charge santé')).toEqual(['sensible'])
    expect(familles('contact@exemple.test')).toEqual(['donnees_personnelles'])
    expect(familles('Tournages')).toEqual([])
  })
})
