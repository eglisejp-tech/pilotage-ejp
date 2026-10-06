import { EtatVide } from '@/components/etats/EtatVide'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementSaisie } from '@/features/evenements/ChargementSaisie'
import { FormulaireAjoutEvenement } from '@/features/evenements/FormulaireAjoutEvenement'
import type { ProprietesAjoutEvenement } from '@/features/evenements/FormulaireAjoutEvenement'
import { FormulaireMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import type { ProprietesMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import { seulPorteur, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'

/** Ce que montre le panneau : un formulaire, ou l'un de ses états (T36). */
export type ContenuPanneauEvenement =
  | { etat: 'chargement'; mode: 'ajout' | 'mise_a_jour' }
  /** Problème passager : une lecture a échoué, « Réessayer » la relance. */
  | { etat: 'probleme'; mode: 'ajout' | 'mise_a_jour'; reessayer: () => void }
  /** Aucun résultat : l'événement n'existe pas ou n'est pas lisible par ce compte. */
  | { etat: 'introuvable' }
  /** Pas pour ce profil : un ministère mentionné lit l'événement, seul le porteur le met à jour. */
  | { etat: 'pas_porteur'; nomPorteur: string }
  | ({ etat: 'ajout' } & ProprietesAjoutEvenement)
  | ({ etat: 'mise_a_jour'; evenementId: string } & ProprietesMiseAJourEvenement)

interface Props {
  contenu: ContenuPanneauEvenement
  /** « Retour », Échap et le fond du panneau ramènent à la page d'origine. */
  onFermer: () => void
}

const VERS_MA_FICHE = { libelle: TEXTES_EVENEMENT.revenirFiche, vers: '/ma-fiche' }

function titreDe(contenu: ContenuPanneauEvenement): string {
  if (contenu.etat === 'ajout') return TEXTES_EVENEMENT.titreAjout
  if (contenu.etat === 'chargement' || contenu.etat === 'probleme') {
    return contenu.mode === 'ajout' ? TEXTES_EVENEMENT.titreAjout : TEXTES_EVENEMENT.titreMiseAJour
  }
  return TEXTES_EVENEMENT.titreMiseAJour
}

/**
 * Panneau « Ajouter un événement » et « Mettre à jour l'événement » (maquette 11) : page entière
 * sous 600 px, panneau de 460 px au-delà. Ses états gardent le cadre et le titre du panneau :
 * chargement, problème passager avec « Réessayer », élément introuvable et ministère qui n'est
 * pas le porteur, chacun avec « Revenir à ma fiche ».
 */
export function PanneauEvenement({ contenu, onFermer }: Props) {
  return (
    <PanneauSaisie titre={titreDe(contenu)} onFermer={onFermer}>
      {contenu.etat === 'chargement' ? <ChargementSaisie /> : null}
      {contenu.etat === 'probleme' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
        >
          {TEXTES_VIDES.page.erreur}
        </EtatVide>
      ) : null}
      {contenu.etat === 'introuvable' ? (
        <EtatVide situation="aucun_resultat" action={VERS_MA_FICHE}>
          {TEXTES_EVENEMENT.introuvable}
        </EtatVide>
      ) : null}
      {contenu.etat === 'pas_porteur' ? (
        <EtatVide situation="pas_pour_ce_profil" action={VERS_MA_FICHE}>
          {seulPorteur(contenu.nomPorteur)}
        </EtatVide>
      ) : null}
      {contenu.etat === 'ajout' ? <FormulaireAjoutEvenement {...contenu} /> : null}
      {contenu.etat === 'mise_a_jour' ? (
        <FormulaireMiseAJourEvenement key={contenu.evenementId} {...contenu} />
      ) : null}
    </PanneauSaisie>
  )
}
