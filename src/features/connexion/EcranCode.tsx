import { BoutonLien } from '@/features/connexion/BoutonLien'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { FormulaireCode } from '@/features/connexion/FormulaireCode'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

export type ProprietesEcranCode = {
  /** Libellé du compte connecté (« Ministère Communication »), jamais le nom d'une personne. */
  libelleCompte: string
  /** Code à 6 chiffres saisi (étape 2 : mfa.challengeAndVerify sur le facteur vérifié). */
  onVerifyCode: (code: string) => void
  onSignOut: () => void
  enCours?: boolean
  /** Message du bandeau (messagesConnexion), remis à undefined à chaque nouvel envoi. */
  erreur?: string
}

/** Écran 18 : code de double authentification, à chaque connexion. */
export function EcranCode({
  libelleCompte,
  onVerifyCode,
  onSignOut,
  enCours,
  erreur,
}: ProprietesEcranCode) {
  useTitrePage('Code de vérification')

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre={libelleCompte} titre="Code de vérification" taille="moyenne">
        Ouvrez votre application d'authentification et saisissez le code à 6 chiffres de
        «&nbsp;Pilotage&nbsp;EJP&nbsp;».
      </TitreConnexion>

      <FormulaireCode
        id="code-connexion"
        taille="grande"
        entete={
          <label htmlFor="code-connexion" className="text-[15px] font-semibold">
            Code à 6 chiffres
          </label>
        }
        libelleBouton="Vérifier"
        libelleEnCours="Vérification en cours"
        onVerifyCode={onVerifyCode}
        enCours={enCours}
        erreur={erreur}
      />

      <p className="text-sm leading-[1.55] text-encre-3">
        Le code change toutes les 30 secondes. Téléphone perdu ou changé&nbsp;? Demandez à
        l'administration de l'église de refaire l'activation.
      </p>

      <BoutonLien onClick={onSignOut}>Se déconnecter</BoutonLien>
    </ColonneConnexion>
  )
}
