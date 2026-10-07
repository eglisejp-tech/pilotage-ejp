import { useState } from 'react'
import type { ActionLigne } from '@/features/comptes/actionsLigne'
import type { PanneauOuvert } from '@/features/comptes/PanneauCompte'
import { lireRefusCompte } from '@/features/comptes/refus'
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
 * (relance, réactivation), message de réussite (6 secondes) et refus d'une action directe.
 * Les actions viennent de la page (Edge Functions) ou de l'aperçu (simulées).
 */
export function useEcranComptes(actions: ActionsComptes) {
  const [panneau, setPanneau] = useState<PanneauOuvert | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationOuverte | null>(null)
  const [enCours, setEnCours] = useState<{ cle: string; action: ActionLigne } | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)

  const annoncer = (message: string) => {
    setRefus(null)
    setReussite(message)
    setEnvoi((precedent) => precedent + 1)
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
    setRefus(null)
    try {
      await appel(ligne.userId)
      annoncer(message)
    } catch (erreur) {
      setReussite(null)
      setRefus(lireRefusCompte(erreur).message)
    } finally {
      setEnCours(null)
    }
  }

  /** Désactivation et « Refaire l'activation » : la fenêtre de confirmation d'abord. */
  const confirmerPuis = (texte: TexteConfirmation, appel: () => Promise<void>, message: string) => {
    setRefus(null)
    setConfirmation({
      texte,
      confirmer: async () => {
        await appel()
        setConfirmation(null)
        annoncer(message)
      },
    })
  }

  const surAction = (ligne: LigneCompte, action: ActionLigne) => {
    const ministere = ligne.type === 'ministere'
    const libelle = ministere ? `Ministère ${ligne.nom}` : ligne.nom
    const userId = ligne.userId
    if (action === 'creer') {
      if (ligne.ministereId !== null) {
        setPanneau({ genre: 'ministere_existant', ministereId: ligne.ministereId, nom: ligne.nom })
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
          ministere
            ? confirmationDesactiverMinistere(ligne.nom, ligne.email)
            : confirmationDesactiverCompte(ligne.nom, ligne.email),
          () => actions.desactiver(userId),
          REUSSITES_COMPTES.desactive(libelle),
        )
        return
      case 'refaire':
        confirmerPuis(
          confirmationRefaireActivation(ligne.nom, ministere),
          () => actions.refaireActivation(userId),
          REUSSITES_COMPTES.activationARefaire(libelle),
        )
        return
    }
  }

  return {
    panneau,
    ouvrirPanneau: (ouvert: PanneauOuvert) => {
      setRefus(null)
      setPanneau(ouvert)
    },
    fermerPanneau: () => setPanneau(null),
    /** Création réussie : le panneau se ferme et le message s'affiche sur la page. */
    apresCreation: (message: string) => {
      setPanneau(null)
      annoncer(message)
    },
    confirmation,
    annulerConfirmation: () => setConfirmation(null),
    enCours,
    reussite,
    envoi,
    refus,
    surAction,
  }
}
