import { describe, expect, it } from 'vitest'
import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import {
  derniereReponse,
  etapesDuSuivi,
  gestesEjpTech,
  groupesEjpTech,
  groupesMinistere,
  lignesDe,
  ligneEtatEjpTech,
  ligneEtatMinistere,
  reponseDeCloture,
  suiviDeLaSemaine,
} from '@/features/signalement/suivi'
import type { EtapeSuivi } from '@/lib/base'

// Le cas de Coordination (conception T77, section 6, critères 1 à 7), rejoué sur les fonctions
// pures de l'écran : statut, ligne d'état et suivi daté viennent de la base (colonnes de la vue),
// l'écran ne fait que les mettre en forme au jour de Paris.

const COORDINATION = '10000000-0000-4000-8000-000000000003'
const ID = '43000000-0000-4000-8000-000000000006'
const TEXTE = 'Problème au niveau de la saisie des événement dans le calendrier'
const QUESTION = 'Quel événement, à quelle date, et quel message s’affiche quand vous enregistrez ?'
const RETOUR = "L'événement du 15 novembre ne s'enregistre pas, un message rouge s'affiche."
const SOLUTION = 'La date de fin était refusée à tort : corrigé, réessayez.'

/** Le signalement de Coordination du lundi 26 octobre, tel que `v_signalement` le rend. */
function signalement(champs: Partial<LigneSignalement> = {}): LigneSignalement {
  return {
    id: ID,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_evenement',
    texte: TEXTE,
    saisi_le: '2026-10-26T10:15:00+01:00',
    suivi_id: null,
    commentaire: null,
    clos_le: null,
    ouvert: true,
    clos_recent: false,
    statut: 'recu',
    derniere_etape: null,
    statut_le: '2026-10-26T10:15:00+01:00',
    jours_depuis: 0,
    fin: null,
    reponse_possible_jusquau: null,
    compte_actif: true,
    ...champs,
  }
}

let numero = 0
function ligne(
  etape: EtapeSuivi,
  saisiLe: string,
  commentaire: string | null = null,
): EtapeDuSuivi {
  numero += 1
  return {
    id: `d1000000-0000-4000-8000-${String(numero).padStart(12, '0')}`,
    signalement_id: ID,
    etape,
    commentaire,
    saisi_le: saisiLe,
    ordre: numero,
  }
}

const libelles = (etapes: ReturnType<typeof etapesDuSuivi>) =>
  etapes.map((e) => `${e.jourAffiche} ${e.libelle}${e.citation ? ` « ${e.citation.texte} »` : ''}`)

