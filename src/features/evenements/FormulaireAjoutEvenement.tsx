import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChampHeure } from '@/features/evenements/ChampHeure'
import { ChampTexteCourt } from '@/features/evenements/ChampTexteCourt'
import { ChoixJoursSemaine } from '@/features/evenements/ChoixJoursSemaine'
import { ChoixMentions } from '@/features/evenements/ChoixMentions'
import type { MinistreAMentionner } from '@/features/evenements/ChoixMentions'
import { ChoixQuand } from '@/features/evenements/ChoixQuand'
import { ChoixStatut } from '@/features/evenements/ChoixStatut'
import { lireRefus } from '@/features/evenements/refus'
import type { Refus } from '@/features/evenements/refus'
import { ResultatEnvoi } from '@/features/evenements/ResultatEnvoi'
import { schemaAjoutEvenement } from '@/features/evenements/schemas'
import type {
  AjoutEvenement,
  AjoutSerie,
  SaisieAjout,
  ValeursAjoutEvenement,
} from '@/features/evenements/schemas'
import { TEXTES_EVENEMENT } from '@/features/evenements/textes'
import {
  apercuSerie,
  boutonSerie,
  reussiteSerie,
  TEXTES_PLAGES,
} from '@/features/evenements/textesPlages'
import type { Quand } from '@/features/evenements/textesPlages'
import { useNumeroEnvoi } from '@/features/saisie/useNumeroEnvoi'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { estDateIso, jourDeLaSemaine } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { DATES_MAX_SERIE, DATES_MIN_SERIE, datesDeSerie } from '@/lib/metier/plages'

export interface ProprietesAjoutEvenement {
  /** Jour de Paris (`v_semaine.aujourdhui`) : la plus petite date permise. */
  aujourdhui: DateIso
  /** Ministère du compte : jamais dans ses propres mentions. */
  ministereId: string
  /** Ministères actifs qu'il peut mentionner (tous les autres), dans l'ordre alphabétique. */
  ministeres: readonly MinistreAMentionner[]
  /**
   * Envoie l'événement (un jour ou plusieurs) avec son numéro anti-doublon (T76) ; une erreur
   * levée est un refus de la base ou un échec d'envoi.
   */
  envoyer: (evenement: AjoutEvenement, numero: string) => Promise<void>
  /** Envoie une série (T78, lot 2), avec son numéro anti-doublon. */
  envoyerSerie: (serie: AjoutSerie, numero: string) => Promise<void>
}

const VIDE: ValeursAjoutEvenement = {
  quand: 'un_jour',
  date: '',
  date_fin: '',
  jours: [],
  heure_prevue: '',
  heure_fin: '',
  titre: '',
  statut: '',
  mentions: [],
}

/** Libellés des deux champs de date selon « Quand ? » (conception 5.5). */
const LIBELLES_DATES: Record<Quand, { debut: string; fin: string | null }> = {
  un_jour: { debut: TEXTES_EVENEMENT.libelleDate, fin: null },
  plusieurs_jours: {
    debut: TEXTES_PLAGES.libellePremierJour,
    fin: TEXTES_PLAGES.libelleDernierJour,
  },
  repete: { debut: TEXTES_PLAGES.libellePremiereDate, fin: TEXTES_PLAGES.libelleDerniereDate },
}

/** Dates de la série en cours de saisie, si elles font une série permise ; sinon null. */
function datesValides(date: string, fin: string, jours: readonly string[]): DateIso[] | null {
  if (!estDateIso(date) || !estDateIso(fin) || jours.length === 0) return null
  const dates = datesDeSerie(date, fin, jours.map(Number))
  return dates.length >= DATES_MIN_SERIE && dates.length <= DATES_MAX_SERIE ? dates : null
}

/**
 * Formulaire « Ajouter un événement » (maquette 11 étendue, BRIEF section 9 ; T78 lot 2,
 * conception 5.5) : « Quand ? » d'abord (« Un jour » coché, « Plusieurs jours », « Se répète »),
 * puis les dates de la forme choisie (la première aujourd'hui ou plus tard ; pour une série, les
 * jours de la semaine, le jour de la première date coché d'avance), l'heure prévue et l'heure de
 * fin facultatives (T68, côte à côte dès 600 px), le nom (80 caractères, rappel sur les données
 * personnelles), le statut et les mentions, qui valent pour chaque date. Pour une série, l'aperçu
 * des dates est dit poliment au-dessus du bouton, qui donne leur nombre. Une date passée est
 * refusée avant l'envoi, puis par la base, sous le champ avec le lien « Signaler une difficulté ».
 * Après un ajout réussi, le formulaire se vide et le dit ; après un échec, les valeurs restent.
 */
