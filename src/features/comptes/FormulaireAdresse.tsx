import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CodeAide } from '@/components/aide/textesAide'
import { ChampLigne } from '@/features/comptes/ChampLigne'
import { lireRefusCompte } from '@/features/comptes/refus'
import { schemaAdresse } from '@/features/comptes/schemas'
import type { Adresse, EntreeAdresse } from '@/features/comptes/schemas'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  /** « Email partagé du ministère » ou « Email personnel », avec son aide. */
  libelle: string
  aide: CodeAide
  /** Libellé imposé du futur compte (« Conseil, compte 5 »), affiché sous le champ. */
  nomAffiche?: string
  envoyer: (adresse: Adresse) => Promise<void>
  onAnnuler: () => void
}

/**
 * Panneau qui ne demande qu'une adresse (BRIEF, section 9) : le compte d'un ministère existant
 * sans compte, le berger, un membre du conseil, un compte EJP Tech. Le nom affiché n'est jamais
 * tapé : la base l'impose, l'écran l'annonce (« Nom affiché : Conseil, compte 5 »).
 */
export function FormulaireAdresse({ libelle, aide, nomAffiche, envoyer, onAnnuler }: Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntreeAdresse, unknown, Adresse>({
    resolver: zodResolver(schemaAdresse),
    defaultValues: { email: '' },
  })
  const [refus, setRefus] = useState<string | null>(null)

  const soumettre = handleSubmit(async (adresse) => {
    setRefus(null)
    try {
      await envoyer(adresse)
    } catch (erreur) {
      const lu = lireRefusCompte(erreur)
      if (lu.ou === 'email') setError('email', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu.message)
    }
  })

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
      <ChampLigne
        id="compte-email"
        type="email"
        inputMode="email"
        libelle={libelle}
        aide={aide}
        autoComplete="off"
        spellCheck={false}
        erreur={errors.email?.message}
        {...register('email')}
      />
      {nomAffiche ? (
        <p className="text-[15px] text-encre-2">{TEXTES_COMPTES.nomAffiche(nomAffiche)}</p>
      ) : null}
      <BoutonEnregistrer
        libelle={TEXTES_COMPTES.boutonCreerCompte}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_COMPTES.enCours}
      />
      <button
        type="button"
        onClick={onAnnuler}
        className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
      >
        {TEXTES_COMPTES.annuler}
      </button>
      {refus !== null ? <ErreurFormulaire message={refus} /> : null}
    </form>
  )
}
