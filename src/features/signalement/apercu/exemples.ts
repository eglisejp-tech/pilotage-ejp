import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import type { Masquage } from '@/features/moderation/schemas'
import type { EtapeSuivi } from '@/lib/base'

// Données d'exemple de l'aperçu des signalements et de leur suivi (/apercu/signalements, T77) :
// jamais la base, jamais un nom de personne. Le jour de l'aperçu est le mercredi 28 oct. 2026 ;
// les dates sont fixes, jamais celle du navigateur ; `statut`, `fin`, `jours_depuis` et
// `reponse_possible_jusquau` sont écrits comme la base les rendrait. Les gestes simulent la base :
// un texte avec « @ » ou 5 chiffres de suite est refusé avec son message, `envoi=echec` simule
// une connexion perdue, `envoi=clos` et `envoi=deja` un signalement qui a changé entre-temps.

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const INTEGRATION = '10000000-0000-4000-8000-000000000002'
const COORDINATION = '10000000-0000-4000-8000-000000000003'
const JEUNESSE = '10000000-0000-4000-8000-000000000004'
const SOCIAL = '10000000-0000-4000-8000-000000000005'
const FIJ = '10000000-0000-4000-8000-000000000006'
const JUNIOR = '10000000-0000-4000-8000-000000000007'

/** Les vues de l'aperçu, choisies par `?vue=`. */
export const VUES_APERCU = [
  // Ministère : le formulaire, puis « Mes signalements » (Coordination).
  'formulaire',
  'suivi',
  'suivi-vide',
  'suivi-clos',
  'suivi-chargement',
  'suivi-probleme',
  /** Un lien de 90 caractères sans espace, collé dans un signalement et une réponse. */
  'suivi-lien-long',
  // EJP Tech : bloc « Signalements » sur /moderation.
  'bloc',
  'bloc-lien-long',
  'bloc-sans-ouvert',
  'bloc-vide',
  'bloc-chargement',
  'bloc-probleme',
] as const

export type VueApercu = (typeof VUES_APERCU)[number]

export function lireVueApercu(valeur: string | null, ejpTech: boolean): VueApercu {
  const vue = VUES_APERCU.find((possible) => possible === valeur)
  if (vue && vue.startsWith('bloc') === ejpTech) return vue
  return ejpTech ? 'bloc' : 'formulaire'
}

/** L'heure des gestes simulés, le jour de l'aperçu (mercredi 28 oct., heure de Paris). */
const INSTANT_APERCU = '2026-10-28T11:30:00+01:00'

/** Un signalement tel que `v_signalement` le rend ; les champs du statut sont donnés. */
function signalement(
  champs: Pick<LigneSignalement, 'id' | 'ministere_id' | 'ministere_nom' | 'ecran' | 'texte'> &
    Partial<LigneSignalement> & { saisi_le: string },
): LigneSignalement {
  return {
    suivi_id: null,
    commentaire: null,
    clos_le: null,
    ouvert: true,
    clos_recent: false,
    statut: 'recu',
    derniere_etape: null,
    statut_le: champs.saisi_le,
    jours_depuis: 0,
    fin: null,
    reponse_possible_jusquau: null,
    compte_actif: true,
    ...champs,
  }
}

/** Une ligne de suivi. */
function ligne(
  id: string,
  signalementId: string,
  etape: EtapeSuivi,
  saisiLe: string,
  commentaire: string | null = null,
): EtapeDuSuivi {
  return { id, signalement_id: signalementId, etape, commentaire, saisi_le: saisiLe, ordre: 0 }
}

/** Numérote les lignes dans l'ordre donné, comme la colonne `ordre` de la base. */
function numeroter(lignes: EtapeDuSuivi[]): EtapeDuSuivi[] {
  return lignes.map((l, rang) => ({ ...l, ordre: rang + 1 }))
}

/** Un lien long, sans espace : la page ne doit pas défiler en largeur. */
const LIEN_LONG = `https://exemple.test/${'a'.repeat(69)}`

// « Mes signalements » de Coordination, du plus ancien au plus récent (ordre de la base).

