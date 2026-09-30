import { BarreCompte } from '@/features/connexion/BarreCompte'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { EtapeTitre } from '@/features/connexion/EtapeTitre'
import { FormulaireCode } from '@/features/connexion/FormulaireCode'
import { QrCodeActivation } from '@/features/connexion/QrCodeActivation'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

export type ProprietesEcranActivation = {
  /** Libellé du compte connecté (« Ministère Communication »), jamais le nom d'une personne. */
  libelleCompte: string
  /** Compte de ministère, partagé par plusieurs personnes : affiche l'encadré « Compte partagé ». */
  comptePartage: boolean
  /** Image du QR code (`totp.qr_code` de supabase.auth.mfa.enroll, adresse data:). Absente pendant
   * la préparation. Elle n'est affichée qu'une fois : l'étape 2 ne la conserve pas. */
  qrCode?: string
  /** Clé à saisir à la main (`totp.secret`) quand le QR code ne peut pas être scanné. */
  cle?: string
  /** Code à 6 chiffres saisi (étape 2 : mfa.challengeAndVerify). */
  onVerifyCode: (code: string) => void
  onSignOut: () => void
  enCours?: boolean
  /** Message du bandeau (messagesConnexion), remis à undefined à chaque nouvel envoi. */
  erreur?: string
}

/** « JBSWY3DPEHPK3PXP » devient « JBSW Y3DP EHPK 3PXP », plus facile à recopier. */
function grouperCle(cle: string): string {
  return cle.replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 ')
}

/** Écran 17 : activer la double authentification à la première connexion. */
export function EcranActivation({
  libelleCompte,
  comptePartage,
  qrCode,
  cle,
  onVerifyCode,
  onSignOut,
  enCours,
  erreur,
}: ProprietesEcranActivation) {
  useTitrePage('Activer la double authentification')

  return (
    <ColonneConnexion barre={<BarreCompte libelleCompte={libelleCompte} onSignOut={onSignOut} />}>
      <TitreConnexion
        surtitre="Première connexion"
        titre="Activer la double authentification"
        taille="petite"
      >
        Obligatoire pour tous les comptes. À chaque connexion, un code à 6 chiffres vous sera
        demandé en plus.
      </TitreConnexion>

      <ol role="list" className="flex flex-col gap-6">
        <li>
          <EtapeTitre numero={1}>
            Installez une application d'authentification sur votre téléphone, par exemple Google
            Authenticator ou Microsoft Authenticator.
          </EtapeTitre>
        </li>

        <li className="flex flex-col gap-6">
          <EtapeTitre numero={2}>Scannez ce code avec l'application.</EtapeTitre>
          <div className="flex flex-col gap-3">
            <QrCodeActivation qrCode={qrCode} />
            <p className="text-sm leading-normal text-encre-2">
              Vous pouvez aussi scanner ce code avec un deuxième téléphone, en secours.
            </p>
          </div>
          {cle ? (
            <p className="text-sm leading-normal text-encre-2">
              Impossible de scanner&nbsp;? Saisissez cette clé dans l'application&nbsp;:{' '}
              <strong className="font-bold tracking-[0.06em] text-encre tabular-nums">
                {grouperCle(cle)}
              </strong>
            </p>
          ) : null}
          {comptePartage ? (
            <p className="bg-nuit-pale px-4 py-3.5 text-[15px] leading-normal text-encre">
              <strong className="font-bold">Compte partagé.</strong> Chaque personne autorisée du
              ministère scanne ce même code maintenant, avec son propre téléphone. Il ne sera plus
              affiché.
            </p>
          ) : null}
        </li>

        <li>
          <FormulaireCode
            id="code-activation"
            taille="moyenne"
            entete={
              <EtapeTitre numero={3}>
                <label htmlFor="code-activation">
                  Saisissez le code affiché par l'application.
                </label>
              </EtapeTitre>
            }
            libelleBouton="Activer"
            libelleEnCours="Activation en cours"
            onVerifyCode={onVerifyCode}
            enCours={enCours}
            erreur={erreur}
          />
        </li>
      </ol>
    </ColonneConnexion>
  )
}
