import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChampTexteCourt } from '@/features/evenements/ChampTexteCourt'
import { lireRefus } from '@/features/evenements/refus'
import type { Refus } from '@/features/evenements/refus'
import { ResultatEnvoi } from '@/features/evenements/ResultatEnvoi'
import { schemaReunion } from '@/features/evenements/schemas'
import type { Reunion, ValeursReunion } from '@/features/evenements/schemas'
import { TEXTES_REUNION } from '@/features/evenements/textes'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import type { DateIso } from '@/lib/metier/dates'

export interface ProprietesReunion {
  aujourdhui: DateIso
  /**
   * Réunion déjà déclarée et pas encore passée : « Modifier » ouvre le panneau prérempli. Null :
   * « Renseigner » l'ouvre vide.
   */
  prochaine: ValeursReunion | null
  envoyer: (reunion: Reunion) => Promise<void>
  /**
   * La base a refusé la date (le jour de Paris a changé depuis l'ouverture du panneau) : relit le
   * jour (`v_semaine`) pour que le contrôle du formulaire parte du bon plancher.
   */
  actualiserJour?: () => void
}

const VIDE: ValeursReunion = { date: '', heure: '', objet: '', decision: '' }

/**
 * Formulaire « Prochaine réunion » (dérivé de 11, BRIEF section 9) : date obligatoire, du jour ou
 * à venir ; heure, objet et décision attendue facultatifs (80 caractères, rappel sous l'objet,
 * premier champ libre). Chaque envoi ajoute une déclaration, la plus récente fait foi (règle 15) :
 * le formulaire garde les valeurs envoyées et son bouton reste inactif jusqu'à la prochaine
 * modification (pas de doublon). Un refus de droit de la base vient d'une date devenue passée
 * (minuit passé à Paris) : il se dit sous le champ date. Deux aides : date et décision attendue.
 */
export function FormulaireReunion({
  aujourdhui,
  prochaine,
  envoyer,
  actualiserJour,
}: ProprietesReunion) {
  const schema = useMemo(() => schemaReunion({ aujourdhui }), [aujourdhui])
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ValeursReunion, unknown, Reunion>({
    resolver: zodResolver(schema),
    defaultValues: prochaine ?? VIDE,
  })
  const date = useWatch({ control, name: 'date' })
  const objet = useWatch({ control, name: 'objet' })
  const decision = useWatch({ control, name: 'decision' })
  const [refus, setRefus] = useState<Refus | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const dejaEnvoye = reussite !== null && !isDirty

  const soumettre = handleSubmit(async (reunion) => {
    setRefus(null)
    setReussite(null)
    try {
      await envoyer(reunion)
      reset({
        date: reunion.date,
        heure: reunion.heure ?? '',
        objet: reunion.objet ?? '',
        decision: reunion.decision ?? '',
      })
      setReussite(TEXTES_REUNION.reussite)
      setEnvoi((precedent) => precedent + 1)
    } catch (erreur) {
      const lu = lireRefus(erreur, 'reunion')
      if (lu.ou === 'date') {
        setError('date', { message: lu.message }, { shouldFocus: true })
        actualiserJour?.()
      } else setRefus(lu)
    }
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(evenement) => {
        if (isSubmitting || dejaEnvoye) {
          evenement.preventDefault()
          return
        }
        void soumettre(evenement)
      }}
    >
      <ChampDate
        id="reunion-date"
        libelle={TEXTES_REUNION.libelleDate}
        aide="reunion.date"
        min={aujourdhui}
        dateChoisie={date}
        erreur={errors.date?.message}
        {...register('date')}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reunion-heure" className="text-[15px] font-semibold">
          {TEXTES_REUNION.libelleHeure}
        </label>
        <input
          id="reunion-heure"
          type="time"
          aria-invalid={errors.heure ? true : undefined}
          aria-describedby={errors.heure ? 'reunion-heure-erreur' : undefined}
          className="h-13 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre aria-invalid:border-2 aria-invalid:border-alerte"
          {...register('heure')}
        />
        {errors.heure ? (
          <p id="reunion-heure-erreur" className="text-[15px] leading-normal text-alerte">
            {errors.heure.message}
          </p>
        ) : null}
      </div>
      <ChampTexteCourt
        id="reunion-objet"
        libelle={TEXTES_REUNION.libelleObjet}
        longueur={objet.length}
        avecRappel
        autoComplete="off"
        erreur={errors.objet?.message}
        {...register('objet')}
      />
      <ChampTexteCourt
        id="reunion-decision"
        libelle={TEXTES_REUNION.libelleDecision}
        aide="reunion.decision"
        longueur={decision.length}
        autoComplete="off"
        erreur={errors.decision?.message}
        {...register('decision')}
      />
      <BoutonEnregistrer
        libelle={TEXTES_REUNION.bouton}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_REUNION.boutonEnCours}
        dejaEnvoye={dejaEnvoye}
      />
      <ResultatEnvoi refus={refus} reussite={reussite} envoi={envoi} />
      <LienSignalement ecran="saisie_reunion" />
    </form>
  )
}