const SANS_RETOUR = '77000000-0000-4000-8000-0000000000a5'
const PAR_EJP_TECH = '77000000-0000-4000-8000-0000000000a6'
const CONFIRME = '77000000-0000-4000-8000-0000000000a4'
const APRES_REPONSE = '77000000-0000-4000-8000-0000000000a2'
const REPONDU = '77000000-0000-4000-8000-0000000000a1'
const RECU = '77000000-0000-4000-8000-0000000000a3'

const MES_SIGNALEMENTS: LigneSignalement[] = [
  signalement({
    id: SANS_RETOUR,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_session',
    texte: "La session de samedi n'apparaît pas dans la liste des sessions à saisir.",
    saisi_le: '2026-10-05T19:00:00+02:00',
    suivi_id: 'b1000000-0000-4000-8000-000000000051',
    commentaire: "La session apparaît de nouveau dans la liste. Dites-nous si c'est réglé.",
    clos_le: '2026-10-14T00:00:00+02:00',
    ouvert: false,
    clos_recent: true,
    statut: 'clos',
    derniere_etape: 'reponse',
    statut_le: '2026-10-14T00:00:00+02:00',
    jours_depuis: 14,
    fin: 'automatique',
  }),
  signalement({
    id: PAR_EJP_TECH,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'autre',
    texte: "La page des salles ne s'ouvre pas depuis le téléphone.",
    saisi_le: '2026-10-07T20:00:00+02:00',
    suivi_id: 'b1000000-0000-4000-8000-000000000061',
    commentaire: "Transmis à l'administration de l'église, qui vous recontacte.",
    clos_le: '2026-10-08T09:00:00+02:00',
    ouvert: false,
    clos_recent: true,
    statut: 'clos',
    derniere_etape: 'clos',
    statut_le: '2026-10-08T09:00:00+02:00',
    jours_depuis: 20,
    fin: 'ejp_tech',
  }),
  signalement({
    id: CONFIRME,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_dimanche',
    texte: 'Le champ des STARs au service refuse le nombre saisi.',
    saisi_le: '2026-10-11T13:00:00+02:00',
    suivi_id: 'b1000000-0000-4000-8000-000000000042',
    commentaire: 'Corrigé : le champ accepte de nouveau les nombres entiers.',
    clos_le: '2026-10-13T18:00:00+02:00',
    ouvert: false,
    clos_recent: true,
    statut: 'clos',
    derniere_etape: 'regle',
    statut_le: '2026-10-13T18:00:00+02:00',
    jours_depuis: 15,
    fin: 'confirme',
  }),
  signalement({
    id: APRES_REPONSE,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_reunion',
    texte: "La prochaine réunion ne s'enregistre pas avec l'heure du soir.",
    saisi_le: '2026-10-20T21:00:00+02:00',
    suivi_id: 'b1000000-0000-4000-8000-000000000021',
    commentaire: 'Quelle heure avez-vous choisie, et quel message voyez-vous ?',
    statut: 'en_cours',
    derniere_etape: 'reponse_ministere',
    statut_le: '2026-10-27T19:30:00+01:00',
    jours_depuis: 1,
  }),
  signalement({
    id: REPONDU,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_evenement',
    texte: 'Problème au niveau de la saisie des événement dans le calendrier',
    saisi_le: '2026-10-26T10:15:00+01:00',
    suivi_id: 'b1000000-0000-4000-8000-000000000012',
    commentaire:
      "Quel événement, à quelle date, et quel message s'affiche quand vous enregistrez ?",
    statut: 'repondu',
    derniere_etape: 'reponse',
    statut_le: '2026-10-27T09:30:00+01:00',
    jours_depuis: 1,
    reponse_possible_jusquau: '2026-11-03',
  }),
  signalement({
    id: RECU,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_mois',
    texte: "Le mois d'octobre ne se propose pas dans la liste.",
    saisi_le: '2026-10-28T08:00:00+01:00',
  }),
]

