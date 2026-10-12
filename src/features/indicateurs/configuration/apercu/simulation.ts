// Écritures simulées de l'aperçu de développement `/apercu/indicateurs` (lot L3b) : les mêmes
// règles que la base pour les cas que l'aperçu montre (doublon, 30 lignes, correction d'un chiffre
// déjà saisi, retrait d'une source, retrait pour confidentialité), appliquées à des lectures
// d'exemple. Aucune écriture réelle, aucune valeur d'indicateur. Les fonctions sont pures : elles
// rendent l'état suivant ou lèvent un refus que l'écran lit comme celui de la base (`P0001`).

import type { IndicateurConfiguration, LigneUsage } from '@/data/indicateursConfiguration'
import type { Ajout, Calcul, Correction, LigneTerme } from '@/data/indicateursEcriture'
import type { LecturesConfiguration } from '@/features/indicateurs/configuration/construire'
import { normaliser } from '@/features/indicateurs/configuration/normaliser'
import type { LimitesIndicateurs, MotifRetraitChoisi, VerificationLibelle } from '@/lib/base'

/** Le refus d'une erreur de saisie de la base : code `P0001`, message affiché tel quel. */
export class RefusSimule extends Error {
  readonly code = 'P0001'
}

export interface EtatSimule {
  lectures: LecturesConfiguration
  termes: LigneTerme[]
  /** Compteur des identifiants créés. */
  compteur: number
}

const LIGNES_MAX = 30
const MASQUE = '[retiré pour confidentialité]'

function suivis(lectures: LecturesConfiguration, ministereId: string) {
  return lectures.indicateurs.filter(
    (indicateur) => indicateur.ministere_id === ministereId && indicateur.etat !== 'retire',
  )
}

/** `limites_indicateurs` : les lignes suivies (30 au plus) et les ajouts du ministère (3 au plus). */
export function limitesSimulees(etat: EtatSimule, ministereId: string): LimitesIndicateurs {
  const siens = suivis(etat.lectures, ministereId)
  return {
    ajouts: siens.filter((indicateur) => indicateur.origine === 'ministere').length,
    ajouts_max: 3,
    lignes: siens.length,
    lignes_max: LIGNES_MAX,
  }
}

function identifiant(compteur: number): string {
  return `30000000-0000-4000-8000-${String(compteur).padStart(12, '0')}`
}

function libellePris(
  lectures: LecturesConfiguration,
  ministereId: string,
  libelle: string,
  sauf: string | null,
): string | null {
  const cible = normaliser(libelle)
  return (
    suivis(lectures, ministereId).find(
      (indicateur) => indicateur.id !== sauf && normaliser(indicateur.libelle) === cible,
    )?.libelle ?? null
  )
}

function verifierPlace(lectures: LecturesConfiguration, ministereId: string, sauf: string | null) {
  const lignes = suivis(lectures, ministereId).filter((indicateur) => indicateur.id !== sauf).length
  if (lignes >= LIGNES_MAX) {
    throw new RefusSimule(
      `Cette fiche compte déjà ${LIGNES_MAX} indicateurs. Retirez-en un pour en ajouter un autre.`,
    )
  }
}

function ligneUsageVierge(indicateur: IndicateurConfiguration): LigneUsage {
  return {
    indicateur_id: indicateur.id,
    ministere_id: indicateur.ministere_id ?? '',
    nb_periodes_saisies: 0,
    nb_periodes_attendues: 0,
    derniere_saisie_le: null,
    jamais_saisi: true,
    attente_jours: null,
  }
}

function retirerUn(
  indicateurs: readonly IndicateurConfiguration[],
  id: string,
  motif: IndicateurConfiguration['retrait_motif'],
  maintenant: string,
  masquer = false,
): IndicateurConfiguration[] {
  return indicateurs.map((indicateur) =>
    indicateur.id === id
      ? {
          ...indicateur,
          etat: 'retire' as const,
          retire_le: maintenant,
          retrait_motif: motif,
          ...(masquer ? { libelle: MASQUE, definition: MASQUE } : {}),
        }
      : indicateur,
  )
}

function avecGeste(
  etat: EtatSimule,
  ministereId: string,
  action: string,
  maintenant: string,
): EtatSimule['lectures'] {
  const geste = { ministere_id: ministereId, le: maintenant, action, detail: null }
  return { ...etat.lectures, changements: [geste, ...etat.lectures.changements] }
}

