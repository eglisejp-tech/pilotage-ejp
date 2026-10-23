// Construction des blocs « Événements de l'église » et « Ponctualité » (fiche de Coordination,
// lot L2, X10 ; T68) à partir des lignes de `evenements_eglise_mois()`, sans requête. Le mois
// écoulé donne les grandes valeurs, le mois en cours s'affiche à part (K23), puis « Depuis le
// ... » (sommes sur sommes). Avant le premier mois écoulé, le mois en cours donne les grandes
// valeurs, nommé comme tel. Rien n'est recompté : seulement des sommes et des rapports.

import type { RetardEvenement } from '@/data/comptages'
import type { ValeurFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_COMPTAGES } from '@/features/fiche/textesComptages'
import type { LigneComptagesEglise, TypeCompte } from '@/lib/base'
import { libelleCompletude } from '@/lib/metier/completude'
import { ajouterJours, formaterJourAbrege, formaterJourCourt, nomDuMois } from '@/lib/metier/dates'
import {
  ajouterMois,
  libelleMois,
  libelleMoisEnCours,
  moisDe,
  premierJourDuMois,
} from '@/lib/metier/periodes'
import {
  formaterMinutes,
  formaterRetardMoyen,
  partALHeure,
  ponctualiteDesMois,
  ponctualiteDuMois,
} from '@/lib/metier/ponctualite'
import type { PonctualitePeriode } from '@/lib/metier/ponctualite'
import { NON_CALCULE } from '@/lib/metier/pourcentage'
import { nombre } from '@/lib/metier/texte'

/** Une ligne des deux blocs, dans la grille des lignes de la fiche (maquette 04). */
export interface LigneComptage {
  cle: string
  libelle: string
  valeur: ValeurFiche
  /** Colonne de droite : mois en cours, départ, retard moyen, complétude. */
  details: string[]
  /** Sous la ligne : cultes, autres événements. */
  sousLignes: string[]
}

/** Les événements commencés en retard du mois des grandes valeurs (liste repliée). */
export interface RetardsAListe {
  /** 1er et dernier jour du mois, pour `lireRetardsDuMois`. */
  debut: string
  fin: string
  /** Nombre d'événements commencés en retard, lu dans les comptages. */
  nombre: number
  /** « septembre ». */
  mois: string
}

export interface DonneesComptages {
  /** Période des grandes valeurs : « Septembre 2026 », ou « Octobre en cours ». */
  periode: string
  /** Jour de départ des comptages : « 8 sept. ». */
  depuis: string
  evenements: LigneComptage[]
  ponctualite: LigneComptage[]
  /** null quand aucun événement du mois n'a commencé en retard. */
  retards: RetardsAListe | null
}

/** État des deux blocs, de la lecture à l'affichage. */
export type EtatComptages =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'premier_usage' }
  | { etat: 'donnees'; donnees: DonneesComptages }

/** Un événement de la liste des retards, prêt à afficher. */
export interface LigneRetard {
  id: string
  /** « Sam. 12 sept. » */
  jour: string
  titre: string
  /** Ministère porteur, null si son nom n'est pas lu. */
  ministere: string | null
  /** « 12 min de retard ». */
  retard: string
}

export type EtatRetards =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'donnees'; donnees: LigneRetard[] }

/** Code du ministère qui lit les totaux d'événements de l'église (posé par migration, K11). */
export const CODE_MINISTERE_COORDINATION = 'coordination'

/**
 * Les deux blocs n'existent que sur la fiche de Coordination, lue par Coordination elle-même (un
 * ministère ne lit que sa fiche), le berger, le conseil et EJP Tech ; jamais par l'administration.
 */
export function comptagesVisibles(ministereCode: string | null, profil: TypeCompte): boolean {
  return ministereCode === CODE_MINISTERE_COORDINATION && profil !== 'admin_eglise'
}

/** La liste des retards par événement : berger, conseil et EJP Tech ; pas Coordination (K11). */
export function retardsVisibles(profil: TypeCompte): boolean {
  return profil === 'berger' || profil === 'conseil' || profil === 'admin_plateforme'
}

type CleComptage = keyof typeof TEXTES_COMPTAGES.lignes

const CLES_COMPTAGES: CleComptage[] = [
  'realises',
  'prevus',
  'annules',
  'reportes',
  'en_attente',
  'passes_sans_etat_final',
]

function valeurNombre(n: number): ValeurFiche {
  return { etat: 'saisie', texte: nombre(n), unite: null }
}