const MON_SUIVI: EtapeDuSuivi[] = numeroter([
  ligne(
    'b1000000-0000-4000-8000-000000000051',
    SANS_RETOUR,
    'reponse',
    '2026-10-06T10:00:00+02:00',
    "La session apparaît de nouveau dans la liste. Dites-nous si c'est réglé.",
  ),
  ligne(
    'b1000000-0000-4000-8000-000000000061',
    PAR_EJP_TECH,
    'clos',
    '2026-10-08T09:00:00+02:00',
    "Transmis à l'administration de l'église, qui vous recontacte.",
  ),
  ligne('b1000000-0000-4000-8000-000000000041', CONFIRME, 'en_cours', '2026-10-12T09:00:00+02:00'),
  ligne(
    'b1000000-0000-4000-8000-000000000042',
    CONFIRME,
    'reponse',
    '2026-10-12T09:30:00+02:00',
    'Corrigé : le champ accepte de nouveau les nombres entiers.',
  ),
  ligne('b1000000-0000-4000-8000-000000000043', CONFIRME, 'regle', '2026-10-13T18:00:00+02:00'),
  ligne(
    'b1000000-0000-4000-8000-000000000021',
    APRES_REPONSE,
    'reponse',
    '2026-10-21T10:00:00+02:00',
    'Quelle heure avez-vous choisie, et quel message voyez-vous ?',
  ),
  ligne(
    'b1000000-0000-4000-8000-000000000022',
    APRES_REPONSE,
    'reponse_ministere',
    '2026-10-27T19:30:00+01:00',
    "L'heure de 20 h 30 est refusée, un message rouge s'affiche.",
  ),
  ligne('b1000000-0000-4000-8000-000000000011', REPONDU, 'en_cours', '2026-10-27T09:00:00+01:00'),
  ligne(
    'b1000000-0000-4000-8000-000000000012',
    REPONDU,
    'reponse',
    '2026-10-27T09:30:00+01:00',
    "Quel événement, à quelle date, et quel message s'affiche quand vous enregistrez ?",
  ),
])

/** Les signalements et le suivi de « Mes signalements », selon la vue. */
export function mesSignalements(vue: VueApercu): {
  signalements: LigneSignalement[]
  suivi: EtapeDuSuivi[]
} {
  if (vue === 'suivi-vide') return { signalements: [], suivi: [] }
  if (vue === 'suivi-clos') {
    const clos = MES_SIGNALEMENTS.filter((s) => s.statut === 'clos')
    return {
      signalements: clos,
      suivi: MON_SUIVI.filter((l) => clos.some((s) => s.id === l.signalement_id)),
    }
  }
  if (vue === 'suivi-lien-long') {
    const repondu = MES_SIGNALEMENTS.filter((s) => s.id === REPONDU).map((s) => ({
      ...s,
      texte: LIEN_LONG,
      commentaire: LIEN_LONG,
    }))
    return {
      signalements: repondu,
      suivi: MON_SUIVI.filter((l) => l.signalement_id === REPONDU).map((l) =>
        l.commentaire === null ? l : { ...l, commentaire: LIEN_LONG },
      ),
    }
  }
  return { signalements: MES_SIGNALEMENTS, suivi: MON_SUIVI }
}

// Bloc « Signalements » d'EJP Tech, du plus ancien au plus récent (ordre de la base).

const S_INTEGRATION = '43000000-0000-4000-8000-000000000003'
const S_SOCIAL = '43000000-0000-4000-8000-000000000004'
const S_JEUNESSE = '43000000-0000-4000-8000-000000000005'
const S_COMMUNICATION = '43000000-0000-4000-8000-000000000001'
const S_COORDINATION = '43000000-0000-4000-8000-000000000006'
const S_CONFIRME = '43000000-0000-4000-8000-000000000002'
const S_JUNIOR = '43000000-0000-4000-8000-000000000007'
const S_FIJ = '43000000-0000-4000-8000-000000000008'

