import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { MESSAGES_POINT } from '@/data/pointsEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChampTexteCourt } from '@/features/evenements/ChampTexteCourt'
import { ChoixMentionsPoint } from '@/features/nouveau-point/ChoixMentionsPoint'
import type { MinistreAMentionner } from '@/features/nouveau-point/ChoixMentionsPoint'
import { ChoixPriorite } from '@/features/nouveau-point/ChoixPriorite'
import { lireRefusPoint } from '@/features/nouveau-point/refus'
import type { RefusPoint } from '@/features/nouveau-point/refus'
import { schemaFormulairePoint } from '@/features/nouveau-point/schemas'
import type { NouveauPoint, ValeursFormulairePoint } from '@/features/nouveau-point/schemas'
import { TEXTES_POINT } from '@/features/nouveau-point/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { ChampTexteLibre } from '@/features/signalement/ChampTexteLibre'
import type { DateIso } from '@/lib/metier/dates'
import { longueurEnCaracteres } from '@/lib/metier/texte'

export interface ProprietesFormulaireNouveauPoint {
  /** Jour de Paris (`v_semaine.aujourdhui`) : la plus petite échéance permise. */
  aujourdhui: DateIso
  /** Ministère du compte : jamais dans ses propres mentions. */
  ministereId: string
  /** Ministères actifs qu'il peut mentionner (tous les autres), dans l'ordre alphabétique. */
  ministeres: readonly MinistreAMentionner[]
  /** Envoie le point ; une erreur levée est un refus de la base ou un échec de connexion. */
  envoyer: (point: NouveauPoint) => Promise<void>
}

const VIDE: ValeursFormulairePoint = {
  titre: '',
  description: '',
  priorite: 'normale',
  attendu: '',
  echeance: '',
  mentions: [],
}

/**
 * Formulaire « Nouveau point d'attention » (maquette 10, BRIEF section 9) : titre (80 caractères,
 * le seul obligatoire, avec le rappel sur les données personnelles juste dessous), « Ce qui se
 * passe » (280), priorité, « Ce qui est attendu » (80), échéance (aujourd'hui ou plus tard) et
 * mentions. Trois aides : priorité, attendu et échéance. Un refus de la base se dit sous le champ
 * qu'il désigne, sinon sous le bouton ; après un échec, les valeurs restent. Après une création, le
 * formulaire se vide et dit « Point créé. » pendant 6 secondes : un point est un ajout seulement,
 * un second clic ne peut donc pas en envoyer un doublon (le titre est vide).
 */
export function FormulaireNouveauPoint({
  aujourdhui,
  ministereId,
  ministeres,
  envoyer,
}: ProprietesFormulaireNouveauPoint) {
  const schema = useMemo(
    () => schemaFormulairePoint({ aujourdhui, ministereId }),
    [aujourdhui, ministereId],
  )
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValeursFormulairePoint, unknown, NouveauPoint>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  })
  const titre = useWatch({ control, name: 'titre' })
  const description = useWatch({ control, name: 'description' })
  const attendu = useWatch({ control, name: 'attendu' })
  const echeance = useWatch({ control, name: 'echeance' })
  const [refus, setRefus] = useState<Extract<RefusPoint, { ou: 'bouton' | 'connexion' }> | null>(
    null,
  )
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  const soumettre = handleSubmit(async (point) => {
    setRefus(null)
    setReussite(null)
    try {
      await envoyer(point)
      reset(VIDE)
      setReussite(MESSAGES_POINT.reussite.creation)
      setEnvoi((precedent) => precedent + 1)
    } catch (erreur) {
      const lu = lireRefusPoint(erreur)
      if (lu.ou === 'champ') setError(lu.champ, { message: lu.message }, { shouldFocus: true })
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
      <ChampTexteCourt
        id="point-titre"
        libelle={TEXTES_POINT.libelleTitre}
        longueur={longueurEnCaracteres(titre)}
        avecRappel
        autoComplete="off"
        erreur={errors.titre?.message}
        {...register('titre')}
      />
      <ChampTexteLibre
        id="point-description"
        libelle={TEXTES_POINT.libelleDescription}
        longueur={longueurEnCaracteres(description ?? '')}
        erreur={errors.description?.message}
        {...register('description')}
      />
      <Controller
        control={control}
        name="priorite"
        render={({ field, fieldState }) => (
          <ChoixPriorite
            id="point-priorite"
            valeur={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            refPremier={field.ref}
            erreur={fieldState.error?.message}
          />
        )}
      />
      <ChampTexteCourt
        id="point-attendu"
        libelle={TEXTES_POINT.libelleAttendu}
        longueur={longueurEnCaracteres(attendu ?? '')}
        aide="point.attendu"
        autoComplete="off"
        erreur={errors.attendu?.message}
        {...register('attendu')}
      />
      <ChampDate
        id="point-echeance"
        libelle={TEXTES_POINT.libelleEcheance}
        aide="point.echeance"
        min={aujourdhui}
        dateChoisie={echeance}
        erreur={errors.echeance?.message}
        {...register('echeance')}
      />
      <Controller
        control={control}
        name="mentions"
        render={({ field, fieldState }) => (
          <ChoixMentionsPoint
            id="point-mentions"
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
        libelle={TEXTES_POINT.bouton}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_POINT.boutonEnCours}
      />
      {refus?.ou === 'connexion' ? (
        <ErreurFormulaire message={TEXTES_POINT.erreurConnexion} />
      ) : null}
      {refus?.ou === 'bouton' ? <ErreurFormulaire message={refus.message} /> : null}
      <MessageReussite message={reussite} envoi={envoi} />
      <LienSignalement ecran="autre" />
    </form>
  )
}
