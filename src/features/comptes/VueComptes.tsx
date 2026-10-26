import { useEffect, useRef } from 'react'
import { ApresChargement } from '@/components/etats/ApresChargement'
import { ChargementPage } from '@/components/etats/ChargementPage'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { GabaritPage } from '@/components/ui/GabaritPage'
import { BoutonAjout } from '@/features/comptes/BoutonAjout'
import { FenetreConfirmation } from '@/features/comptes/FenetreConfirmation'
import { FenetreRefusSuppression } from '@/features/comptes/FenetreRefusSuppression'
import { ListesEglise } from '@/features/comptes/ListesEglise'
import { PanneauCompte } from '@/features/comptes/PanneauCompte'
import { SectionComptes } from '@/features/comptes/SectionComptes'
import { complementMinisteres, TEXTES_COMPTES, VIDES_COMPTES } from '@/features/comptes/textes'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import { useEcranComptes } from '@/features/comptes/useEcranComptes'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  titre: string
  donnees: EtatBloc<DonneesComptes>
  actions: ActionsComptes
  /**
   * Administration de l'église (décision T60) : l'écran se lit, sans aucun bouton d'action ; la
   * phrase sous le titre dit qu'EJP Tech gère les ministères et les comptes.
   */
  lectureSeule?: boolean
  /** Compte connecté (EJP Tech) : sa ligne n'a aucun bouton, la base refuserait. */
  moi?: string | null
}

/** Le focus n'est plus nulle part : son élément a disparu (bouton remplacé, panneau fermé). */
function focusPerdu(): boolean {
  const actif = document.activeElement
  return actif === null || actif === document.body || !actif.isConnected
}

/**
 * Écran 13, « Ministères et comptes » (EJP Tech, qui gère, et l'administration de l'église, qui
 * lit : décision T60 ; maquette 13, BRIEF section 9) : titre, phrase et « Ajouter un ministère »,
 * puis les sections Ministères, Berger et conseil, EJP Tech et Listes. Les panneaux d'ajout
 * s'ouvrent en page entière sous 600 px, en panneau de 460 px au-delà ; désactiver, refaire
 * l'activation et supprimer passent par une fenêtre de confirmation, et un ministère qui ne se
 * supprime pas ouvre la fenêtre « impossible », avec ses raisons (T75). La réussite d'une création s'affiche en
 * haut de la page ; le résultat d'une action de ligne, sous les boutons de sa ligne. Quand le
 * bouton qui avait le focus disparaît, le focus va au premier bouton de la même ligne, ou au titre
 * après une création. En lecture seule, ni bouton d'ajout ni bouton de ligne.
 */
