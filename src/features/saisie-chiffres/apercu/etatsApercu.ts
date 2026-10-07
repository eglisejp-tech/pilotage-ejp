// États des aperçus du lot E3 (/apercu/saisies?ecran=...&etat=...), construits avec les mêmes
// fonctions que les lectures réelles (`champsDimanche`, `champsMois`, `choisirMois`...), sur les
// données d'exemple. Aucune base, aucun envoi.

import {
  aIndicateurDuMatin,
  champsDimanche,
  champsMois,
  dimanchesSaisis,
  moisComplets,
} from '@/features/saisie-chiffres/champs'
import {
  choisirDimanche,
  choisirMois,
  dimanchesProposes,
  moisAProposer,
  moisARattraper,
} from '@/features/saisie-chiffres/choixPeriode'
import {
  CATEGORIES_EXEMPLE,
  detailsExemple,
  envoiExemple,
  INDICATEURS_DIMANCHE,
  indicateursMoisExemple,
  MESURES_A_CE_JOUR,
  MESURES_MOIS_CORRECTION,
  mesuresDimancheExemple,
  MOIS_EN_COURS_EXEMPLE,
  SEMAINE_DIMANCHE_MATIN,
  SEMAINE_EXEMPLE,
} from '@/features/saisie-chiffres/apercu/exemples'
import type { EtatSaisieDimanche } from '@/features/saisie-chiffres/useSaisieDimanche'
import type { EtatSaisieMois } from '@/features/saisie-chiffres/useSaisieMois'

const reessayer = () => undefined

/** Message d'un refus de la base sur une précision (`private.verifier_texte`, famille données personnelles). */
export const REFUS_PRECISION_EXEMPLE = "N'écrivez aucun nom ni information personnelle."

/**
 * Saisie du dimanche dans l'état demandé : `correction` (une saisie fait déjà foi), `matin` (le
 * dimanche du jour avant midi), `matin-vide` (sans indicateur du matin), `refuse` (date de
 * l'adresse refusée), `chargement`, `erreur` (lecture en échec), `coupure` (envoi en échec).
 */
export function etatApercuDimanche(etat: string | null): EtatSaisieDimanche {
  if (etat === 'chargement') return { etat: 'chargement' }
  if (etat === 'erreur') return { etat: 'erreur', reessayer }
  const matin = etat === 'matin' || etat === 'matin-vide'
  const semaine = matin ? SEMAINE_DIMANCHE_MATIN : SEMAINE_EXEMPLE
  const choix = choisirDimanche(
    etat === 'refuse' ? '2026-09-30' : matin ? semaine.aujourdhui : null,
    semaine,
  )
  if (choix.etat === 'refuse') return { etat: 'refuse', dimancheReference: semaine.dimanche }
  const indicateurs =
    etat === 'matin-vide'
      ? INDICATEURS_DIMANCHE.filter((indicateur) => !indicateur.saisi_dimanche_matin)
      : INDICATEURS_DIMANCHE
  const mesuresDimanche = mesuresDimancheExemple(etat === 'correction')
  return {
    etat: 'pret',
    dimanche: choix.dimanche,
    dimancheReference: semaine.dimanche,
    matin: choix.matin,
    champs: champsDimanche({
      dimanche: choix.dimanche,
      matin: choix.matin,
      indicateurs,
      mesuresDimanche,
      mesuresACeJour: MESURES_A_CE_JOUR,
    }),
    proposes: dimanchesProposes(
      semaine,
      dimanchesSaisis(indicateurs, mesuresDimanche),
      aIndicateurDuMatin(indicateurs),
    ),
    enregistrer: envoiExemple(etat === 'coupure' ? 'coupure' : 'reussite'),
  }
}

/**
 * « Chiffres du mois » dans l'état demandé : le mois proposé d'abord (août 2026, rien de saisi),
 * `correction` (septembre en cours, total, précision et répartition repris), `masquee` (précision
 * masquée par EJP Tech), `sans-categories` (sensible sans liste), `sans-indicateur`, `refuse`
 * (mois futur dans l'adresse), `chargement`, `erreur`, `coupure` et `refus-precision` (refus de
 * la base sur le texte, affiché sous le champ).
 */
export function etatApercuMois(etat: string | null): EtatSaisieMois {
  if (etat === 'chargement') return { etat: 'chargement' }
  if (etat === 'erreur') return { etat: 'erreur', reessayer }
  if (etat === 'sans-indicateur') return { etat: 'sans_indicateur' }
  const indicateurs = indicateursMoisExemple(etat !== 'sans-categories')
  const correction = etat === 'correction' || etat === 'masquee' || etat === 'refus-precision'
  const mesuresMois = correction ? MESURES_MOIS_CORRECTION : []
  const complets = moisComplets(indicateurs, mesuresMois)
  const choix = choisirMois(
    etat === 'refuse' ? '2026-11' : correction ? MOIS_EN_COURS_EXEMPLE : null,
    SEMAINE_EXEMPLE.aujourdhui,
    complets,
  )
  if (choix.etat === 'refuse') {
    return { etat: 'refuse', message: choix.message, moisPropose: choix.moisPropose }
  }
  return {
    etat: 'pret',
    mois: choix.mois,
    enCours: choix.enCours,
    champs: champsMois({
      mois: choix.mois,
      indicateurs,
      mesuresMois,
      categories: CATEGORIES_EXEMPLE,
      details: correction ? detailsExemple(etat === 'masquee') : [],
    }),
    proposes: moisAProposer(SEMAINE_EXEMPLE.aujourdhui, complets),
    rattrapage: moisARattraper(SEMAINE_EXEMPLE.aujourdhui, complets),
    enregistrer: envoiExemple(
      etat === 'coupure' ? 'coupure' : etat === 'refus-precision' ? 'refus' : 'reussite',
      REFUS_PRECISION_EXEMPLE,
    ),
  }
}
