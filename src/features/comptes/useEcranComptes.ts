import { useState } from 'react'
import { flushSync } from 'react-dom'
import { ErreurCompte } from '@/data/comptes'
import type { CodeErreurCompte } from '@/data/comptes'
import { referenceEchec } from '@/data/echecEnvoi'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import type { PanneauOuvert } from '@/features/comptes/PanneauCompte'
import { RAISON_INCONNUE } from '@/features/comptes/raisons'
import type { RaisonSuppression } from '@/features/comptes/raisons'
import { lireRefusCompte } from '@/features/comptes/refus'
import type { ResultatAction } from '@/features/comptes/ResultatLigne'
import {
  confirmationDesactiverCompte,
  confirmationDesactiverMinistere,
  confirmationRefaireActivation,
  confirmationSupprimerMinistere,
  refusSuppression,
  REUSSITES_COMPTES,
} from '@/features/comptes/textes'
import type {
  ApresRefus,
  TexteConfirmation,
  TexteRefusSuppression,
} from '@/features/comptes/textes'
import type { ActionsComptes, LigneCompte } from '@/features/comptes/types'

/** Fenêtre de confirmation ouverte : son texte et l'action qu'elle confirme. */
export interface ConfirmationOuverte {
  texte: TexteConfirmation
  confirmer: () => Promise<void>
}

/** Fenêtre « impossible » d'une suppression (T75) : ses textes, et « Désactiver » s'il y a lieu. */
export interface RefusOuvert {
  texte: TexteRefusSuppression
  desactiver: (() => void) | null
}

/** Refus de supprimer-ministere qui disent pourquoi le ministère reste : l'écran relit ses raisons. */
const REFUS_DE_SUPPRESSION: ReadonlySet<CodeErreurCompte> = new Set([
  'ministere_non_vide',
  'compte_deja_active',
  'ministere_de_reference',
])

/** Ce que propose la fenêtre « impossible » : désactiver un compte actif, ou rien. */
function apresRefus(ligne: LigneCompte): ApresRefus {
  if (ligne.etat === 'desactive') return 'deja_desactive'
  if (ligne.userId === null || ligne.etat === 'sans_compte') return 'sans_compte'
  return 'desactiver'
}

/**
 * État de l'écran 13 : panneau ouvert, fenêtre de confirmation, fenêtre « impossible » d'une
 * suppression (T75), action directe en cours (relance, réactivation), message de réussite d'une
 * création (en haut de la page, 6 secondes) et résultat de la dernière action d'une ligne (sous
 * les boutons de cette ligne). Les actions viennent de la page (Edge Functions) ou de l'aperçu
 * (simulées).
 */
