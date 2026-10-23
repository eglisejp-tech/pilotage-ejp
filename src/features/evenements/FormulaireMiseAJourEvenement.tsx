import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChampHeure } from '@/features/evenements/ChampHeure'
import { ChoixStatut } from '@/features/evenements/ChoixStatut'
import { etatApresEnvoi, memeEtat } from '@/features/evenements/etatEvenement'
import type { EtatEnregistre } from '@/features/evenements/etatEvenement'
import { lireRefus } from '@/features/evenements/refus'
import type { Refus } from '@/features/evenements/refus'
import { ResultatEnvoi } from '@/features/evenements/ResultatEnvoi'
import {
  heureDebutPossible,
  schemaMiseAJourEvenement,
  valeurChampHeure,
} from '@/features/evenements/schemas'
import type { MiseAJourEvenement, ValeursMiseAJourEvenement } from '@/features/evenements/schemas'
import { ligneMentions, ligneReport, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'
import { estDateIso } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

/** État actuel de l'événement, tel que la base le donne (dernière ligne d'état). */
export interface EtatEvenement extends EtatEnregistre {
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

/** Valeurs du formulaire pour un état enregistré : les heures en « 19:05 », vides sans heure. */
function valeursDe(etat: EtatEnregistre): ValeursMiseAJourEvenement {
  return {
    date: etat.date,
    statut: etat.statut,
    heure_prevue: valeurChampHeure(etat.heurePrevue),
    heure_debut: valeurChampHeure(etat.heureDebut),
  }
}

/**
 * Formulaire « Mettre à jour l'événement » (dérivé de 11, BRIEF section 9) : nom et mentions en
 * lecture seule, date, heure prévue et statut préremplis. Pour un événement à confirmer, une
 * ligne au-dessus du statut (validation-metier.md, 4.4) ; la règle « à confirmer » vient de la
 * base (`v_evenement.a_confirmer`), jamais recalculée ici : après un envoi, la ligne se retire
 * jusqu'à la relecture de l'événement. « Heure de début (facultatif) » paraît sous le statut
 * Terminé quand la date est au plus aujourd'hui (T68), préremplie de l'heure enregistrée ; un
 * champ d'heure vidé garde l'heure enregistrée (indication sous le champ). Une nouvelle date
 * passée est refusée sous le champ date, avec le lien « Signaler une difficulté » ; la date
 * actuelle, même passée, reste permise (T37). Une ligne identique (date, statut et heures) ne part
 * pas : « Ce statut et cette date sont déjà enregistrés. » se dit sous le bouton, sans lien, avant
 * l'envoi (m134) ; la base, qui la refuse aussi, dit la même phrase par la table de traduction.
 * Après une réussite, le bouton reste inactif jusqu'à la prochaine modification, et un nouvel
 * appui dit la même phrase. Une aide : statut.
 */
export function FormulaireMiseAJourEvenement({
  aujourdhui,
  titre,
  mentions,
  actuel: actuelLu,
  envoyer,
}: ProprietesMiseAJourEvenement) {
  // Dernier envoi réussi : tant que la lecture n'a pas rattrapé, il fait foi pour la date, le
  // statut et les heures, et la ligne « à confirmer » (calculée par la base) n'est plus fiable.
  const [enregistre, setEnregistre] = useState<EtatEnregistre | null>(null)
  const relu = enregistre === null || memeEtat(enregistre, actuelLu)
  const actuel: EtatEvenement = {
    ...(enregistre ?? actuelLu),
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
    defaultValues: valeursDe(actuelLu),
  })
  const date = useWatch({ control, name: 'date' })
  const statut = useWatch({ control, name: 'statut' })
  const avecHeureDebut = heureDebutPossible({ statut, date, aujourdhui })
  // Quand le champ « Heure de début » paraît (« Terminé » choisi), une région polie, toujours
  // dans la page, le dit aux lecteurs d'écran ; le focus reste sur « Terminé ». Rien à
  // l'ouverture : le champ déjà là se lit dans l'ordre du formulaire.
  const [heureDebutAffichee, setHeureDebutAffichee] = useState(avecHeureDebut)
  const [annonce, setAnnonce] = useState('')
  if (avecHeureDebut !== heureDebutAffichee) {
    setHeureDebutAffichee(avecHeureDebut)
    setAnnonce(avecHeureDebut ? TEXTES_EVENEMENT.annonceHeureDebut : '')
  }
  const [refus, setRefus] = useState<Refus | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const dejaEnvoye = reussite !== null && !isDirty

  const report =
    estDateIso(date) && date !== actuel.date && date >= aujourdhui
      ? ligneReport(actuel.date, date)
      : null

  // Ce statut, cette date et ces heures sont déjà les derniers enregistrés : la base refuserait la
  // ligne identique. La phrase le dit avant l'envoi, sans aller-retour (m134).
  const dejaEnregistre: Refus = { ou: 'bouton', message: TEXTES_SIGNALEMENT.ligneIdentique }

  const soumettre = handleSubmit(async (miseAJour) => {
    setRefus(null)
    setReussite(null)
    const apres = etatApresEnvoi(actuel, miseAJour)
    if (memeEtat(apres, actuel)) {
      setRefus(dejaEnregistre)
      return
    }
    try {
      await envoyer(miseAJour)
      setEnregistre(apres)
      reset(valeursDe(apres))
      setReussite(TEXTES_EVENEMENT.reussiteMiseAJour)
      setEnvoi((precedent) => precedent + 1)
    } catch (erreur) {
      const lu = lireRefus(erreur, 'evenement')
      if (lu.ou === 'date' || lu.ou === 'heure_prevue') {
        setError(lu.ou, { message: lu.message }, { shouldFocus: true })
      } else if (lu.ou === 'heure_debut') {
        // Sous le champ s'il est affiché ; sinon (date à venir, statut changé), sous le bouton.
        if (avecHeureDebut) setError(lu.ou, { message: lu.message }, { shouldFocus: true })
        else setRefus({ ou: 'bouton', message: lu.message })
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
          // Un second appui après une réussite n'envoie rien, et le dit (m134).
          if (dejaEnvoye && !isSubmitting) {
            setReussite(null)
            setRefus(dejaEnregistre)
          }
          return
        }
        void soumettre(evenement)
      }}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[15px] font-semibold">{TEXTES_EVENEMENT.libelleNom}</p>
        <p className="text-base break-words">{titre}</p>
        {/* Rien à faire ici sur les mentions : la phrase sur les mentions figées part (t138). */}
        <p className="text-sm leading-normal text-encre-3">{ligneMentions(mentions)}</p>
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
            <p id={ID_REPORT} className="text-[15px] text-encre-2">
              {report}
            </p>
          ) : null
        }
        {...register('date')}
      />
      <ChampHeure
        id="evenement-heure-prevue"
        libelle={TEXTES_EVENEMENT.libelleHeurePrevue}
        erreur={errors.heure_prevue?.message}
        {...register('heure_prevue')}
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
      <p aria-live="polite" className="sr-only" data-annonce-heure-debut>
        {annonce}
      </p>
      {avecHeureDebut ? (
        <ChampHeure
          id="evenement-heure-debut"
          libelle={TEXTES_EVENEMENT.libelleHeureDebut}
          note={TEXTES_EVENEMENT.noteHeureDebut}
          erreur={errors.heure_debut?.message}
          {...register('heure_debut')}
        />
      ) : null}
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