export function VueComptes({
  titre,
  donnees: lecture,
  actions,
  lectureSeule = false,
  moi = null,
}: Props) {
  // T65 : le bouton d'ajout et la liste arrivent ensemble, après la tenue de la flamme.
  const donnees = useLectureAffichee(lecture).lecture
  const ecran = useEcranComptes(actions)
  const onAction = lectureSeule ? null : ecran.surAction
  const enPanneau = useLargeurMin(LARGEUR_PANNEAU)
  const titreRef = useRef<HTMLHeadingElement>(null)
  const contenuRef = useRef<HTMLDivElement>(null)

  // Sous 600 px, le panneau prend la page entière, à côté de la région des messages, qui reste
  // montée : le message de réussite d'une création y est annoncé au retour sur la page.
  const pleinePage = ecran.panneau !== null && !enPanneau

  const pleinePagePrecedente = useRef(pleinePage)
  useEffect(() => {
    const etaitPleinePage = pleinePagePrecedente.current
    pleinePagePrecedente.current = pleinePage
    if (etaitPleinePage && !pleinePage && focusPerdu()) titreRef.current?.focus()
  }, [pleinePage])

  useEffect(() => {
    if (ecran.envoi > 0 && focusPerdu()) titreRef.current?.focus()
  }, [ecran.envoi])

  const resultat = ecran.resultat
  useEffect(() => {
    if (resultat === null || !focusPerdu()) return
    const ligne = Array.from(
      contenuRef.current?.querySelectorAll<HTMLElement>('[data-cle]') ?? [],
    ).find((element) => element.dataset.cle === resultat.cle)
    ligne?.querySelector<HTMLElement>('button')?.focus()
  }, [resultat])

  const panneau = ecran.panneau ? (
    <PanneauCompte
      // Un autre panneau repart de zéro (réactivation déjà faite comprise, T74).
      key={
        'userId' in ecran.panneau
          ? `${ecran.panneau.genre}-${ecran.panneau.userId}`
          : ecran.panneau.genre
      }
      panneau={ecran.panneau}
      actions={actions}
      onCree={ecran.apresCreation}
      onFermer={ecran.fermerPanneau}
    />
  ) : null

  return (
    <div ref={contenuRef}>
      <GabaritPage>
        {pleinePage ? null : (
          <EnTetePage
            titre={titre}
            titreRef={titreRef}
            phrase={lectureSeule ? TEXTES_COMPTES.introductionLecture : TEXTES_COMPTES.introduction}
            action={
              donnees.etat === 'donnees' && !lectureSeule ? (
                <BoutonAjout
                  principal
                  libelle={TEXTES_COMPTES.ajouterMinistere}
                  onClick={() => ecran.ouvrirPanneau({ genre: 'ministere' })}
                />
              ) : null
            }
          />
        )}

        <div className="-my-6">
          <MessageReussite message={ecran.reussite} envoi={ecran.envoi} />
        </div>

        {pleinePage ? null : (
          <ApresChargement
            enChargement={donnees.etat === 'chargement'}
            indicateur={<ChargementPage texte={TEXTES_COMPTES.chargement} />}
          >
            {donnees.etat === 'erreur' ? (
              <ErreurDePage
                message={TEXTES_COMPTES.erreur}
                libelleBouton={TEXTES_COMPTES.reessayer}
                onReessayer={donnees.reessayer}
              />
            ) : null}
            {donnees.etat === 'donnees' ? (
              <>
                <SectionComptes
                  titre={TEXTES_COMPTES.titreMinisteres}
                  complement={
                    // Sans aucun ministère, l'en-tête ne dit rien : l'état vide parle.
                    donnees.donnees.ministeres.length +
                      donnees.donnees.ministeresDesactives.length >
                    0 ? (
                      <span className="text-note text-encre-3">
                        {complementMinisteres(donnees.donnees.nbMinisteresActifs)}
                      </span>
                    ) : undefined
                  }
                  lignes={donnees.donnees.ministeres}
                  desactives={donnees.donnees.ministeresDesactives}
                  variante="ministeres"
                  vide={{
                    texte: VIDES_COMPTES.ministeres,
                    suite: lectureSeule ? VIDES_COMPTES.ministeresSuiteLecture : undefined,
                  }}
                  onAction={onAction}
                  enCours={ecran.enCours}
                  resultat={resultat}
                  moi={moi}
                />
                <SectionComptes
                  titre={TEXTES_COMPTES.titreBergerConseil}
                  complement={
                    lectureSeule ? undefined : (
                      <div className="flex w-full flex-col gap-2 tablette:w-auto tablette:flex-row">
                        {donnees.donnees.bergerActif ? null : (
                          <BoutonAjout
                            libelle={TEXTES_COMPTES.ajouterBerger}
                            onClick={() => ecran.ouvrirPanneau({ genre: 'berger' })}
                          />
                        )}
                        <BoutonAjout
                          libelle={TEXTES_COMPTES.ajouterConseil}
                          onClick={() =>
                            ecran.ouvrirPanneau({
                              genre: 'conseil',
                              nomAffiche: donnees.donnees.prochainConseil,
                            })
                          }
                        />
                      </div>
                    )
                  }
                  lignes={donnees.donnees.bergerConseil}
                  desactives={donnees.donnees.bergerConseilDesactives}
                  variante="personnes"
                  vide={{ texte: VIDES_COMPTES.bergerConseil }}
                  onAction={onAction}
                  enCours={ecran.enCours}
                  resultat={resultat}
                  moi={moi}
                />
                <SectionComptes
                  titre={TEXTES_COMPTES.titreEjpTech}
                  complement={
                    lectureSeule ? undefined : (
                      <BoutonAjout
                        libelle={TEXTES_COMPTES.ajouterEjpTech}
                        onClick={() =>
                          ecran.ouvrirPanneau({
                            genre: 'admin_plateforme',
                            nomAffiche: donnees.donnees.prochainEjpTech,
                          })
                        }
                      />
                    )
                  }
                  lignes={donnees.donnees.ejpTech}
                  desactives={donnees.donnees.ejpTechDesactives}
                  variante="personnes"
                  vide={{
                    texte: VIDES_COMPTES.ejpTech,
                    suite: lectureSeule ? VIDES_COMPTES.ejpTechSuite : undefined,
                  }}
                  onAction={onAction}
                  enCours={ecran.enCours}
                  resultat={resultat}
                  moi={moi}
                />
                <ListesEglise lectureSeule={lectureSeule} />
              </>
            ) : null}
          </ApresChargement>
        )}

        {/* Toujours à la même place de l'arbre : passer le palier de 600 px garde la saisie. En
          page entière, rien n'est rendu entre la région des messages et le panneau. */}
        {panneau}
        {ecran.confirmation ? (
          <FenetreConfirmation
            confirmation={ecran.confirmation.texte}
            onConfirmer={ecran.confirmation.confirmer}
            onAnnuler={ecran.annulerConfirmation}
          />
        ) : null}
        {ecran.refus ? (
          <FenetreRefusSuppression
            refus={ecran.refus.texte}
            onDesactiver={ecran.refus.desactiver}
            onFermer={ecran.fermerRefus}
          />
        ) : null}
      </GabaritPage>
    </div>
  )
}
