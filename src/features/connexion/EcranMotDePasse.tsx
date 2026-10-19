import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ChampTexte } from '@/features/connexion/ChampTexte'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { LONGUEUR_MIN_MOT_DE_PASSE, schemaNouveauMotDePasse } from '@/features/connexion/schemas'
import type { ValeursNouveauMotDePasse } from '@/features/connexion/schemas'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

// T66 (t020 à t024) : pas de phrase sous le titre (elle répétait le titre ou annonçait la suite),
// un même bouton dans les deux variantes.
const TEXTES = {
  invitation: {
    titre: 'Choisissez votre mot de passe',
    libelle: 'Mot de passe',
    bouton: 'Enregistrer le mot de passe',
  },
  recuperation: {
    titre: 'Nouveau mot de passe',
    libelle: 'Nouveau mot de passe',
    bouton: 'Enregistrer le mot de passe',
  },
} as const

export type ProprietesEcranMotDePasse = {
  /** Invitation acceptée (« Choisissez votre mot de passe ») ou lien « Mot de passe oublié ». */
  variante: keyof typeof TEXTES
  /** Mot de passe valide (étape 2 : updateUser({ password })). */
  onSubmit: (valeurs: ValeursNouveauMotDePasse) => void
  enCours?: boolean
  /** Message du bandeau (messagesConnexion), remis à undefined à chaque nouvel envoi. */
  erreur?: string
  /** Libellé du compte, s'il est connu (lisible en aal1). */
  libelleCompte?: string
  /** Adresse du compte : le gestionnaire de mots de passe enregistre le bon identifiant. */
  email?: string
}

/** Écrans non dessinés « Choisissez votre mot de passe » et « Nouveau mot de passe » (BRIEF 8). */
export function EcranMotDePasse({
  variante,
  onSubmit,
  enCours = false,
  erreur,
  libelleCompte,
  email,
}: ProprietesEcranMotDePasse) {
  const textes = TEXTES[variante]
  useTitrePage(textes.titre)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schemaNouveauMotDePasse),
    defaultValues: { motDePasse: '' },
  })
  const [visible, setVisible] = useState(false)
  const bandeau = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (erreur) bandeau.current?.focus()
  }, [erreur])

  const envoyer = handleSubmit((valeurs) => {
    if (!enCours) onSubmit(valeurs)
  })

  return (
    <ColonneConnexion>
      <TitreConnexion
        surtitre={libelleCompte ?? 'Église des Jeunes Prodiges'}
        titre={textes.titre}
        taille="moyenne"
      />

      <form noValidate onSubmit={envoyer} className="flex flex-col gap-6">
        {email ? (
          // Identifiant caché, lu par les gestionnaires de mots de passe (pas par les personnes).
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
        ) : null}
        <div className="flex flex-col gap-2">
          <ChampTexte
            id="nouveau-mot-de-passe"
            libelle={textes.libelle}
            aide={`${LONGUEUR_MIN_MOT_DE_PASSE} caractères au moins, par exemple une courte phrase.`}
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            autoCapitalize="none"
            spellCheck={false}
            erreur={errors.motDePasse?.message}
            {...register('motDePasse')}
          />
          <label className="flex min-h-cible items-center gap-3 self-start text-[15px]">
            <input
              type="checkbox"
              checked={visible}
              onChange={(evenement) => setVisible(evenement.target.checked)}
              className="size-5 accent-encre"
            />
            Afficher le mot de passe
          </label>
        </div>
        {erreur ? (
          <BandeauErreur id="nouveau-mot-de-passe-bandeau" ref={bandeau}>
            {erreur}
          </BandeauErreur>
        ) : null}
        <BoutonPrincipal enCours={enCours} libelleEnCours="Enregistrement en cours">
          {textes.bouton}
        </BoutonPrincipal>
      </form>
    </ColonneConnexion>
  )
}