/** `creer_indicateur` : refuse un doublon et une fiche pleine, retire l'indicateur remplacé. */
export function ajouterSimule(
  etat: EtatSimule,
  ministereId: string,
  entree: Ajout,
  remplaceId: string | null,
  maintenant: string,
): EtatSimule {
  verifierPlace(etat.lectures, ministereId, remplaceId)
  const pris = libellePris(etat.lectures, ministereId, entree.libelle, remplaceId)
  if (pris !== null) throw new RefusSimule(`Cette fiche a déjà « ${pris} ».`)
  const compteur = etat.compteur + 1
  const nouveau: IndicateurConfiguration = {
    id: identifiant(compteur),
    libelle: entree.libelle,
    definition: entree.definition,
    nature: entree.nature,
    unite: entree.sensible ? 'nombre' : entree.unite,
    sensible: entree.sensible,
    calcul: null,
    etat: 'actif',
    origine: 'eglise',
    ministere_id: ministereId,
    modele_code: null,
    remplace_id: remplaceId,
    cree_le: maintenant,
    texte_le: maintenant,
    retire_le: null,
    retrait_motif: null,
  }
  const anciens =
    remplaceId === null
      ? etat.lectures.indicateurs
      : retirerUn(etat.lectures.indicateurs, remplaceId, 'remplace', maintenant)
  const lectures = {
    ...avecGeste(etat, ministereId, 'indicateur_cree', maintenant),
    indicateurs: [...anciens, nouveau],
    usage: [...etat.lectures.usage, ligneUsageVierge(nouveau)],
  }
  return { ...etat, lectures, compteur }
}

/** `creer_calcul` : le calcul prend le rythme et, pour une moyenne, l'unité de son haut. */
export function ajouterCalculSimule(
  etat: EtatSimule,
  ministereId: string,
  entree: Calcul,
  remplaceId: string | null,
  maintenant: string,
): EtatSimule {
  const haut = etat.lectures.indicateurs.find((indicateur) => indicateur.id === entree.hautId)
  if (haut === undefined || !etat.lectures.indicateurs.some((i) => i.id === entree.basId)) {
    throw new RefusSimule('Ces deux chiffres ne se calculent pas ensemble.')
  }
  verifierPlace(etat.lectures, ministereId, remplaceId)
  const pris = libellePris(etat.lectures, ministereId, entree.libelle, remplaceId)
  if (pris !== null) throw new RefusSimule(`Cette fiche a déjà « ${pris} ».`)
  const compteur = etat.compteur + 1
  const nouveau: IndicateurConfiguration = {
    id: identifiant(compteur),
    libelle: entree.libelle,
    definition: entree.definition,
    nature: haut.nature,
    unite: entree.type === 'moyenne' ? haut.unite : 'nombre',
    sensible: false,
    calcul: entree.type,
    etat: 'actif',
    origine: 'eglise',
    ministere_id: ministereId,
    modele_code: null,
    remplace_id: remplaceId,
    cree_le: maintenant,
    texte_le: maintenant,
    retire_le: null,
    retrait_motif: null,
  }
  const anciens =
    remplaceId === null
      ? etat.lectures.indicateurs
      : retirerUn(etat.lectures.indicateurs, remplaceId, 'remplace', maintenant)
  return {
    lectures: {
      ...avecGeste(etat, ministereId, 'indicateur_cree', maintenant),
      indicateurs: [...anciens, nouveau],
    },
    termes: [
      ...etat.termes,
      { calcul_id: nouveau.id, source_id: entree.hautId, role: 'haut' },
      { calcul_id: nouveau.id, source_id: entree.basId, role: 'bas' },
    ],
    compteur,
  }
}