const BLOC: LigneSignalement[] = [
  signalement({
    id: S_FIJ,
    ministere_id: FIJ,
    ministere_nom: 'FIJ',
    ecran: 'saisie_fij',
    texte: 'La carte des FIJ ne garde pas le département choisi.',
    saisi_le: '2026-10-07T18:00:00+02:00',
    suivi_id: 'c1000000-0000-4000-8000-000000000081',
    commentaire: "Transmis à l'administration de l'église, qui recontacte le ministère.",
    clos_le: '2026-10-08T09:00:00+02:00',
    ouvert: false,
    clos_recent: true,
    statut: 'clos',
    derniere_etape: 'clos',
    statut_le: '2026-10-08T09:00:00+02:00',
    jours_depuis: 20,
    fin: 'ejp_tech',
  }),
  signalement({
    id: S_JUNIOR,
    ministere_id: JUNIOR,
    ministere_nom: 'Prodiges Junior',
    ecran: 'saisie_mois',
    texte: 'Le mois dernier ne se propose plus dans la liste des mois.',
    saisi_le: '2026-10-14T19:00:00+02:00',
    suivi_id: 'c1000000-0000-4000-8000-000000000071',
    commentaire: "Le mois se propose de nouveau. Dites-nous si c'est réglé.",
    clos_le: '2026-10-25T00:00:00+02:00',
    ouvert: false,
    clos_recent: true,
    statut: 'clos',
    derniere_etape: 'reponse',
    statut_le: '2026-10-25T00:00:00+02:00',
    jours_depuis: 3,
    fin: 'automatique',
  }),
  signalement({
    id: S_INTEGRATION,
    ministere_id: INTEGRATION,
    ministere_nom: 'Intégration',
    ecran: 'saisie_session',
    texte: "La session de samedi n'apparaît pas dans la liste des sessions à saisir.",
    saisi_le: '2026-10-19T09:00:00+02:00',
    suivi_id: 'c1000000-0000-4000-8000-000000000032',
    commentaire: 'Quelle session, et à quelle date ?',
    statut: 'en_cours',
    derniere_etape: 'reponse_ministere',
    statut_le: '2026-10-27T18:00:00+01:00',
    jours_depuis: 1,
  }),
  signalement({
    id: S_SOCIAL,
    ministere_id: SOCIAL,
    ministere_nom: 'Social',
    ecran: 'saisie_dimanche',
    texte: 'Le bouton Envoyer reste grisé après la saisie des STARs au service.',
    saisi_le: '2026-10-19T18:00:00+02:00',
    statut: 'en_cours',
    derniere_etape: 'en_cours',
    statut_le: '2026-10-20T11:00:00+02:00',
    jours_depuis: 8,
  }),
  signalement({
    id: S_CONFIRME,
    ministere_id: COMMUNICATION,
    ministere_nom: 'Communication',
    ecran: 'saisie_mois',
    texte: 'Le total du mois ne se calcule pas après la saisie.',
    saisi_le: '2026-10-20T13:00:00+02:00',
    suivi_id: 'c1000000-0000-4000-8000-000000000021',
    commentaire: 'Corrigé : le total se calcule de nouveau.',
    clos_le: '2026-10-26T12:00:00+01:00',
    ouvert: false,
    clos_recent: true,
    statut: 'clos',
    derniere_etape: 'regle',
    statut_le: '2026-10-26T12:00:00+01:00',
    jours_depuis: 2,
    fin: 'confirme',
  }),
  signalement({
    id: S_JEUNESSE,
    ministere_id: JEUNESSE,
    ministere_nom: 'Jeunesse',
    ecran: 'saisie_reunion',
    texte: "La réunion du mois ne s'enregistre pas.",
    saisi_le: '2026-10-22T20:00:00+02:00',
    jours_depuis: 6,
    compte_actif: false,
  }),
  signalement({
    id: S_COMMUNICATION,
    ministere_id: COMMUNICATION,
    ministere_nom: 'Communication',
    ecran: 'saisie_evenement',
    texte:
      "Le formulaire refuse la date de notre soirée de louange, alors qu'elle est bien à venir.",
    saisi_le: '2026-10-23T19:00:00+02:00',
    suivi_id: 'c1000000-0000-4000-8000-000000000012',
    commentaire: 'Quelle date avez-vous choisie, et quel message voyez-vous ?',
    statut: 'repondu',
    derniere_etape: 'reponse',
    statut_le: '2026-10-27T10:00:00+01:00',
    jours_depuis: 1,
    reponse_possible_jusquau: '2026-11-03',
  }),
  signalement({
    id: S_COORDINATION,
    ministere_id: COORDINATION,
    ministere_nom: 'Coordination',
    ecran: 'saisie_evenement',
    texte: 'Problème au niveau de la saisie des événement dans le calendrier',
    saisi_le: '2026-10-28T08:40:00+01:00',
  }),
]

