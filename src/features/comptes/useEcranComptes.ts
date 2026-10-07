import { useState } from 'react'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import type { PanneauOuvert } from '@/features/comptes/PanneauCompte'
import { lireRefusCompte } from '@/features/comptes/refus'
import type { ResultatAction } from '@/features/comptes/ResultatLigne'
import {
  confirmationDesactiverCompte,
  confirmationDesactiverMinistere,
  confirmationRefaireActivation,
  REUSSITES_COMPTES,
} from '@/features/comptes/textes'
import type { TexteConfirmation } from '@/features/comptes/textes'
import type { ActionsComptes, LigneCompte } from '@/features/comptes/types'

/** Fenêtre de confirmation ouverte : son texte et l'action qu'elle confirme. */
export interface ConfirmationOuverte {
  texte: TexteConfirmation
  confirmer: () => Promise<void>
}

/**
 * État de l'écran 13 : panneau ouvert, fenêtre de confirmation, action directe en cours
 * (relance, réactivation), message de réussite d'une création (en haut de la page, 6 secondes)
 * et résultat de la dernière action d'une ligne (sous les boutons de cette ligne).
 * Les actions viennent de la page (Edge Functions) ou de l'aperçu (simulées).
 */
export function useEcranComptes(actions: ActionsComptes) {
  const [panneau, setPanneau] = useState<PanneauOuvert | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationOuverte | null>(null)
  const [enCours, setEnCours] = useState<{ cle: string; action: ActionLigne } | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const [resultat, setResultat] = useState<ResultatAction | null>(null)

  /** Résultat d'une action de ligne : un nouveau numéro, pour réafficher le même message. */
  const noterResultat = (cle: string, reussiteAction: boolean, message: string) => {
    setReussite(null)
    setResultat((precedent) => ({
      cle,
      reussite: reussiteAction,
      message,
      envoi: (precedent?.envoi ?? 0) + 1,
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
      noterResultat(ligne.cle, false, lireRefusCompte(erreur).message)
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

  const surAction = (ligne: LigneCompte, action: ActionLigne) => {
    const ministere = ligne.type === 'ministere'
    const libelle = ministere ? `Ministère ${ligne.nom}` : ligne.nom
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
    if (userId === null) return
    switch (action) {
      case 'relancer':
        void agirDirectement(
          ligne,
          action,
          actions.relancer,
          REUSSITES_COMPTES.invitationRelancee(ligne.email ?? ligne.nom),
        )
        return
      case 'reactiver':
        void agirDirectement(ligne, action, actions.reactiver, REUSSITES_COMPTES.reactive(libelle))
        return
      case 'desactiver':
        confirmerPuis(
          ligne,
          ministere
            ? confirmationDesactiverMinistere(ligne.nom, ligne.email)
            : confirmationDesactiverCompte(ligne.nom, ligne.email),
          () => actions.desactiver(userId),
          REUSSITES_COMPTES.desactive(libelle),
        )
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

  return {
    panneau,
    ouvrirPanneau,
    fermerPanneau: () => setPanneau(null),
    /** Création réussie : le panneau se ferme et le message s'affiche en haut de la page. */
    apresCreation: (message: string) => {
      setPanneau(null)
      setResultat(null)
      setReussite(message)
      setEnvoi((precedent) => precedent + 1)
    },
    confirmation,
    annulerConfirmation: () => setConfirmation(null),
    enCours,
    reussite,
    envoi,
    resultat,
    surAction,
  }
}
