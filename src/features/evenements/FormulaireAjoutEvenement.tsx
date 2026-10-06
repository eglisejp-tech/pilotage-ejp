import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChampTexteCourt } from '@/features/evenements/ChampTexteCourt'
import { ChoixMentions } from '@/features/evenements/ChoixMentions'
import type { MinistreAMentionner } from '@/features/evenements/ChoixMentions'
import { ChoixStatut } from '@/features/evenements/ChoixStatut'
import { lireRefus } from '@/features/evenements/refus'
import type { Refus } from '@/features/evenements/refus'
import { ResultatEnvoi } from '@/features/evenements/ResultatEnvoi'
import { schemaAjoutEvenement } from '@/features/evenements/schemas'
import type { AjoutEvenement, ValeursAjoutEvenement } from '@/features/evenements/schemas'
import { TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import type { DateIso } from '@/lib/metier/dates'

export interface ProprietesAjoutEvenement {
  /** Jour de Paris (`v_semaine.aujourdhui`) : la plus petite date permise. */
  aujourdhui: DateIso
  /** Ministère du compte : jamais dans ses propres mentions. */
  ministereId: string
  /** Ministères actifs qu'il peut mentionner (tous les autres), dans l'ordre alphabétique. */
  ministeres: readonly MinistreAMentionner[]
  /** Envoie l'événement ; une erreur levée est un refus de la base ou un échec de connexion. */
  envoyer: (evenement: AjoutEvenement) => Promise<void>
}

const VIDE: ValeursAjoutEvenement = { date: '', titre: '', statut: '', mentions: [] }

/**
 * Formulaire « Ajouter un événement » (maquette 11, BRIEF section 9) : date (aujourd'hui ou plus
 * tard), nom (80 caractères, rappel sur les données personnelles), statut, mentions facultatives.
 * Pas d'heure ni de lieu. Trois aides : date, statut et mentions. Une date passée est refusée avant
 * l'envoi, puis par la base, sous le champ date avec le lien « Signaler une difficulté ». Après
 * un ajout réussi, le formulaire se vide pour un autre événement et dit « Événement ajouté au
 * calendrier. » ; après un échec, les valeurs restent.
 */
export function FormulaireAjoutEvenement({
  aujourdhui,
  ministereId,
  ministeres,
  envoyer,
}: ProprietesAjoutEvenement) {
  const schema = useMemo(
    () => schemaAjoutEvenement({ aujourdhui, ministereId }),
    [aujourdhui, ministereId],
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValeursAjoutEvenement, unknown, AjoutEvenement>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  })
  const titre = useWatch({ control, name: 'titre' })
  const [refus, setRefus] = useState<Refus | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  const soumettre = handleSubmit(async (evenement) => {
    setRefus(null)
    setReussite(null)
    try {
      await envoyer(evenement)
      reset(VIDE)
      setReussite(TEXTES_EVENEMENT.reussiteAjout)
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
      <ChampDate
        id="evenement-date"
        libelle={TEXTES_EVENEMENT.libelleDate}
        aide="evenement.date"
        min={aujourdhui}
        erreur={errors.date?.message}
        ecran="saisie_evenement"
        {...register('date')}
      />
      <ChampTexteCourt
        id="evenement-nom"
        libelle={TEXTES_EVENEMENT.libelleNom}
        longueur={titre.length}
        avecRappel
        autoComplete="off"
        erreur={errors.titre?.message}
        {...register('titre')}
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
          />
        )}
      />
      <Controller
        control={control}
        name="mentions"
        render={({ field, fieldState }) => (
          <ChoixMentions
            id="evenement-mentions"
            ministeres={ministeres}
            valeur={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            refPremier={field.ref}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <BoutonEnregistrer
        libelle={TEXTES_EVENEMENT.boutonAjout}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_EVENEMENT.boutonEnCours}
      />
      <ResultatEnvoi refus={refus} reussite={reussite} envoi={envoi} />
      <LienSignalement ecran="saisie_evenement" />
    </form>
  )
}