const SUIVI_BLOC: EtapeDuSuivi[] = numeroter([
  ligne(
    'c1000000-0000-4000-8000-000000000081',
    S_FIJ,
    'clos',
    '2026-10-08T09:00:00+02:00',
    "Transmis à l'administration de l'église, qui recontacte le ministère.",
  ),
  ligne(
    'c1000000-0000-4000-8000-000000000071',
    S_JUNIOR,
    'reponse',
    '2026-10-17T10:00:00+02:00',
    "Le mois se propose de nouveau. Dites-nous si c'est réglé.",
  ),
  ligne(
    'c1000000-0000-4000-8000-000000000031',
    S_INTEGRATION,
    'en_cours',
    '2026-10-20T10:00:00+02:00',
  ),
  ligne(
    'c1000000-0000-4000-8000-000000000032',
    S_INTEGRATION,
    'reponse',
    '2026-10-20T10:30:00+02:00',
    'Quelle session, et à quelle date ?',
  ),
  ligne('c1000000-0000-4000-8000-000000000041', S_SOCIAL, 'en_cours', '2026-10-20T11:00:00+02:00'),
  ligne(
    'c1000000-0000-4000-8000-000000000021',
    S_CONFIRME,
    'reponse',
    '2026-10-21T10:00:00+02:00',
    'Corrigé : le total se calcule de nouveau.',
  ),
  ligne('c1000000-0000-4000-8000-000000000022', S_CONFIRME, 'regle', '2026-10-26T12:00:00+01:00'),
  ligne(
    'c1000000-0000-4000-8000-000000000011',
    S_COMMUNICATION,
    'en_cours',
    '2026-10-26T09:00:00+01:00',
  ),
  ligne(
    'c1000000-0000-4000-8000-000000000012',
    S_COMMUNICATION,
    'reponse',
    '2026-10-27T10:00:00+01:00',
    'Quelle date avez-vous choisie, et quel message voyez-vous ?',
  ),
  ligne(
    'c1000000-0000-4000-8000-000000000033',
    S_INTEGRATION,
    'reponse_ministere',
    '2026-10-27T18:00:00+01:00',
    'La session du samedi 24 octobre, celle du soir.',
  ),
])

/** Bloc d'EJP Tech, selon la vue : signalements et suivi. */
export function signalementsDuBloc(vue: VueApercu): {
  signalements: LigneSignalement[]
  suivi: EtapeDuSuivi[]
} {
  if (vue === 'bloc-vide') return { signalements: [], suivi: [] }
  if (vue === 'bloc-sans-ouvert') {
    const gardes = BLOC.filter((s) => s.statut === 'repondu' || s.statut === 'clos')
    return {
      signalements: gardes,
      suivi: SUIVI_BLOC.filter((l) => gardes.some((s) => s.id === l.signalement_id)),
    }
  }
  if (vue === 'bloc-lien-long') {
    const gardes = BLOC.filter((s) => s.id === S_INTEGRATION || s.id === S_FIJ).map((s) => ({
      ...s,
      texte: LIEN_LONG,
      commentaire: LIEN_LONG,
    }))
    return {
      signalements: gardes,
      suivi: SUIVI_BLOC.filter((l) => gardes.some((s) => s.id === l.signalement_id)).map((l) =>
        l.commentaire === null ? l : { ...l, commentaire: LIEN_LONG },
      ),
    }
  }
  return { signalements: BLOC, suivi: SUIVI_BLOC }
}

// Gestes simulés, comme la base les écrirait : une ligne de suivi de plus, et le statut relu.

/** L'état simulé de l'aperçu : la liste et son suivi. */
export interface EtatSimule {
  signalements: LigneSignalement[]
  suivi: EtapeDuSuivi[]
}

let numero = 0
function nouvelleLigne(
  etat: EtatSimule,
  signalementId: string,
  etape: EtapeSuivi,
  commentaire: string | null,
) {
  numero += 1
  const id = `d1000000-0000-4000-8000-${String(numero).padStart(12, '0')}`
  return {
    id,
    suivi: [
      ...etat.suivi,
      { ...ligne(id, signalementId, etape, INSTANT_APERCU, commentaire), ordre: 1000 + numero },
    ],
  }
}

function changer(
  etat: EtatSimule,
  signalementId: string,
  changement: (avant: LigneSignalement, idLigne: string) => Partial<LigneSignalement>,
  etape: EtapeSuivi,
  commentaire: string | null = null,
): EtatSimule {
  const { id, suivi } = nouvelleLigne(etat, signalementId, etape, commentaire)
  return {
    suivi,
    signalements: etat.signalements.map((s) =>
      s.id === signalementId ? { ...s, ...changement(s, id) } : s,
    ),
  }
}