export function useEcranComptes(actions: ActionsComptes) {
  const [panneau, setPanneau] = useState<PanneauOuvert | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationOuverte | null>(null)
  const [refus, setRefus] = useState<{
    ligne: LigneCompte
    raisons: readonly RaisonSuppression[]
  } | null>(null)
  const [enCours, setEnCours] = useState<{ cle: string; action: ActionLigne } | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const [resultat, setResultat] = useState<ResultatAction | null>(null)

  /** Résultat d'une action de ligne : un nouveau numéro, pour réafficher le même message. */
  const noterResultat = (
    cle: string,
    reussiteAction: boolean,
    message: string,
    reference: string | null = null,
  ) => {
    setReussite(null)
    setResultat((precedent) => ({
      cle,
      reussite: reussiteAction,
      message,
      envoi: (precedent?.envoi ?? 0) + 1,
      reference,
    }))
  }

  /** Relance ou réactivation : sans fenêtre, le bouton dit « Envoi en cours ». */
  const agirDirectement = async (
    ligne: LigneCompte,
    action: ActionLigne,
    appel: (userId: string) => Promise<void>,
    message: string,
  ) => {
    if (ligne.userId === null || enCours !== null) return
    setEnCours({ cle: ligne.cle, action })
    setResultat(null)
    try {
      await appel(ligne.userId)
      noterResultat(ligne.cle, true, message)
    } catch (erreur) {
      noterResultat(
        ligne.cle,
        false,
        lireRefusCompte(erreur, 'ligne').message,
        referenceEchec(erreur),
      )
    } finally {
      setEnCours(null)
    }
  }

  /**
   * Désactivation et « Refaire l'activation » : la fenêtre de confirmation d'abord. Un refus
   * s'affiche dans la fenêtre ; la réussite, sous les boutons de la ligne.
   */
  const confirmerPuis = (
    ligne: LigneCompte,
    texte: TexteConfirmation,
    appel: () => Promise<void>,
    message: string,
  ) => {
    setResultat(null)
    setConfirmation({
      texte,
      confirmer: async () => {
        await appel()
        setConfirmation(null)
        noterResultat(ligne.cle, true, message)
      },
    })
  }

  const ouvrirPanneau = (ouvert: PanneauOuvert) => {
    setResultat(null)
    setPanneau(ouvert)
  }

  /** Réussite d'un panneau ou d'une suppression : en haut de la page, la ligne a pu partir. */
  const annoncer = (message: string) => {
    setPanneau(null)
    setResultat(null)
    setReussite(message)
    setEnvoi((precedent) => precedent + 1)
  }

  const libelleDe = (ligne: LigneCompte) =>
    ligne.type === 'ministere' ? `Ministère ${ligne.nom}` : ligne.nom

  const desactiver = (ligne: LigneCompte) => {
    const userId = ligne.userId
    if (userId === null) return
    confirmerPuis(
      ligne,
      ligne.type === 'ministere'
        ? confirmationDesactiverMinistere(ligne.nom, ligne.email)
        : confirmationDesactiverCompte(ligne.nom, ligne.email),
      () => actions.desactiver(userId),
      REUSSITES_COMPTES.desactive(libelleDe(ligne)),
    )
  }

  /**
   * « Supprimer » (T75) : un ministère sans raison ouvre la confirmation (avec les sessions qu'il
   * quitte) ; sinon, la fenêtre « impossible » dit pourquoi. La base revérifie : si elle refuse au
   * dernier moment, l'écran relit les raisons et la fenêtre « impossible » remplace la
   * confirmation (« une autre donnée » si la base n'en nomme aucune).
   */
  const supprimer = (ligne: LigneCompte) => {
    const ministereId = ligne.ministereId
    const suppression = ligne.suppression
    if (ministereId === null || suppression === null) return
    setResultat(null)
    if (suppression.raisons.length > 0) {
      setRefus({ ligne, raisons: suppression.raisons })
      return
    }
    setConfirmation({
      texte: confirmationSupprimerMinistere(
        ligne.nom,
        ligne.email,
        ligne.indicateurs ?? 0,
        suppression.sessions,
      ),
      confirmer: async () => {
        try {
          await actions.supprimer(ministereId)
        } catch (erreur) {
          if (!(erreur instanceof ErreurCompte) || !REFUS_DE_SUPPRESSION.has(erreur.code)) {
            throw erreur
          }
          const relue = await actions.lireSuppression(ministereId).catch(() => null)
          if (relue === null) throw erreur
          // La confirmation part d'abord : le focus revient au bouton « Supprimer », où la
          // fenêtre « impossible » le rendra à sa fermeture.
          flushSync(() => setConfirmation(null))
          setRefus({ ligne, raisons: relue.raisons.length > 0 ? relue.raisons : [RAISON_INCONNUE] })
          return
        }
        setConfirmation(null)
        annoncer(REUSSITES_COMPTES.supprime(libelleDe(ligne)))
      },
    })
  }

  const surAction = (ligne: LigneCompte, action: ActionLigne) => {
    const ministere = ligne.type === 'ministere'
    const libelle = libelleDe(ligne)
    const userId = ligne.userId
    if (action === 'creer') {
      if (ligne.ministereId !== null) {
        ouvrirPanneau({
          genre: 'ministere_existant',
          ministereId: ligne.ministereId,
          nom: ligne.nom,
        })
      }
      return
    }
    if (action === 'supprimer') {
      supprimer(ligne)
      return
    }
    if (userId === null) return
    const compteVise = { userId, nom: ligne.nom, libelle, email: ligne.email, ministere }
    switch (action) {
      case 'relancer':
        void agirDirectement(
          ligne,
          action,
          actions.relancer,
          REUSSITES_COMPTES.invitationRelancee(ligne.email ?? ligne.nom),
        )
        return
      case 'corriger':
        ouvrirPanneau({ genre: 'corriger', ...compteVise })
        return
      case 'reactiver':
        // Jamais activé : la réactivation propose de corriger l'adresse au passage (T74).
        if (ligne.jamaisActive) {
          ouvrirPanneau({ genre: 'reactiver', ...compteVise })
          return
        }
        void agirDirectement(ligne, action, actions.reactiver, REUSSITES_COMPTES.reactive(libelle))
        return
      case 'desactiver':
        desactiver(ligne)
        return
      case 'refaire':
        confirmerPuis(
          ligne,
          confirmationRefaireActivation(ligne.nom, ministere),
          () => actions.refaireActivation(userId),
          REUSSITES_COMPTES.activationARefaire(libelle),
        )
        return
    }
  }

  // « Désactiver » dans la fenêtre « impossible » : elle part d'abord (le focus revient au bouton
  // « Supprimer »), puis la confirmation de la désactivation s'ouvre et y reviendra.
  const refusOuvert: RefusOuvert | null =
    refus === null
      ? null
      : {
          texte: refusSuppression(refus.ligne.nom, refus.raisons, apresRefus(refus.ligne)),
          desactiver:
            apresRefus(refus.ligne) === 'desactiver'
              ? () => {
                  flushSync(() => setRefus(null))
                  desactiver(refus.ligne)
                }
              : null,
        }

  return {
    panneau,
    ouvrirPanneau,
    fermerPanneau: () => setPanneau(null),
    /** Panneau réussi : il se ferme et le message s'affiche en haut de la page. */
    apresCreation: annoncer,
    confirmation,
    annulerConfirmation: () => setConfirmation(null),
    refus: refusOuvert,
    fermerRefus: () => setRefus(null),
    enCours,
    reussite,
    envoi,
    resultat,
    surAction,
  }
}
