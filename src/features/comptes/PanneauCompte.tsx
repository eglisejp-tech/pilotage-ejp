import { useRef } from 'react'
import { FormulaireAdresse } from '@/features/comptes/FormulaireAdresse'
import { FormulaireCorrectionAdresse } from '@/features/comptes/FormulaireCorrectionAdresse'
import { FormulaireNouveauMinistere } from '@/features/comptes/FormulaireNouveauMinistere'
import { REUSSITES_COMPTES, TEXTES_COMPTES } from '@/features/comptes/textes'
import type { ActionsComptes } from '@/features/comptes/types'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'

/** Compte visé par une correction d'adresse ou une réactivation avec adresse (T74). */
interface CompteVise {
  userId: string
  /** Nom de la ligne (« Tech », « Conseil, compte 3 »), pour le titre du panneau. */
  nom: string
  /** Nom des messages (« Ministère Tech », « Conseil, compte 3 »). */
  libelle: string
  email: string | null
  ministere: boolean
}

/** Le panneau ouvert sur l'écran 13. */
export type PanneauOuvert =
  | { genre: 'ministere' }
  | { genre: 'ministere_existant'; ministereId: string; nom: string }
  | { genre: 'berger' }
  | { genre: 'conseil'; nomAffiche: string }
  | { genre: 'admin_plateforme'; nomAffiche: string }
  | ({ genre: 'corriger' } & CompteVise)
  | ({ genre: 'reactiver' } & CompteVise)

interface Props {
  panneau: PanneauOuvert
  actions: Pick<ActionsComptes, 'creer' | 'corriger' | 'reactiver'>
  /** Action réussie : le panneau se ferme et la page affiche ce message. */
  onCree: (message: string) => void
  onFermer: () => void
}

function titreDu(panneau: PanneauOuvert): string {
  switch (panneau.genre) {
    case 'ministere':
      return TEXTES_COMPTES.panneauMinistere
    case 'ministere_existant':
      return TEXTES_COMPTES.panneauCompteMinistere(panneau.nom)
    case 'berger':
      return TEXTES_COMPTES.panneauBerger
    case 'conseil':
      return TEXTES_COMPTES.panneauConseil
    case 'admin_plateforme':
      return TEXTES_COMPTES.panneauEjpTech
    case 'corriger':
      return TEXTES_COMPTES.panneauCorrection(panneau.nom)
    case 'reactiver':
      return TEXTES_COMPTES.panneauReactivation(panneau.nom)
  }
}

/**
 * Panneaux de l'écran 13, dérivés de la colonne « Déclarer une session » de 14 : page entière
 * sous 600 px, panneau de 460 px au-delà (`PanneauSaisie`). Sous le titre, le formulaire : son
 * bouton dit ce qui se passe (« Créer et envoyer l'invitation », T66 t276 ; « Corriger et
 * envoyer l'invitation », T74). La réactivation d'un compte jamais activé passe par un panneau
 * qui corrige l'adresse au passage : réactivation d'abord, puis correction si l'adresse change ;
 * après une réactivation réussie, un nouvel essai ne refait que la correction.
 */
export function PanneauCompte({ panneau, actions, onCree, onFermer }: Props) {
  // Réactivation faite dans ce panneau : un refus de la correction se réessaie seul.
  const reactive = useRef(false)

  const contenu = (() => {
    switch (panneau.genre) {
      case 'ministere':
        return (
          <FormulaireNouveauMinistere
            onAnnuler={onFermer}
            envoyer={async ({ nom, description, email }) => {
              await actions.creer({ type: 'ministere', nom, description, email })
              onCree(REUSSITES_COMPTES.ministereCree(nom, email))
            }}
          />
        )
      case 'corriger':
        return (
          <FormulaireCorrectionAdresse
            mode="corriger"
            adresseActuelle={panneau.email}
            ministere={panneau.ministere}
            onAnnuler={onFermer}
            envoyer={async (email) => {
              await actions.corriger(panneau.userId, email)
              onCree(REUSSITES_COMPTES.adresseCorrigee(email))
            }}
          />
        )
      case 'reactiver':
        return (
          <FormulaireCorrectionAdresse
            mode="reactiver"
            adresseActuelle={panneau.email}
            ministere={panneau.ministere}
            onAnnuler={onFermer}
            envoyer={async (email, changee) => {
              if (!reactive.current) {
                await actions.reactiver(panneau.userId)
                reactive.current = true
              }
              if (changee) await actions.corriger(panneau.userId, email)
              onCree(
                changee
                  ? REUSSITES_COMPTES.reactiveEtInvite(panneau.libelle, email)
                  : REUSSITES_COMPTES.reactive(panneau.libelle),
              )
            }}
          />
        )
      default:
        return (
          <FormulaireAdresse
            libelle={
              panneau.genre === 'ministere_existant'
                ? TEXTES_COMPTES.champEmailMinistere
                : TEXTES_COMPTES.champEmailPersonnel
            }
            note={
              panneau.genre === 'ministere_existant'
                ? TEXTES_COMPTES.indicationEmailMinistere
                : undefined
            }
            nomAffiche={
              panneau.genre === 'conseil' || panneau.genre === 'admin_plateforme'
                ? panneau.nomAffiche
                : panneau.genre === 'berger'
                  ? 'Berger'
                  : undefined
            }
            onAnnuler={onFermer}
            envoyer={async ({ email }) => {
              if (panneau.genre === 'ministere_existant') {
                await actions.creer({
                  type: 'ministere_existant',
                  email,
                  ministereId: panneau.ministereId,
                  nom: panneau.nom,
                })
              } else {
                await actions.creer({ type: panneau.genre, email })
              }
              onCree(REUSSITES_COMPTES.compteCree(email))
            }}
          />
        )
    }
  })()

  return (
    <PanneauSaisie
      titre={titreDu(panneau)}
      surtitre={TEXTES_COMPTES.surtitrePanneau}
      onFermer={onFermer}
    >
      {contenu}
    </PanneauSaisie>
  )
}
