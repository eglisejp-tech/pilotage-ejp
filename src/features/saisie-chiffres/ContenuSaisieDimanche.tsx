import { EtatVide } from '@/components/etats/EtatVide'
import { adresseSaisieDimanche } from '@/features/saisie-chiffres/choixPeriode'
import { FormulaireDimanche } from '@/features/saisie-chiffres/FormulaireDimanche'
import {
  actionSaisirDimanche,
  dimancheRefuse,
  TEXTES_CHIFFRES,
} from '@/features/saisie-chiffres/textes'
import type { EtatSaisieDimanche } from '@/features/saisie-chiffres/useSaisieDimanche'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'

/** Texte du problème passager (LISEZMOI, « Erreur de page »). */
const CONNEXION_ECHOUEE = 'La connexion a échoué. Réessayez.'

/**
 * Contenu du panneau de la saisie du dimanche dans chaque état (T36) : chargement, problème
 * passager (« Réessayer »), dimanche refusé (aucun résultat, retour au dimanche de référence), le
 * dimanche du jour avant midi sans indicateur du matin (en attente), puis le formulaire. Le lien
 * « Signaler une difficulté » reste en bas dans chaque état.
 */
export function ContenuSaisieDimanche({ etat }: { etat: EtatSaisieDimanche }) {
  if (etat.etat === 'pret' && !(etat.matin && etat.champs.propres.length === 0)) {
    return (
      <FormulaireDimanche
        key={etat.dimanche}
        dimanche={etat.dimanche}
        matin={etat.matin}
        champs={etat.champs}
        proposes={etat.proposes}
        enregistrer={etat.enregistrer}
      />
    )
  }
  // Les actions vers un autre dimanche remplacent l'entrée d'historique : « Retour » ferme la
  // saisie (BRIEF, section 9, Adresses).
  return (
    <>
      {etat.etat === 'chargement' ? <ChargementSaisie /> : null}
      {etat.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: etat.reessayer }}
        >
          {CONNEXION_ECHOUEE}
        </EtatVide>
      ) : null}
      {etat.etat === 'refuse' ? (
        <EtatVide
          situation="aucun_resultat"
          action={{
            libelle: actionSaisirDimanche(etat.dimancheReference),
            vers: adresseSaisieDimanche(etat.dimancheReference),
            remplace: true,
          }}
        >
          {dimancheRefuse(etat.dimancheReference)}
        </EtatVide>
      ) : null}
      {etat.etat === 'pret' ? (
        <EtatVide
          situation="en_attente_des_autres"
          action={{
            libelle: actionSaisirDimanche(etat.dimancheReference),
            vers: adresseSaisieDimanche(etat.dimancheReference),
            remplace: true,
          }}
        >
          {TEXTES_CHIFFRES.matinSansIndicateur}
        </EtatVide>
      ) : null}
      <LienSignalement ecran="saisie_dimanche" />
    </>
  )
}