/** `corriger_indicateur` : refuse un chiffre déjà saisi, comme la base. */
export function corrigerSimule(
  etat: EtatSimule,
  ministereId: string,
  indicateurId: string,
  entree: Correction,
  maintenant: string,
): EtatSimule {
  const cible = etat.lectures.indicateurs.find((indicateur) => indicateur.id === indicateurId)
  if (cible === undefined)
    throw new RefusSimule("Cet élément n'existe pas ou vous n'y avez pas accès.")
  const aDesValeurs = (id: string) =>
    etat.lectures.usage.some((ligne) => ligne.indicateur_id === id && !ligne.jamais_saisi)
  const sources = etat.termes.filter((terme) => terme.calcul_id === indicateurId)
  const saisi =
    cible.calcul === null
      ? aDesValeurs(indicateurId)
      : sources.some((terme) => terme.source_id !== null && aDesValeurs(terme.source_id))
  if (saisi) {
    throw new RefusSimule('Ce chiffre a déjà des valeurs : remplacez-le pour en changer le sens.')
  }
  const pris = libellePris(etat.lectures, ministereId, entree.libelle, indicateurId)
  if (pris !== null) throw new RefusSimule(`Cette fiche a déjà « ${pris} ».`)
  if (entree.libelle === cible.libelle && entree.definition === cible.definition) {
    throw new RefusSimule("Rien n'a changé : ce libellé et cette définition sont déjà enregistrés.")
  }
  return {
    ...etat,
    lectures: {
      ...avecGeste(etat, ministereId, 'indicateur_corrige', maintenant),
      indicateurs: etat.lectures.indicateurs.map((indicateur) =>
        indicateur.id === indicateurId
          ? {
              ...indicateur,
              libelle: entree.libelle,
              definition: entree.definition,
              texte_le: maintenant,
            }
          : indicateur,
      ),
    },
  }
}

/**
 * `retirer_indicateur` : l'indicateur est retiré avec son motif, les calculs qui s'en servent le
 * sont avec lui (motif « source retirée »), et « confidentialité » masque aussi ses deux textes.
 * Rend le nombre de calculs retirés.
 */
export function retirerSimule(
  etat: EtatSimule,
  ministereId: string,
  indicateurId: string,
  motif: MotifRetraitChoisi | 'confidentialite',
  maintenant: string,
): { etat: EtatSimule; calculs: number } {
  const cible = etat.lectures.indicateurs.find((indicateur) => indicateur.id === indicateurId)
  if (cible === undefined)
    throw new RefusSimule("Cet élément n'existe pas ou vous n'y avez pas accès.")
  if (cible.etat === 'retire') throw new RefusSimule('Cet indicateur est déjà retiré.')
  let indicateurs = retirerUn(
    etat.lectures.indicateurs,
    indicateurId,
    motif,
    maintenant,
    motif === 'confidentialite',
  )
  const dependants = new Set(
    etat.termes.filter((terme) => terme.source_id === indicateurId).map((terme) => terme.calcul_id),
  )
  let calculs = 0
  for (const id of dependants) {
    const calcul = indicateurs.find((indicateur) => indicateur.id === id)
    if (calcul !== undefined && calcul.etat !== 'retire') {
      indicateurs = retirerUn(indicateurs, id, 'source_retiree', maintenant)
      calculs += 1
    }
  }
  return {
    calculs,
    etat: {
      ...etat,
      lectures: { ...avecGeste(etat, ministereId, 'indicateur_retire', maintenant), indicateurs },
    },
  }
}

/** `verifier_libelle`, pour les cas que l'aperçu montre : données personnelles, calcul, domaine sensible, doublon. */
export function verifierSimule(
  etat: EtatSimule,
  ministereId: string,
  libelle: string,
): VerificationLibelle[] {
  const verifications: VerificationLibelle[] = []
  if (/@|http|www|\d{5}/i.test(libelle)) {
    verifications.push({
      famille: 'donnees_personnelles',
      message: "N'écrivez aucun nom ni information personnelle.",
      bloquant: true,
    })
  }
  if (/taux|moyenne|%/i.test(libelle)) {
    verifications.push({
      famille: 'calcul',
      message: 'Un taux, une moyenne ou une évolution se calcule : ne le saisissez pas.',
      bloquant: true,
    })
  }
  if (/sant[eé]|enfant|accompagn/i.test(libelle)) {
    verifications.push({
      famille: 'sensible',
      message:
        'Ce chiffre semble sensible : cochez « Domaine sensible », ou confirmez que ce n’est pas le cas.',
      bloquant: true,
    })
  }
  const pris = libellePris(etat.lectures, ministereId, libelle, null)
  if (pris !== null) {
    verifications.push({
      famille: 'doublon',
      message: `Cette fiche a déjà « ${pris} ».`,
      bloquant: true,
    })
  }
  return verifications
}
