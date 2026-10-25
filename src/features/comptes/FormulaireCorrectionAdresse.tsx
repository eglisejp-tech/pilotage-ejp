import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Bouton } from '@/components/ui/Bouton'
import { ChampLigne } from '@/features/comptes/ChampLigne'
import { lireRefusCompte } from '@/features/comptes/refus'
import { schemaCorrection } from '@/features/comptes/schemas'
import type { Adresse, EntreeAdresse } from '@/features/comptes/schemas'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { useFermetureSaisie } from '@/features/saisie/fermetureSaisie'

interface Props {
  /**
   * « corriger » : la nouvelle adresse d'un compte jamais activé, différente de l'actuelle.
   * « reactiver » : la réactivation d'un compte jamais activé, qui corrige l'adresse au passage
   * si elle change (T74).
   */
  mode: 'corriger' | 'reactiver'
  /** Adresse actuelle du compte : elle remplit le champ, pour corriger une faute de frappe. */
  adresseActuelle: string | null
  /** Compte de ministère : l'indication rappelle la boîte mail partagée. */
  ministere: boolean
  /** L'adresse saisie, et si elle change. Un refus (exception) s'affiche dans le panneau. */
  envoyer: (email: string, changee: boolean) => Promise<void>
  onAnnuler: () => void
}

/**
 * Panneau « Corriger l'adresse » et réactivation d'un compte jamais activé (T74) : un seul champ,
 * rempli avec l'adresse actuelle. Le bouton dit ce qui va se passer : « Corriger et envoyer
 * l'invitation », ou à la réactivation « Réactiver le ministère » tant que l'adresse ne change
 * pas, « Réactiver et envoyer l'invitation » dès qu'elle change. L'adresse déjà prise se dit sous
 * le champ, tout autre refus sous le bouton.
 */
export function FormulaireCorrectionAdresse({
  mode,
  adresseActuelle,
  ministere,
  envoyer,
  onAnnuler,
}: Props) {
  const correction = mode === 'corriger'
  const schema = useMemo(
    () => schemaCorrection(adresseActuelle, !correction),
    [adresseActuelle, correction],
  )
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EntreeAdresse, unknown, Adresse>({
    resolver: zodResolver(schema),
    defaultValues: { email: adresseActuelle ?? '' },
  })
  const [refus, setRefus] = useState<string | null>(null)
  // Dans le panneau : « Annuler » demande confirmation si l'adresse a changé (m265).
  const annuler = useFermetureSaisie(onAnnuler)
  const ancienne = adresseActuelle?.trim().toLowerCase() ?? ''
  const saisie = useWatch({ control, name: 'email' })
  const changee = (saisie ?? '').trim().toLowerCase() !== ancienne

  const soumettre = handleSubmit(async ({ email }) => {
    setRefus(null)
    try {
      await envoyer(email, email !== ancienne)
    } catch (erreur) {
      const lu = lireRefusCompte(erreur)
      if (lu.ou === 'email') setError('email', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu.message)
    }
  })

  const libelleBouton = correction
    ? TEXTES_COMPTES.boutonCorriger
    : changee
      ? TEXTES_COMPTES.boutonReactiverEtInviter
      : ministere
        ? TEXTES_COMPTES.boutonReactiverMinistere
        : TEXTES_COMPTES.boutonReactiverCompte

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
      {correction && adresseActuelle !== null ? (
        <p className="text-interface break-all text-encre-2">
          {TEXTES_COMPTES.adresseActuelle(adresseActuelle)}
        </p>
      ) : null}
      <ChampLigne
        id="compte-email"
        type="email"
        inputMode="email"
        libelle={
          correction ? TEXTES_COMPTES.champNouvelleAdresse : TEXTES_COMPTES.champAdresseReactivation
        }
        note={
          correction
            ? ministere
              ? TEXTES_COMPTES.indicationEmailMinistere
              : undefined
            : TEXTES_COMPTES.indicationReactivation
        }
        autoComplete="off"
        spellCheck={false}
        erreur={errors.email?.message}
        {...register('email')}
      />
      <BoutonEnregistrer
        libelle={libelleBouton}
        enCours={isSubmitting}
        libelleEnCours={
          correction ? TEXTES_COMPTES.enCours.corriger : TEXTES_COMPTES.enCours.reactiver
        }
      />
      <Bouton pleineLargeur onClick={annuler}>
        {TEXTES_COMPTES.annuler}
      </Bouton>
      {refus !== null ? <ErreurFormulaire message={refus} /> : null}
    </form>
  )
}
