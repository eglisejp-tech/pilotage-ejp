import type { FormEvent, ReactNode } from 'react'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { EtapeVerifier } from '@/features/saisie-chiffres/EtapeVerifier'
import { TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import { BoutonEnregistrer } from '@/features/saisie-session/BoutonEnregistrer'
import type { EtatEnvoi } from '@/features/saisie-session/useEnvoiSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import type { EcranSignalement } from '@/lib/base'

interface Props {
  /** Libellé du bouton (« Enregistrer les chiffres », « Enregistrer la correction »). */
  bouton: string
  envoi: EtatEnvoi
  /** Le formulaire contient ce qui vient d'être enregistré. */
  dejaEnvoye: boolean
  /** La personne vient d'essayer d'envoyer ce qui est déjà enregistré : la phrase le dit. */
  doublon: boolean
  /** Erreur avant l'envoi qui ne tient à aucun champ (« Saisissez au moins un chiffre. »). */
  erreurFormulaire: string | null
  /** Le refus de la base s'affiche-t-il sous le bouton (et non sous un champ) ? */
  erreurSousLeBouton: boolean
  ecran: EcranSignalement
  onSubmit: () => void
  /** Les champs. */
  children: ReactNode
}

/**
 * Cadre commun de la saisie du dimanche et de « Chiffres du mois » (plan de l'étape 4, E3) : les
 * champs, la phrase de l'historique, l'étape « vérifier » prévue pour les chiffres inhabituels,
 * le bouton jaune (« Enregistrement en cours » pendant l'envoi), l'erreur de formulaire (les
 * valeurs restent), le message de réussite (6 s) et le lien « Signaler une difficulté » en bas,
 * sous les boutons (T39).
 */
export function FormulaireChiffres({
  bouton,
  envoi,
  dejaEnvoye,
  doublon,
  erreurFormulaire,
  erreurSousLeBouton,
  ecran,
  onSubmit,
  children,
}: Props) {
  const soumettre = (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (envoi.enCours) return
    onSubmit()
  }
  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={soumettre}>
      {children}
      <p className="text-note text-encre-3">{TEXTES_CHIFFRES.historique}</p>
      <EtapeVerifier />
      <BoutonEnregistrer
        libelle={bouton}
        enCours={envoi.enCours}
        dejaEnvoye={dejaEnvoye}
        doublon={doublon}
      />
      {erreurFormulaire !== null ? <ErreurFormulaire message={erreurFormulaire} /> : null}
      {envoi.echec && erreurSousLeBouton ? (
        <ErreurFormulaire message={envoi.echec.message ?? undefined} />
      ) : null}
      <MessageReussite
        message={envoi.reussite?.message ?? null}
        envoi={envoi.reussite?.envoi ?? 0}
      />
      <LienSignalement ecran={ecran} />
    </form>
  )
}