describe('le cas de Coordination, du Reçu au Clos (critères 1 à 7)', () => {
  const prise = ligne('en_cours', '2026-10-27T09:00:00+01:00')
  const reponse = ligne('reponse', '2026-10-27T09:05:00+01:00', QUESTION)
  const retour = ligne('reponse_ministere', '2026-10-28T19:40:00+01:00', RETOUR)
  const reponse2 = ligne('reponse', '2026-10-29T11:00:00+01:00', SOLUTION)
  const regle = ligne('regle', '2026-10-30T18:00:00+01:00')

  it('1. Reçu le jour même : « Reçu aujourd’hui. », trois gestes, la ligne de « Ma semaine »', () => {
    const recu = signalement()
    expect(ligneEtatEjpTech(recu)).toBe("Reçu aujourd'hui.")
    expect(gestesEjpTech(recu)).toEqual({
      prendre: true,
      repondre: true,
      clore: true,
      cloreSeul: false,
    })
    expect(groupesEjpTech([recu]).aTraiter).toEqual([recu])
    expect(ligneEtatMinistere(recu)).toBe('EJP Tech a reçu votre signalement le 26 oct.')
    expect(groupesMinistere([recu]).enCours).toEqual([recu])
    expect(suiviDeLaSemaine([recu])).toEqual({ genre: 'ligne', nombre: 1 })
    expect(libelles(etapesDuSuivi(recu, [], 'ministere'))).toEqual(['26 oct. Signalement envoyé'])
  })

  it('2. Pris en charge le 27 : En cours, « EJP Tech s’en occupe depuis le 27 oct. »', () => {
    const enCours = signalement({
      statut: 'en_cours',
      derniere_etape: 'en_cours',
      statut_le: prise.saisi_le,
      jours_depuis: 0,
    })
    expect(ligneEtatMinistere(enCours)).toBe("EJP Tech s'en occupe depuis le 27 oct.")
    expect(ligneEtatEjpTech(enCours)).toBe("Pris en charge aujourd'hui.")
    expect(gestesEjpTech(enCours)).toMatchObject({ prendre: false, repondre: true, clore: true })
    expect(libelles(etapesDuSuivi(enCours, [prise], 'ministere'))).toEqual([
      '26 oct. Signalement envoyé',
      '27 oct. Pris en charge par EJP Tech',
    ])
  })

  it('3 et 4. Répondu le 27 : « En attente du ministère », jusqu’au 3 nov., le bandeau', () => {
    const repondu = signalement({
      statut: 'repondu',
      derniere_etape: 'reponse',
      statut_le: reponse.saisi_le,
      reponse_possible_jusquau: '2026-11-03',
    })
    expect(ligneEtatEjpTech(repondu)).toBe(
      "Réponse envoyée le 27 oct. Le ministère peut répondre jusqu'au 3 nov.",
    )
    expect(groupesEjpTech([repondu])).toMatchObject({ aTraiter: [], attente: [repondu] })
    expect(gestesEjpTech(repondu)).toEqual({
      prendre: false,
      repondre: false,
      clore: false,
      cloreSeul: false,
    })
    expect(ligneEtatMinistere(repondu)).toBe('EJP Tech vous a répondu le 27 oct.')
    expect(groupesMinistere([repondu]).aVerifier).toEqual([repondu])
    expect(derniereReponse([prise, reponse])).toEqual({ texte: QUESTION, suiviId: reponse.id })
    expect(suiviDeLaSemaine([repondu])).toEqual({
      genre: 'bandeau',
      nombre: 1,
      plusAncien: { id: ID, saisi_le: repondu.saisi_le },
    })
  })

  it('5. Coordination répond le 28 : En cours, « Le ministère a répondu le 28 oct. »', () => {
    const relance = signalement({
      statut: 'en_cours',
      derniere_etape: 'reponse_ministere',
      statut_le: retour.saisi_le,
      jours_depuis: 7,
    })
    expect(ligneEtatEjpTech(relance)).toBe('Le ministère a répondu le 28 oct., il y a 7 jours.')
    expect(ligneEtatMinistere(relance)).toBe(
      'Vous avez répondu le 28 oct. EJP Tech reprend votre signalement.',
    )
    expect(groupesEjpTech([relance]).aTraiter).toEqual([relance])
    // Le bandeau laisse la place à la ligne sous « Vos points ».
    expect(suiviDeLaSemaine([relance])).toEqual({ genre: 'ligne', nombre: 1 })
    expect(libelles(etapesDuSuivi(relance, [prise, reponse, retour], 'ejp_tech'))).toEqual([
      '26 oct. Signalement envoyé',
      '27 oct. Pris en charge par EJP Tech',
      `27 oct. Réponse d'EJP Tech : « ${QUESTION} »`,
      `28 oct. Réponse du ministère : « ${RETOUR} »`,
    ])
  })

  it('6 et 7. Seconde réponse le 29, confirmé le 30 : Clos, plus aucun geste ni bandeau', () => {
    const clos = signalement({
      statut: 'clos',
      derniere_etape: 'regle',
      statut_le: regle.saisi_le,
      clos_le: regle.saisi_le,
      ouvert: false,
      clos_recent: true,
      fin: 'confirme',
    })
    const lignes = [prise, reponse, retour, reponse2, regle]
    expect(ligneEtatMinistere(clos)).toBe("Vous avez confirmé que c'est réglé le 30 oct.")
    expect(ligneEtatEjpTech(clos)).toBe('Confirmé par le ministère le 30 oct.')
    expect(groupesEjpTech([clos])).toMatchObject({ aTraiter: [], attente: [], clos: [clos] })
    expect(groupesMinistere([clos])).toMatchObject({ aVerifier: [], enCours: [], clos: [clos] })
    expect(gestesEjpTech(clos)).toMatchObject({ prendre: false, repondre: false, clore: false })
    expect(suiviDeLaSemaine([])).toBeNull()
    expect(libelles(etapesDuSuivi(clos, lignes, 'ministere'))).toEqual([
      '26 oct. Signalement envoyé',
      '27 oct. Pris en charge par EJP Tech',
      `27 oct. Réponse d'EJP Tech : « ${QUESTION} »`,
      `28 oct. Votre réponse : « ${RETOUR} »`,
      `29 oct. Réponse d'EJP Tech : « ${SOLUTION} »`,
      "30 oct. Vous avez confirmé que c'est réglé",
    ])
    expect(libelles(etapesDuSuivi(clos, lignes, 'ejp_tech')).at(-1)).toBe(
      '30 oct. Confirmé par le ministère',
    )
  })
})

