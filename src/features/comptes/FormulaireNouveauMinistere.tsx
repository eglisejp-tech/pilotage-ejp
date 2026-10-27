import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { LONGUEUR_MAX_NOM_MINISTERE } from '../../../supabase/functions/_shared/schemas.ts'
import { Bouton } from '@/components/ui/Bouton'
import { referenceEchec } from '@/data/echecEnvoi'
import { ChampLigne } from '@/features/comptes/ChampLigne'
import { lireRefusCompte } from '@/features/comptes/refus'
import { longueurEnCaracteres, schemaNouveauMinistere } from '@/features/comptes/schemas'
import type { EntreeNouveauMinistere, NouveauMinistere } from '@/features/comptes/schemas'
import { TEXTES_COMPTES } from '@/features/comptes/textes'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { useFermetureSaisie } from '@/features/saisie/fermetureSaisie'
import { ChampTexteLibre } from '@/features/signalement/ChampTexteLibre'

interface Props {
  /** Crée le ministère et son compte ; rejette avec le refus de la fonction. */
  envoyer: (ministere: NouveauMinistere) => Promise<void>
  onAnnuler: () => void
}

/**
 * Panneau « Ajouter un ministère » (BRIEF, section 9) : « Nom du ministère » (unique, 50
 * caractères au plus), « Description » (facultative, 280, avec le rappel sur les données
 * personnelles), « Email partagé du ministère » (avec son aide), puis « Créer le ministère et
 * envoyer l'invitation ». Un nom déjà pris se dit sous le nom, une adresse déjà utilisée sous
 * l'adresse ; le reste sous le bouton, les valeurs restent.
 */
export function FormulaireNouveauMinistere({ envoyer, onAnnuler }: Props) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntreeNouveauMinistere, unknown, NouveauMinistere>({
    resolver: zodResolver(schemaNouveauMinistere),
    defaultValues: { nom: '', description: '', email: '' },
  })
  const [nom, description] = useWatch({ control, name: ['nom', 'description'] })
  const [refus, setRefus] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  // Dans le panneau : « Annuler » demande confirmation si un champ a changé (m265).
  const annuler = useFermetureSaisie(onAnnuler)

  const soumettre = handleSubmit(async (ministere) => {
    setRefus(null)
    try {
      await envoyer(ministere)
    } catch (erreur) {
      const lu = lireRefusCompte(erreur)
      if (lu.ou === 'formulaire') {
        setRefus(lu.message)
        setReference(referenceEchec(erreur))
      } else setError(lu.ou, { message: lu.message }, { shouldFocus: true })
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
        id="compte-nom-ministere"
        type="text"
        libelle={TEXTES_COMPTES.champNom}
        autoComplete="off"
        compteur={{
          longueur: longueurEnCaracteres(nom),
          max: LONGUEUR_MAX_NOM_MINISTERE,
          des: LONGUEUR_MAX_NOM_MINISTERE - 10,
        }}
        erreur={errors.nom?.message}
        {...register('nom')}
      />
      <ChampTexteLibre
        id="compte-description-ministere"
        libelle={TEXTES_COMPTES.champDescription}
        longueur={longueurEnCaracteres(description ?? '')}
        avecRappel
        autoComplete="off"
        erreur={errors.description?.message}
        {...register('description')}
      />
      <ChampLigne
        id="compte-email-ministere"
        type="email"
        inputMode="email"
        libelle={TEXTES_COMPTES.champEmailMinistere}
        note={TEXTES_COMPTES.indicationEmailMinistere}
        autoComplete="off"
        spellCheck={false}
        erreur={errors.email?.message}
        {...register('email')}
      />
      <BoutonEnregistrer
        libelle={TEXTES_COMPTES.boutonCreerMinistere}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_COMPTES.enCours.creer}
      />
      <Bouton pleineLargeur onClick={annuler}>
        {TEXTES_COMPTES.annuler}
      </Bouton>
      {refus !== null ? (
        <ErreurFormulaire message={refus} reference={reference} ecranEjpTech />
      ) : null}
    </form>
  )
}
