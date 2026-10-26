import { ApresChargement } from '@/components/etats/ApresChargement'
import { EtatVide } from '@/components/etats/EtatVide'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementSaisie } from '@/features/evenements/ChargementSaisie'
import { ConsultationEvenement } from '@/features/evenements/ConsultationEvenement'
import type { ProprietesConsultationEvenement } from '@/features/evenements/ConsultationEvenement'
import { FormulaireAjoutEvenement } from '@/features/evenements/FormulaireAjoutEvenement'
import type { ProprietesAjoutEvenement } from '@/features/evenements/FormulaireAjoutEvenement'
import { FormulaireMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import type { ProprietesMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import { MiseAJourAvecCorrections } from '@/features/evenements/MiseAJourAvecCorrections'
import type { CorrectionsEvenement } from '@/features/evenements/MiseAJourAvecCorrections'
import { seulPorteur, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { ligneRetireLe, TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import type { DateIso } from '@/lib/metier/dates'

/** Ce que fait le panneau : ajouter, mettre à jour (porteur) ou lire avant de retirer (EJP Tech). */
export type ModePanneauEvenement = 'ajout' | 'mise_a_jour' | 'consultation'

/** Ce que montre le panneau : un formulaire, ou l'un de ses états (T36). */
export type ContenuPanneauEvenement =
  | { etat: 'chargement'; mode: ModePanneauEvenement }
  /** Problème passager : une lecture a échoué, « Réessayer » la relance. */
  | { etat: 'probleme'; mode: ModePanneauEvenement; reessayer: () => void }
  /** Aucun résultat : l'événement n'existe pas ou n'est pas lisible par ce compte. */
  | { etat: 'introuvable'; mode?: ModePanneauEvenement }
  /** Pas pour ce profil : un ministère mentionné lit l'événement, seul le porteur le modifie. */
  | { etat: 'pas_porteur'; nomPorteur: string }
  /**
   * Événement retiré (T78) : par un ancien lien (« Cet événement a été retiré le 26 oct. »), ou
   * juste après le retrait (« Événement retiré du calendrier. », annoncé).
   */
  | { etat: 'retire'; le: DateIso | null; aLInstant: boolean; mode: ModePanneauEvenement }
  | ({ etat: 'ajout' } & ProprietesAjoutEvenement)
  | ({
      etat: 'mise_a_jour'
      evenementId: string
      /** Corrections du porteur (T78) : nom, mentions, retrait. Sans elles, la mise à jour seule. */
      corrections?: CorrectionsEvenement
    } & ProprietesMiseAJourEvenement)
  /** EJP Tech (T78) : l'événement en lecture seule, avec « Retirer l'événement ». */
  | ({ etat: 'consultation'; evenementId: string } & ProprietesConsultationEvenement)

interface Props {
  contenu: ContenuPanneauEvenement
  /** « Retour », Échap et le fond du panneau ramènent à la page d'origine. */
  onFermer: () => void
  /** Compte connecté (« Ministère Communication »), au-dessus du titre comme dans la maquette 11. */
  surtitre?: string
}

const VERS_MA_FICHE = { libelle: TEXTES_EVENEMENT.revenirFiche, vers: '/ma-fiche' }
/** EJP Tech n'a pas de fiche : il revient à la liste des ministères (Proposé, T78). */
const VERS_MINISTERES = { libelle: TEXTES_CORRECTIONS.revenirMinisteres, vers: '/ministeres' }

function modeDe(contenu: ContenuPanneauEvenement): ModePanneauEvenement {
  switch (contenu.etat) {
    case 'chargement':
    case 'probleme':
    case 'retire':
      return contenu.mode
    case 'introuvable':
      return contenu.mode ?? 'mise_a_jour'
    case 'ajout':
      return 'ajout'
    case 'consultation':
      return 'consultation'
    default:
      return 'mise_a_jour'
  }
}

const TITRES: Record<ModePanneauEvenement, string> = {
  ajout: TEXTES_EVENEMENT.titreAjout,
  mise_a_jour: TEXTES_EVENEMENT.titreMiseAJour,
  consultation: TEXTES_CORRECTIONS.titreConsultation,
}

/**
 * Panneau « Ajouter un événement » et « Mettre à jour l'événement » (maquette 11) : page entière
 * sous 600 px, panneau de 460 px au-delà. Ses états gardent le cadre et le titre du panneau :
 * chargement, problème passager avec « Réessayer », élément introuvable, ministère qui n'est pas
 * le porteur et événement retiré (T78), chacun avec « Revenir à ma fiche ». Le porteur corrige
 * aussi le nom et les mentions et retire l'événement (T78) ; EJP Tech le lit et peut le retirer,
 * avec « Revenir aux ministères ».
 */
export function PanneauEvenement({ contenu, onFermer, surtitre }: Props) {
  const mode = modeDe(contenu)
  const retour = mode === 'consultation' ? VERS_MINISTERES : VERS_MA_FICHE
  return (
    <PanneauSaisie titre={TITRES[mode]} surtitre={surtitre} onFermer={onFermer}>
      <ApresChargement
        enChargement={contenu.etat === 'chargement'}
        indicateur={<ChargementSaisie />}
      >
        {contenu.etat === 'probleme' ? (
          <EtatVide
            situation="probleme_passager"
            action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
          >
            {TEXTES_VIDES.page.erreur}
          </EtatVide>
        ) : null}
        {contenu.etat === 'introuvable' ? (
          <EtatVide situation="aucun_resultat" action={retour}>
            {TEXTES_EVENEMENT.introuvable}
          </EtatVide>
        ) : null}
        {contenu.etat === 'pas_porteur' ? (
          <EtatVide situation="pas_pour_ce_profil" action={VERS_MA_FICHE}>
            {seulPorteur(contenu.nomPorteur)}
          </EtatVide>
        ) : null}
        {contenu.etat === 'retire' ? (
          <div role={contenu.aLInstant ? 'status' : undefined}>
            <EtatVide situation="tout_est_fait" action={retour}>
              {contenu.aLInstant ? TEXTES_CORRECTIONS.reussiteRetrait : ligneRetireLe(contenu.le)}
            </EtatVide>
          </div>
        ) : null}
        {contenu.etat === 'ajout' ? <FormulaireAjoutEvenement {...contenu} /> : null}
        {contenu.etat === 'mise_a_jour' && contenu.corrections ? (
          <MiseAJourAvecCorrections
            key={contenu.evenementId}
            {...contenu}
            corrections={contenu.corrections}
          />
        ) : null}
        {contenu.etat === 'mise_a_jour' && !contenu.corrections ? (
          <FormulaireMiseAJourEvenement key={contenu.evenementId} {...contenu} />
        ) : null}
        {contenu.etat === 'consultation' ? (
          <ConsultationEvenement key={contenu.evenementId} {...contenu} />
        ) : null}
      </ApresChargement>
    </PanneauSaisie>
  )
}