function ligneEvenements(
  cle: CleComptage,
  principal: LigneComptagesEglise,
  enCours: { libelle: string; ligne: LigneComptagesEglise } | null,
  depuis: { libelle: string; total: number } | null,
): LigneComptage {
  const details: string[] = []
  if (enCours !== null) details.push(`${enCours.libelle} : ${nombre(enCours.ligne[cle])}`)
  if (depuis !== null && cle === 'realises') {
    details.push(`${depuis.libelle} : ${nombre(depuis.total)}`)
  }
  return {
    cle,
    libelle: TEXTES_COMPTAGES.lignes[cle],
    valeur: valeurNombre(principal[cle]),
    details,
    sousLignes: [],
  }
}

function lignePonctualite(
  cle: string,
  libelle: string,
  periode: PonctualitePeriode,
): LigneComptage {
  const { evenements, cultes, total } = periode
  const part = partALHeure(total)
  return {
    cle,
    libelle,
    valeur:
      part === null
        ? { etat: 'non_calcule', texte: NON_CALCULE }
        : { etat: 'saisie', texte: nombre(part), unite: '%' },
    details: [
      `${TEXTES_COMPTAGES.retardMoyen} : ${formaterRetardMoyen(total)}`,
      TEXTES_COMPTAGES.ontLeursHeures(
        libelleCompletude(total.avecHeures, total.tenus),
        total.avecHeures,
      ),
    ],
    sousLignes: [
      `${TEXTES_COMPTAGES.cultes} : ${libelleCompletude(cultes.aLHeure, cultes.avecHeures)}`,
      `${TEXTES_COMPTAGES.autres} : ${libelleCompletude(evenements.aLHeure, evenements.avecHeures)}`,
    ],
  }
}

/**
 * Les deux blocs, ou null quand la base ne rend aucun mois (aucun événement ni culte compté :
 * premier usage). Lignes triées ici du plus récent au plus ancien, comme la base les rend.
 */
export function construireComptages(
  lignesLues: readonly LigneComptagesEglise[],
): DonneesComptages | null {
  const lignes = [...lignesLues].sort((a, b) => b.mois.localeCompare(a.mois))
  const [enCours, ecoule] = lignes
  if (enCours === undefined) return null
  const moisEnCours = moisDe(enCours.mois)
  const libelleEnCours = libelleMoisEnCours(moisEnCours)
  const jourDepuis = formaterJourCourt(enCours.depuis)
  const libelleDepuis = TEXTES_COMPTAGES.depuis(jourDepuis)
  const principal = ecoule ?? enCours
  const moisPrincipal = moisDe(principal.mois)
  const periode = ecoule === undefined ? libelleEnCours : libelleMois(moisPrincipal)

  // Un seul mois : « Depuis le ... » redirait le mois en cours.
  const plusieursMois = lignes.length > 1
  const totalRealises = lignes.reduce((somme, ligne) => somme + ligne.realises, 0)
  const evenements = CLES_COMPTAGES.map((cle) =>
    ligneEvenements(
      cle,
      principal,
      ecoule === undefined ? null : { libelle: libelleEnCours, ligne: enCours },
      plusieursMois ? { libelle: libelleDepuis, total: totalRealises } : null,
    ),
  )

  const ponctualite = [lignePonctualite('principal', periode, ponctualiteDuMois(principal))]
  if (ecoule !== undefined) {
    ponctualite.push(lignePonctualite('en_cours', libelleEnCours, ponctualiteDuMois(enCours)))
  }
  if (plusieursMois) {
    ponctualite.push(lignePonctualite('depuis', libelleDepuis, ponctualiteDesMois(lignes)))
  }

  const enRetard = principal.avec_heures - principal.a_l_heure
  const debut = principal.mois
  return {
    periode,
    depuis: jourDepuis,
    evenements,
    ponctualite,
    retards:
      enRetard > 0
        ? {
            debut,
            fin: ajouterJours(premierJourDuMois(ajouterMois(moisPrincipal, 1)), -1),
            nombre: enRetard,
            mois: nomDuMois(Number(moisPrincipal.slice(5, 7))),
          }
        : null,
  }
}

/** La liste des retards, par date puis titre comme la base les rend, avec le nom du porteur. */
export function construireRetards(
  retards: readonly RetardEvenement[],
  nomsMinisteres: ReadonlyMap<string, string>,
): LigneRetard[] {
  return retards.map((retard) => ({
    id: retard.id,
    jour: formaterJourAbrege(retard.date),
    titre: retard.titre,
    ministere: nomsMinisteres.get(retard.ministere_id) ?? null,
    retard: TEXTES_COMPTAGES.retards.retard(formaterMinutes(retard.retard)),
  }))
}
