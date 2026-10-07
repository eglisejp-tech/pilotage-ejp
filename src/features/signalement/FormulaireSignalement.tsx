import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { ChampTexteLibre } from '@/features/signalement/ChampTexteLibre'
import { lireRefusSignalement } from '@/features/signalement/refus'
import type { RefusSignalement } from '@/features/signalement/refus'
import { longueurEnCaracteres, schemaSignalement } from '@/features/signalement/schemas'
import type { Signalement, ValeursSignalement } from '@/features/signalement/schemas'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import type { EcranSignalement } from '@/lib/base'

export interface ProprietesFormulaireSignalement {
  /** Écran d'origine, venu de l'adresse (`?ecran=`), « autre » sinon. */
  ecran: EcranSignalement
  envoyer: (signalement: Signalement) => Promise<void>
  /** « Annuler » : retour à la page d'origine, sans rien envoyer. */
  onAnnuler: () => void
}

/**
 * Formulaire « Signaler une difficulté » (T39 ; aides-contextuelles.md, section 7) : la ligne
 * « Écran concerné : ... », remplie par l'outil, puis le texte (10 à 280 caractères, compteur),
 * avec le rappel sur les données personnelles juste en dessous (premier champ libre). Un refus du
 * texte par la base se dit sous le champ ; la connexion perdue sous le bouton, texte gardé. Après
 * l'envoi : « Signalement envoyé. EJP Tech le lira. » pendant 6 secondes, champ vidé.
 */
export function FormulaireSignalement({
  ecran,
  envoyer,
  onAnnuler,
}: ProprietesFormulaireSignalement) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValeursSignalement, unknown, Signalement>({
    resolver: zodResolver(schemaSignalement),
    defaultValues: { ecran, texte: '' },
  })
  const texte = useWatch({ control, name: 'texte' })
  const [refus, setRefus] = useState<RefusSignalement | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  const soumettre = handleSubmit(async (signalement) => {
    setRefus(null)
    setReussite(null)
    try {
      await envoyer(signalement)
      reset({ ecran, texte: '' })
      setReussite(TEXTES_SIGNALEMENT.confirmation)
      setEnvoi((precedent) => precedent + 1)
    } catch (erreur) {
      const lu = lireRefusSignalement(erreur)
      if (lu.ou === 'champ') setError('texte', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu)
    }
  })

  // Après l'envoi (champ vidé), il n'y a plus rien à annuler : le bouton dit « Fermer ». Il
  // redevient « Annuler » dès qu'on écrit de nouveau.
  const envoye = envoi > 0 && texte === ''

  // Une erreur d'écran (adresse modifiée à la main) se dit sous le bouton : il n'y a pas de champ.
  const erreurEcran = errors.ecran?.message

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(evenement) => {
        if (isSubmitting) {
          evenement.preventDefault()
          return
        }
        void soumettre(evenement)
      }}
    >
      <p className="text-[15px] font-semibold text-encre-2">
        {TEXTES_SIGNALEMENT.ligneContexte(ecran)}
      </p>
      <ChampTexteLibre
        id="signalement-texte"
        libelle={TEXTES_SIGNALEMENT.libelleChamp}
        longueur={longueurEnCaracteres(texte)}
        avecRappel
        autoComplete="off"
        erreur={errors.texte?.message}
        {...register('texte')}
      />
      <BoutonEnregistrer
        libelle={TEXTES_SIGNALEMENT.boutonEnvoyer}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_SIGNALEMENT.boutonEnCours}
      />
      <button
        type="button"
        onClick={onAnnuler}
        className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
      >
        {envoye ? TEXTES_SIGNALEMENT.boutonFermer : TEXTES_SIGNALEMENT.boutonAnnuler}
      </button>
      {erreurEcran ? <ErreurFormulaire message={erreurEcran} /> : null}
      {refus?.ou === 'connexion' ? <ErreurFormulaire objet="message" /> : null}
      {refus?.ou === 'bouton' ? <ErreurFormulaire message={refus.message} /> : null}
      <MessageReussite message={reussite} envoi={envoi} />
    </form>
  )
}
