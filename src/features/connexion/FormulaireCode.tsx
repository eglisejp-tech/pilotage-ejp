import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ChampCode } from '@/features/connexion/ChampCode'
import { schemaCode } from '@/features/connexion/schemas'

type Proprietes = {
  /** Identifiant du champ : l'en-tête contient le <label htmlFor={id}>. */
  id: string
  entete: ReactNode
  taille: 'grande' | 'moyenne'
  libelleBouton: string
  libelleEnCours: string
  onVerifyCode: (code: string) => void
  enCours?: boolean
  /** Erreur du serveur (code faux, trop de tentatives) : le champ se vide et reprend le focus. */
  erreur?: string
}

/** Formulaire du code à 6 chiffres, commun à l'activation (17) et au code de connexion (18). */
export function FormulaireCode({
  id,
  entete,
  taille,
  libelleBouton,
  libelleEnCours,
  onVerifyCode,
  enCours = false,
  erreur,
}: Proprietes) {
  const { control, handleSubmit, resetField, setFocus } = useForm({
    resolver: zodResolver(schemaCode),
    defaultValues: { code: '' },
  })
  const idBandeau = `${id}-bandeau`

  // Un code refusé ne resservira pas : on vide le champ et on y remet le focus pour le suivant.
  useEffect(() => {
    if (!erreur) return
    resetField('code')
    setFocus('code')
  }, [erreur, resetField, setFocus])

  const envoyer = handleSubmit(({ code }) => {
    if (!enCours) onVerifyCode(code)
  })

  return (
    <form noValidate onSubmit={envoyer} className="flex flex-col gap-6">
      <div className={`flex flex-col ${taille === 'grande' ? 'gap-2' : 'gap-6'}`}>
        {entete}
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <ChampCode
              {...field}
              id={id}
              taille={taille}
              erreur={fieldState.error?.message}
              decritPar={erreur ? idBandeau : undefined}
            />
          )}
        />
      </div>
      {erreur ? <BandeauErreur id={idBandeau}>{erreur}</BandeauErreur> : null}
      <BoutonPrincipal enCours={enCours} libelleEnCours={libelleEnCours}>
        {libelleBouton}
      </BoutonPrincipal>
    </form>
  )
}