/** « Prendre en charge » : En cours, aujourd'hui. */
export function prendreSimule(etat: EtatSimule, id: string): EtatSimule {
  return changer(
    etat,
    id,
    () => ({
      statut: 'en_cours',
      derniere_etape: 'en_cours',
      statut_le: INSTANT_APERCU,
      jours_depuis: 0,
    }),
    'en_cours',
  )
}

/** « Répondre au ministère » : Répondu, réponse possible jusqu'au jour de l'aperçu + 7. */
export function repondreAuMinistereSimule(etat: EtatSimule, id: string, texte: string): EtatSimule {
  return changer(
    etat,
    id,
    (_avant, idLigne) => ({
      statut: 'repondu',
      derniere_etape: 'reponse',
      statut_le: INSTANT_APERCU,
      jours_depuis: 0,
      suivi_id: idLigne,
      commentaire: texte,
      reponse_possible_jusquau: '2026-11-04',
    }),
    'reponse',
    texte,
  )
}

/** « Clore le signalement » : Clos par EJP Tech, aujourd'hui. */
export function cloreSimule(etat: EtatSimule, id: string, texte: string): EtatSimule {
  return changer(
    etat,
    id,
    (_avant, idLigne) => ({
      statut: 'clos',
      derniere_etape: 'clos',
      statut_le: INSTANT_APERCU,
      clos_le: INSTANT_APERCU,
      jours_depuis: 0,
      ouvert: false,
      clos_recent: true,
      fin: 'ejp_tech',
      suivi_id: idLigne,
      commentaire: texte,
      reponse_possible_jusquau: null,
    }),
    'clos',
    texte,
  )
}

/** « Oui, c'est réglé » : Clos, confirmé aujourd'hui. */
export function confirmerSimule(etat: EtatSimule, id: string): EtatSimule {
  return changer(
    etat,
    id,
    () => ({
      statut: 'clos',
      derniere_etape: 'regle',
      statut_le: INSTANT_APERCU,
      clos_le: INSTANT_APERCU,
      jours_depuis: 0,
      ouvert: false,
      clos_recent: true,
      fin: 'confirme',
      reponse_possible_jusquau: null,
    }),
    'regle',
  )
}

/** « Répondre à EJP Tech » : En cours, après la réponse du ministère. */
export function repondreAEjpTechSimule(etat: EtatSimule, id: string, texte: string): EtatSimule {
  return changer(
    etat,
    id,
    () => ({
      statut: 'en_cours',
      derniere_etape: 'reponse_ministere',
      statut_le: INSTANT_APERCU,
      jours_depuis: 0,
      reponse_possible_jusquau: null,
    }),
    'reponse_ministere',
    texte,
  )
}

/** « Masquer » simulé : le texte du signalement ou une réponse devient le texte masqué. */
export function masquerSimule(etat: EtatSimule, masquage: Masquage): EtatSimule {
  if (masquage.cible === 'signalement') {
    return {
      ...etat,
      signalements: etat.signalements.map((s) =>
        s.id === masquage.cibleId ? { ...s, texte: TEXTE_MASQUE } : s,
      ),
    }
  }
  return {
    signalements: etat.signalements.map((s) =>
      s.suivi_id === masquage.cibleId ? { ...s, commentaire: TEXTE_MASQUE } : s,
    ),
    suivi: etat.suivi.map((l) =>
      l.id === masquage.cibleId ? { ...l, commentaire: TEXTE_MASQUE } : l,
    ),
  }
}

/** Erreur de la base telle que PostgREST la rend (code SQL et message). */
export function refusDeLaBase(message: string) {
  return { code: 'P0001', message, details: null, hint: null }
}

/** Un texte que la base refuserait pour ses données personnelles (« @ », 5 chiffres de suite). */
export function refuseParLaBase(texte: string): boolean {
  return texte.includes('@') || /\d{5}/.test(texte.replace(/[\s.-]/g, ''))
}

/** Connexion perdue : une erreur sans code SQL. */
export const ECHEC_CONNEXION = new TypeError('Failed to fetch')

/** Une courte attente : « Envoi en cours » se voit. */
export const attendre = () => new Promise<void>((fin) => setTimeout(fin, 400))