export function FormulaireAjoutEvenement({
  aujourdhui,
  ministereId,
  ministeres,
  envoyer,
  envoyerSerie,
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
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValeursAjoutEvenement, unknown, SaisieAjout>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  })
  const titre = useWatch({ control, name: 'titre' })
  const date = useWatch({ control, name: 'date' })
  const dateFin = useWatch({ control, name: 'date_fin' }) ?? ''
  const quand = useWatch({ control, name: 'quand' }) ?? 'un_jour'
  const jours = useWatch({ control, name: 'jours' }) ?? []
  const [refus, setRefus] = useState<Refus | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  // Les jours de la semaine suivent la première date tant que la personne n'y a pas touché.
  const [joursChoisis, setJoursChoisis] = useState(false)
  const numero = useNumeroEnvoi()
  const libelles = LIBELLES_DATES[quand]
  const serie = quand === 'repete' ? datesValides(date, dateFin, jours) : null

  const choisirDate = (valeur: string) => {
    if (!joursChoisis && estDateIso(valeur)) {
      setValue('jours', [String(jourDeLaSemaine(valeur))])
    }
  }

  const soumettre = handleSubmit(async (saisie) => {
    setRefus(null)
    setReussite(null)
    try {
      const commun = {
        titre: saisie.titre,
        statut: saisie.statut,
        mentions: saisie.mentions,
        heure_prevue: saisie.heure_prevue,
        heure_fin: saisie.heure_fin,
      }
      if (saisie.forme === 'serie') {
        await envoyerSerie({ ...commun, dates: saisie.dates }, numero.tirer())
      } else {
        await envoyer({ ...commun, date: saisie.date, date_fin: saisie.date_fin }, numero.tirer())
      }
      numero.oublier()
      reset(VIDE)
      setJoursChoisis(false)
      setReussite(
        saisie.forme === 'serie'
          ? reussiteSerie(saisie.dates.length)
          : TEXTES_EVENEMENT.reussiteAjout,
      )
      setEnvoi((precedent) => precedent + 1)
    } catch (erreur) {
      numero.apresEchec(erreur)
      // Un ajout dont l'issue est inconnue est peut-être enregistré (m259, T76).
      const lu = lireRefus(erreur, 'ajout')
      if (
        lu.ou === 'date' ||
        lu.ou === 'heure_prevue' ||
        lu.ou === 'heure_fin' ||
        (lu.ou === 'date_fin' && quand !== 'un_jour')
      ) {
        setError(lu.ou, { message: lu.message }, { shouldFocus: true })
      } else if (lu.ou === 'heure_debut' || lu.ou === 'date_fin') {
        // Jamais d'heure de début à l'ajout, ni de dernier jour pour un seul jour : sous le bouton.
        setRefus({ ou: 'bouton', message: lu.message, reference: null })
      } else setRefus(lu)
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
      <Controller
        control={control}
        name="quand"
        render={({ field }) => (
          <ChoixQuand
            id="evenement-quand"
            valeur={field.value ?? 'un_jour'}
            onChange={(choix) => {
              field.onChange(choix)
              if (choix === 'repete' && !joursChoisis) choisirDate(date)
            }}
          />
        )}
      />
      <ChampDate
        id="evenement-date"
        libelle={libelles.debut}
        min={aujourdhui}
        dateChoisie={date}
        erreur={errors.date?.message}
        ecran="saisie_evenement"
        {...register('date', { onChange: (evenement) => choisirDate(evenement.target.value) })}
      />
      {libelles.fin !== null ? (
        <ChampDate
          id="evenement-date-fin"
          libelle={libelles.fin}
          min={estDateIso(date) ? date : aujourdhui}
          dateChoisie={dateFin}
          erreur={errors.date_fin?.message}
          {...register('date_fin')}
        />
      ) : null}
      {quand === 'repete' ? (
        <Controller
          control={control}
          name="jours"
          render={({ field, fieldState }) => (
            <ChoixJoursSemaine
              id="evenement-jours"
              valeur={field.value ?? []}
              onChange={(choix) => {
                setJoursChoisis(true)
                field.onChange(choix)
              }}
              onBlur={field.onBlur}
              refPremier={field.ref}
              erreur={fieldState.error?.message}
            />
          )}
        />
      ) : null}
      <div className="grid gap-5 tablette:grid-cols-2">
        <ChampHeure
          id="evenement-heure-prevue"
          libelle={TEXTES_EVENEMENT.libelleHeurePrevue}
          note={TEXTES_EVENEMENT.noteHeurePrevue}
          erreur={errors.heure_prevue?.message}
          {...register('heure_prevue')}
        />
        <ChampHeure
          id="evenement-heure-fin"
          libelle={TEXTES_PLAGES.libelleHeureFin}
          erreur={errors.heure_fin?.message}
          {...register('heure_fin')}
        />
      </div>
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
      {/* Aperçu de la série, dit poliment ; la région existe dès « Se répète ». */}
      {quand === 'repete' ? (
        <p aria-live="polite" className="text-interface leading-normal text-encre-2">
          {serie ? apercuSerie(serie) : ''}
        </p>
      ) : null}
      <BoutonEnregistrer
        libelle={serie ? boutonSerie(serie.length) : TEXTES_EVENEMENT.boutonAjout}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_EVENEMENT.boutonEnCours}
      />
      <ResultatEnvoi refus={refus} reussite={reussite} envoi={envoi} />
      <LienSignalement ecran="saisie_evenement" />
    </form>
  )
}
