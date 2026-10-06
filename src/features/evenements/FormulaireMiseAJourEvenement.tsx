import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Aide } from '@/components/aide/Aide'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChoixStatut } from '@/features/evenements/ChoixStatut'
import { lireRefus } from '@/features/evenements/refus'
import type { Refus } from '@/features/evenements/refus'
import { ResultatEnvoi } from '@/features/evenements/ResultatEnvoi'
import { schemaMiseAJourEvenement } from '@/features/evenements/schemas'
import type { MiseAJourEvenement, ValeursMiseAJourEvenement } from '@/features/evenements/schemas'
import { ligneMentions, ligneReport, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import type { StatutEvenement } from '@/lib/base'
import { estDateIso, joursEntre } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

/** État actuel de l'événement, tel que la base le donne (dernière ligne d'état). */
export interface EtatEvenement {
  date: DateIso
  statut: StatutEvenement
  /** En attente de validation, à 3 jours de sa date ou passé (`v_evenement.a_confirmer`). */
  aConfirmer: boolean
}

export interface ProprietesMiseAJourEvenement {
  aujourdhui: DateIso
  /** Nom de l'événement, en lecture seule : il ne change pas (règle 14). */
  titre: string
  /** Noms des ministères mentionnés à la création, qui ne changent plus (T32). */
  mentions: readonly string[]
  actuel: EtatEvenement
  envoyer: (miseAJour: MiseAJourEvenement) => Promise<void>
}

/** Fenêtre de l'alerte « à confirmer » (T31), la même que `v_evenement.a_confirmer`. */
const JOURS_AVANT_ALERTE = 3

/**
 * Formulaire « Mettre à jour l'événement » (dérivé de 11, BRIEF section 9) : nom et mentions en
 * lecture seule, date et statut préremplis. Pour un événement à confirmer, une ligne au-dessus du
 * statut (validation-metier.md, 4.4). Une nouvelle date passée est refusée sous le champ date,
 * avec le lien « Signaler une difficulté » ; la date actuelle, même passée, reste permise (T37).
 * Une ligne identique part à la base, qui la refuse : son message s'affiche sous le bouton, sans
 * lien. Deux aides : statut et report.
 */
export function FormulaireMiseAJourEvenement({
  aujourdhui,
  titre,
  mentions,
  actuel: actuelDepart,
  envoyer,
}: ProprietesMiseAJourEvenement) {
  // L'état enregistré : celui de la base au départ, puis celui du dernier envoi réussi.
  const [actuel, setActuel] = useState(actuelDepart)
  const schema = useMemo(
    () => schemaMiseAJourEvenement({ aujourdhui, dateActuelle: actuel.date }),
    [aujourdhui, actuel.date],
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValeursMiseAJourEvenement, unknown, MiseAJourEvenement>({
    resolver: zodResolver(schema),
    defaultValues: { date: actuel.date, statut: actuel.statut },
  })
  const date = useWatch({ control, name: 'date' })
  const [refus, setRefus] = useState<Refus | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  const report =
    estDateIso(date) && date !== actuel.date && date >= aujourdhui
      ? ligneReport(actuel.date, date)
      : null

  const soumettre = handleSubmit(async (miseAJour) => {
    setRefus(null)
    setReussite(null)
    try {
      await envoyer(miseAJour)
      setActuel({
        date: miseAJour.date,
        statut: miseAJour.statut,
        aConfirmer:
          miseAJour.statut === 'attente_validation' &&
          joursEntre(aujourdhui, miseAJour.date) <= JOURS_AVANT_ALERTE,
      })
      reset({ date: miseAJour.date, statut: miseAJour.statut })
      setReussite(TEXTES_EVENEMENT.reussiteMiseAJour)
      setEnvoi((precedent) => precedent + 1)
    } catch (erreur) {
      const lu = lireRefus(erreur)
      if (lu.ou === 'date') setError('date', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu)
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
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-semibold">{TEXTES_EVENEMENT.libelleNom}</p>
        <p className="text-base break-words">{titre}</p>
        <p className="text-sm leading-normal text-encre-3">
          {ligneMentions(mentions)} {TEXTES_EVENEMENT.mentionsFigees}
        </p>
      </div>
      <ChampDate
        id="evenement-date"
        libelle={TEXTES_EVENEMENT.libelleDate}
        min={aujourdhui}
        erreur={errors.date?.message}
        ecran="saisie_evenement"
        apres={
          report ? (
            <div className="flex min-h-cible flex-wrap items-center">
              <p className="text-[15px] text-encre-2">{report}</p>
              <Aide code="evenement.report" libelle={report} />
            </div>
          ) : null
        }
        {...register('date')}
      />
      <Controller
        control={control}
        name="statut"
        render={({ field, fieldState }) => (
          <ChoixStatut
            id="evenement-statut"
            valeur={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            refPremier={field.ref}
            erreur={fieldState.error?.message}
            ligneAuDessus={actuel.aConfirmer ? TEXTES_EVENEMENT.aConfirmer : undefined}
          />
        )}
      />
      <BoutonEnregistrer
        libelle={TEXTES_EVENEMENT.boutonMiseAJour}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_EVENEMENT.boutonEnCours}
      />
      <ResultatEnvoi refus={refus} reussite={reussite} envoi={envoi} />
      <LienSignalement ecran="saisie_evenement" />
    </form>
  )
}