describe('autres cas', () => {
  it('8. clôture automatique un dimanche : « Clos le 9 nov., sans retour de votre part. »', () => {
    const reponse = ligne('reponse', '2026-11-01T21:00:00+01:00', QUESTION)
    const clos = signalement({
      statut: 'clos',
      derniere_etape: 'reponse',
      statut_le: '2026-11-09T00:00:00+01:00',
      clos_le: '2026-11-09T00:00:00+01:00',
      ouvert: false,
      clos_recent: true,
      fin: 'automatique',
    })
    expect(ligneEtatMinistere(clos)).toBe(
      'Clos le 9 nov., sans retour de votre part. Si la difficulté revient, faites un nouveau signalement.',
    )
    expect(ligneEtatEjpTech(clos)).toBe('Clos le 9 nov., sans retour du ministère.')
    expect(libelles(etapesDuSuivi(clos, [reponse], 'ministere'))).toEqual([
      '26 oct. Signalement envoyé',
      `1er nov. Réponse d'EJP Tech : « ${QUESTION} »`,
      '9 nov. Clos, sans retour de votre part',
    ])
    expect(libelles(etapesDuSuivi(clos, [reponse], 'ejp_tech')).at(-1)).toBe(
      '9 nov. Clos, sans retour du ministère',
    )
  })

  it('9. fuseau : 0 h 30 à Paris le 29 (23 h 30 UTC le 28) se lit le 29 oct.', () => {
    const reponse = ligne('reponse', '2026-10-28T23:30:00Z', QUESTION)
    const repondu = signalement({
      statut: 'repondu',
      statut_le: reponse.saisi_le,
      reponse_possible_jusquau: '2026-11-05',
    })
    expect(ligneEtatMinistere(repondu)).toBe('EJP Tech vous a répondu le 29 oct.')
    expect(ligneEtatEjpTech(repondu)).toBe(
      "Réponse envoyée le 29 oct. Le ministère peut répondre jusqu'au 5 nov.",
    )
    const [, etape] = etapesDuSuivi(repondu, [reponse], 'ministere')
    expect(etape).toMatchObject({ jour: '2026-10-29', jourAffiche: '29 oct.' })
  })

  it('10. ordre : le suivi suit `ordre`, pas l’heure', () => {
    const premiere = { ...ligne('en_cours', '2026-10-27T09:00:00.005+01:00'), ordre: 1 }
    const seconde = {
      ...ligne('reponse', '2026-10-27T09:00:00.001+01:00', QUESTION),
      ordre: 2,
    }
    const autre = { ...ligne('reponse', '2026-10-27T08:00:00+01:00', 'Autre'), signalement_id: 'x' }
    expect(lignesDe([seconde, autre, premiere], ID)).toEqual([premiere, seconde])
    expect(derniereReponse(lignesDe([seconde, premiere], ID))?.suiviId).toBe(seconde.id)
  })

  it('14. ministère sans compte actif : « Clore le signalement » seul, en bouton ordinaire', () => {
    for (const statut of ['recu', 'en_cours'] as const) {
      const sansCompte = signalement({ statut, compte_actif: false })
      expect(ligneEtatEjpTech(sansCompte)).toBe("Ce ministère n'a plus de compte actif.")
      expect(gestesEjpTech(sansCompte)).toEqual({
        prendre: false,
        repondre: false,
        clore: true,
        cloreSeul: true,
      })
    }
  })

  it('15 et 19. clos par EJP Tech, avec sa réponse (reprise d’un clos du 8 octobre)', () => {
    const cloture = ligne('clos', '2026-10-08T15:00:00+02:00', 'Transmis à l’administration.')
    const clos = signalement({
      statut: 'clos',
      derniere_etape: 'clos',
      statut_le: cloture.saisi_le,
      clos_le: cloture.saisi_le,
      suivi_id: cloture.id,
      commentaire: cloture.commentaire,
      ouvert: false,
      clos_recent: true,
      fin: 'ejp_tech',
    })
    expect(ligneEtatMinistere(clos)).toBe('Clos par EJP Tech le 8 oct.')
    expect(ligneEtatEjpTech(clos)).toBe('Clos par EJP Tech le 8 oct.')
    expect(reponseDeCloture([cloture])).toEqual({
      texte: 'Transmis à l’administration.',
      suiviId: cloture.id,
    })
    expect(libelles(etapesDuSuivi(clos, [cloture], 'ministere')).at(-1)).toBe(
      '8 oct. Clos par EJP Tech : « Transmis à l’administration. »',
    )
    // Une ancienne clôture sans commentaire : ni « : », ni réponse.
    const sansTexte = { ...cloture, commentaire: null }
    expect(reponseDeCloture([sansTexte])).toBeNull()
    expect(libelles(etapesDuSuivi(clos, [sansTexte], 'ministere')).at(-1)).toBe(
      '8 oct. Clos par EJP Tech',
    )
  })

  it('âge dans « À traiter » : aujourd’hui, hier, puis la date et le nombre de jours', () => {
    expect(ligneEtatEjpTech(signalement({ jours_depuis: 1 }))).toBe('Reçu hier.')
    expect(ligneEtatEjpTech(signalement({ jours_depuis: 9 }))).toBe(
      'Reçu le 26 oct., il y a 9 jours.',
    )
  })
})

