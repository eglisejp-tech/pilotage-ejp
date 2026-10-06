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
import { estDateIso } from '@/lib/metier/dates'
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
  /** Dernier état lu dans la base : relu après chaque envoi réussi. */
  actuel: EtatEvenement
  envoyer: (miseAJour: MiseAJourEvenement) => Promise<void>
}

const ID_REPORT = 'evenement-date-report'

/**
 * Formulaire « Mettre à jour l'événement » (dérivé de 11, BRIEF section 9) : nom et mentions en
 * lecture seule, date et statut préremplis. Pour un événement à confirmer, une ligne au-dessus du
 * statut (validation-metier.md, 4.4) ; la règle « à confirmer » vient de la base
 * (`v_evenement.a_confirmer`), jamais recalculée ici : après un envoi, la ligne se retire jusqu'à
 * la relecture de l'événement. Une nouvelle date passée est refusée sous le champ date, avec le
 * lien « Signaler une difficulté » ; la date actuelle, même passée, reste permise (T37). Une
 * ligne identique part à la base, qui la refuse : son message s'affiche sous le bouton, sans
 * lien. Après une réussite, le bouton reste inactif jusqu'à la prochaine modification. Deux
 * aides : statut et report.
 */
export function FormulaireMiseAJourEvenement({
  aujourdhui,
  titre,
  mentions,
  actuel: actuelLu,
  envoyer,
}: ProprietesMiseAJourEvenement) {
  // Dernier envoi réussi : tant que la lecture n'a pas rattrapé, il fait foi pour la date et le
  // statut, et la ligne « à confirmer » (calculée par la base) n'est plus fiable.
  const [enregistre, setEnregistre] = useState<Pick<EtatEvenement, 'date' | 'statut'> | null>(null)
  const relu =
    enregistre === null ||
    (enregistre.date === actuelLu.date && enregistre.statut === actuelLu.statut)
  const actuel: EtatEvenement = {
    date: enregistre?.date ?? actuelLu.date,
    statut: enregistre?.statut ?? actuelLu.statut,
    aConfirmer: relu && actuelLu.aConfirmer,
  }
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ValeursMiseAJourEvenement, unknown, MiseAJourEvenement>({
    resolver: zodResolver(schema),
    defaultValues: { date: actuelLu.date, statut: actuelLu.statut },
  })
  const date = useWatch({ control, name: 'date' })
  const [refus, setRefus] = useState<Refus | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const dejaEnvoye = reussite !== null && !isDirty

  const report =
    estDateIso(date) && date !== actuel.date && date >= aujourdhui
      ? ligneReport(actuel.date, date)
      : null

  const soumettre = handleSubmit(async (miseAJour) => {
    setRefus(null)
    setReussite(null)
    try {
      await envoyer(miseAJour)
      setEnregistre({ date: miseAJour.date, statut: miseAJour.statut })
      reset({ date: miseAJour.date, statut: miseAJour.statut })
      setReussite(TEXTES_EVENEMENT.reussiteMiseAJour)
      setEnvoi((precedent) => precedent + 1)
    } catch (erreur) {
      const lu = lireRefus(erreur, 'evenement')
      if (lu.ou === 'date') setError('date', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu)
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
        // La date actuelle reste choisissable même passée (T37) : le plancher ne la rend pas
        // invalide dès l'ouverture.
        min={actuel.date < aujourdhui ? actuel.date : aujourdhui}
        dateChoisie={date}
        erreur={errors.date?.message}
        ecran="saisie_evenement"
        idsDecrits={report ? [ID_REPORT] : []}
        apres={
          report ? (
            <div className="flex min-h-cible flex-wrap items-center">
              <p id={ID_REPORT} className="text-[15px] text-encre-2">
                {report}
              </p>
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
        dejaEnvoye={dejaEnvoye}
      />
      <ResultatEnvoi refus={refus} reussite={reussite} envoi={envoi} />
      <LienSignalement ecran="saisie_evenement" />
    </form>
  )
}
