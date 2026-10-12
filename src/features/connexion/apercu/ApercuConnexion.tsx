import { useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { EcranAcceptation } from '@/features/acceptation/EcranAcceptation'
import { VERSION_CONDITIONS } from '@/lib/metier/conditions'
import { cleExemple, qrCodeExemple } from '@/features/connexion/apercu/exemples'
import {
  clesEcransSimules,
  ecransSimules,
  estCleEcranSimule,
  etatNormal,
} from '@/features/connexion/apercu/scenarios'
import type { CleEcranSimule, EtatSimule } from '@/features/connexion/apercu/scenarios'
import { EcranAcces } from '@/features/connexion/EcranAcces'
import { EcranActivation } from '@/features/connexion/EcranActivation'
import { EcranCode } from '@/features/connexion/EcranCode'
import { EcranCompteDesactive } from '@/features/connexion/EcranCompteDesactive'
import { EcranConnexion } from '@/features/connexion/EcranConnexion'
import { EcranMotDePasse } from '@/features/connexion/EcranMotDePasse'
import { EcranMotDePasseOublie } from '@/features/connexion/EcranMotDePasseOublie'

const ADRESSE = '/apercu/connexion'

type Simulation = {
  ecran: CleEcranSimule
  etat: EtatSimule
  compteMinistere: boolean
  lien: (ecran: CleEcranSimule) => string
  signaler: (action: string) => void
}

/** Chaque écran reçoit les propriétés que l'étape 2 lui donnera, sans aucun appel réseau. */
function ecranSimule({ ecran, etat, compteMinistere, lien, signaler }: Simulation): ReactNode {
  const libelleCompte = compteMinistere ? 'Ministère Communication' : 'Conseil, compte 3'
  const seDeconnecter = () => signaler('onSignOut, déconnexion.')
  const verifierCode = (code: string) => signaler(`onVerifyCode, code ${code}.`)

  switch (ecran) {
    case 'connexion':
      return (
        <EcranConnexion
          onGoogle={() => signaler('onGoogle, redirection vers Google.')}
          onSubmit={({ email }) => signaler(`onSubmit, connexion de ${email}.`)}
          enCours={etat.enCours ? (etat.google ? 'google' : 'mot-de-passe') : undefined}
          erreur={etat.erreur}
          lienMotDePasseOublie={lien('mot-de-passe-oublie')}
        />
      )
    case 'activation':
      return (
        <EcranActivation
          libelleCompte={libelleCompte}
          comptePartage={compteMinistere}
          qrCode={etat.chargement ? undefined : qrCodeExemple()}
          cle={etat.chargement ? undefined : cleExemple}
          onVerifyCode={verifierCode}
          onSignOut={seDeconnecter}
          enCours={etat.enCours}
          erreur={etat.erreur}
        />
      )
    case 'code':
      return (
        <EcranCode
          libelleCompte={libelleCompte}
          onVerifyCode={verifierCode}
          onSignOut={seDeconnecter}
          enCours={etat.enCours}
          erreur={etat.erreur}
        />
      )
    case 'acces-invitation':
    case 'acces-recuperation':
      return (
        <EcranAcces
          type={ecran === 'acces-invitation' ? 'invitation' : 'recuperation'}
          onContinue={() => signaler('onContinue, vérification du lien.')}
          enCours={etat.enCours}
          lienInvalide={etat.lienInvalide}
          erreur={etat.erreur}
          lienConnexion={lien('connexion')}
          lienMotDePasseOublie={lien('mot-de-passe-oublie')}
        />
      )
    case 'choisir-mot-de-passe':
    case 'nouveau-mot-de-passe':
      return (
        <EcranMotDePasse
          variante={ecran === 'choisir-mot-de-passe' ? 'invitation' : 'recuperation'}
          onSubmit={({ motDePasse }) =>
            signaler(`onSubmit, mot de passe de ${motDePasse.length} caractères.`)
          }
          enCours={etat.enCours}
          erreur={etat.erreur}
          libelleCompte={libelleCompte}
          email="communication@ejp.exemple"
        />
      )
    case 'mot-de-passe-oublie':
      return (
        <EcranMotDePasseOublie
          onSubmit={({ email }) => signaler(`onSubmit, lien demandé pour ${email}.`)}
          enCours={etat.enCours}
          erreur={etat.erreur}
          envoye={etat.envoye}
          lienConnexion={lien('connexion')}
        />
      )
    case 'compte-desactive':
      return <EcranCompteDesactive lienConnexion={lien('connexion')} />
    case 'acceptation':
      return (
        <EcranAcceptation
          libelleCompte={libelleCompte}
          version={VERSION_CONDITIONS}
          onAccept={() => signaler('onAccept, acceptation des conditions.')}
          onSignOut={seDeconnecter}
          enCours={etat.enCours}
          erreur={etat.erreur}
        />
      )
  }
}

/**
 * Aperçu de développement des écrans de connexion (/apercu/connexion, jamais en production).
 * L'écran, l'état simulé et le type de compte vivent dans l'adresse : ?ecran=code&etat=erreur-code.
 * « outils=non » retire la barre de réglages (captures à comparer aux maquettes).
 */
export function ApercuConnexion() {
  const [parametres, setParametres] = useSearchParams()
  const [derniereAction, setDerniereAction] = useState('aucune.')

  const valeurEcran = parametres.get('ecran')
  const ecran: CleEcranSimule = estCleEcranSimule(valeurEcran) ? valeurEcran : 'connexion'
  const definition = ecransSimules[ecran]
  const cleEtat = parametres.get('etat') ?? 'normal'
  const etat = definition.etats[cleEtat] ?? etatNormal
  const compteMinistere = parametres.get('compte') !== 'personnel'
  const outilsVisibles = parametres.get('outils') !== 'non'

  function changer(modifications: Record<string, string | null>) {
    const suivants = new URLSearchParams(parametres)
    for (const [cle, valeur] of Object.entries(modifications)) {
      if (valeur === null) suivants.delete(cle)
      else suivants.set(cle, valeur)
    }
    setParametres(suivants, { replace: true })
  }

  function lien(cible: CleEcranSimule) {
    const suivants = new URLSearchParams(parametres)
    suivants.set('ecran', cible)
    suivants.delete('etat')
    return `${ADRESSE}?${suivants.toString()}`
  }

  return (
    <>
      {outilsVisibles ? (
        <aside aria-label="Réglages de l'aperçu" className="border-b border-filet bg-papier">
          <div className="mx-auto flex max-w-contenu flex-wrap items-end gap-x-6 gap-y-3 px-5 py-3">
            <p className="w-full text-sm font-semibold">
              Aperçu des écrans de connexion (développement seulement, aucun appel au serveur)
            </p>
            <div className="flex max-w-full flex-col gap-1 text-sm">
              <label htmlFor="apercu-ecran">Écran</label>
              <select
                id="apercu-ecran"
                value={ecran}
                onChange={(evenement) => changer({ ecran: evenement.target.value, etat: null })}
                className="min-h-cible max-w-full border border-encre-3 bg-papier px-2 text-base"
              >
                {clesEcransSimules.map((cle) => (
                  <option key={cle} value={cle}>
                    {ecransSimules[cle].libelle}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex max-w-full flex-col gap-1 text-sm">
              <label htmlFor="apercu-etat">État simulé</label>
              <select
                id="apercu-etat"
                value={definition.etats[cleEtat] ? cleEtat : 'normal'}
                onChange={(evenement) => changer({ etat: evenement.target.value })}
                className="min-h-cible max-w-full border border-encre-3 bg-papier px-2 text-base"
              >
                {Object.entries(definition.etats).map(([cle, simule]) => (
                  <option key={cle} value={cle}>
                    {simule.libelle}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex min-h-cible items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={compteMinistere}
                onChange={(evenement) =>
                  changer({ compte: evenement.target.checked ? null : 'personnel' })
                }
                className="size-5 accent-encre"
              />
              Compte de ministère
            </label>
            <p role="status" className="w-full text-sm text-encre-2">
              Dernière action simulée : {derniereAction}
            </p>
          </div>
        </aside>
      ) : null}
      <div key={ecran}>
        {ecranSimule({ ecran, etat, compteMinistere, lien, signaler: setDerniereAction })}
      </div>
    </>
  )
}
