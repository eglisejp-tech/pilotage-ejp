import { Arrivee } from '@/components/etats/Arrivee'
import { EtatVide } from '@/components/etats/EtatVide'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'
import { TEXTES_VIDES_INDICATEURS } from '@/features/indicateurs/textesVides'
import { adresseSaisieMois } from '@/features/saisie-chiffres/choixPeriode'
import { FormulaireMois } from '@/features/saisie-chiffres/FormulaireMois'
import { actionSaisirMois } from '@/features/saisie-chiffres/textes'
import type { EtatSaisieMois } from '@/features/saisie-chiffres/useSaisieMois'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'

/** Texte du problème passager (LISEZMOI, « Erreur de page »). */
const CONNEXION_ECHOUEE = 'La connexion a échoué. Réessayez.'

/**
 * Contenu du panneau de « Chiffres du mois » dans chaque état (T36) : chargement, problème
 * passager (« Réessayer »), aucun indicateur du mois (premier usage, « Revenir à ma fiche »), mois
 * refusé (aucun résultat, retour au mois proposé), puis le formulaire. Le lien « Signaler une
 * difficulté » reste en bas dans chaque état.
 */
export function ContenuSaisieMois({ etat }: { etat: EtatSaisieMois }) {
  // T65 : la flamme reste au moins 600 ms une fois montrée, puis la suite arrive en fondu.
  const { attente, fondu } = useAttenteChargement(etat.etat === 'chargement')
  if (!attente && etat.etat === 'pret') {
    return (
      <Arrivee fondu={fondu}>
        <FormulaireMois
          key={etat.mois}
          mois={etat.mois}
          champs={etat.champs}
          proposes={etat.proposes}
          rattrapage={etat.rattrapage}
          enregistrer={etat.enregistrer}
        />
      </Arrivee>
    )
  }
  return (
    <>
      {attente ? <ChargementSaisie /> : null}
      {attente ? null : (
        <Arrivee fondu={fondu}>
          {etat.etat === 'erreur' ? (
            <EtatVide
              situation="probleme_passager"
              action={{ libelle: 'Réessayer', surClic: etat.reessayer }}
            >
              {CONNEXION_ECHOUEE}
            </EtatVide>
          ) : null}
          {etat.etat === 'sans_indicateur' ? (
            <EtatVide
              situation="premier_usage"
              action={{
                libelle: TEXTES_VIDES_INDICATEURS.actionRevenirAMaFiche,
                vers: '/ma-fiche',
              }}
            >
              {TEXTES_VIDES_INDICATEURS.moisSansIndicateur}
            </EtatVide>
          ) : null}
          {etat.etat === 'refuse' ? (
            <EtatVide
              situation="aucun_resultat"
              action={{
                libelle: actionSaisirMois(etat.moisPropose),
                vers: adresseSaisieMois(etat.moisPropose),
                remplace: true,
              }}
            >
              {etat.message}
            </EtatVide>
          ) : null}
        </Arrivee>
      )}
      <LienSignalement ecran="saisie_mois" />
    </>
  )
}