describe('groupes et « Ma semaine »', () => {
  const recu = signalement({ id: 'a', saisi_le: '2026-10-20T10:00:00+02:00' })
  const repondu = signalement({ id: 'b', statut: 'repondu' })
  const autreRepondu = signalement({ id: 'c', statut: 'repondu' })
  const closAncien = signalement({
    id: 'd',
    statut: 'clos',
    ouvert: false,
    clos_recent: true,
    clos_le: '2026-10-10T10:00:00+02:00',
  })
  const closRecent = { ...closAncien, id: 'e', clos_le: '2026-10-25T10:00:00+01:00' }
  const closVieux = { ...closAncien, id: 'f', clos_recent: false }

  it('ministère : « À vérifier », « En cours », puis les derniers clos d’abord', () => {
    expect(groupesMinistere([recu, repondu, closAncien, closRecent, closVieux])).toEqual({
      aVerifier: [repondu],
      enCours: [recu],
      clos: [closRecent, closAncien],
    })
  })

  it('EJP Tech : « À traiter », « En attente du ministère », puis les derniers clos d’abord', () => {
    expect(groupesEjpTech([recu, repondu, closAncien, closRecent])).toEqual({
      aTraiter: [recu],
      attente: [repondu],
      clos: [closRecent, closAncien],
    })
  })

  it('le bandeau vise le plus ancien Répondu et compte les autres ; la ligne, les suivis', () => {
    expect(suiviDeLaSemaine([recu, repondu, autreRepondu])).toEqual({
      genre: 'bandeau',
      nombre: 2,
      plusAncien: { id: 'b', saisi_le: repondu.saisi_le },
    })
    expect(suiviDeLaSemaine([recu, { ...recu, id: 'z', statut: 'en_cours' }])).toEqual({
      genre: 'ligne',
      nombre: 2,
    })
  })
})
