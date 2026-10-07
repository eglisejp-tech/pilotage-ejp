import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { BoutonAjout } from '@/features/comptes/BoutonAjout'
import { FenetreConfirmation } from '@/features/comptes/FenetreConfirmation'
import { ListesEglise } from '@/features/comptes/ListesEglise'
import { PanneauCompte } from '@/features/comptes/PanneauCompte'
import { SectionComptes } from '@/features/comptes/SectionComptes'
import { complementMinisteres, TEXTES_COMPTES, VIDES_COMPTES } from '@/features/comptes/textes'
import type { ActionsComptes, DonneesComptes } from '@/features/comptes/types'
import { useEcranComptes } from '@/features/comptes/useEcranComptes'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  titre: string
  donnees: EtatBloc<DonneesComptes>
  actions: ActionsComptes
}

/** Le focus n'est plus nulle part : son élément a disparu (bouton remplacé, panneau fermé). */
function focusPerdu(): boolean {
  const actif = document.activeElement
  return actif === null || actif === document.body || !actif.isConnected
}

/**
 * Écran 13, « Ministères et comptes » (administration de l'église ; maquette 13, BRIEF section 9) :
 * titre, phrase et « Ajouter un ministère », puis les sections Ministères, Berger et conseil,
 * EJP Tech et Listes. Les panneaux d'ajout s'ouvrent en page entière sous 600 px, en panneau de
 * 460 px au-delà ; désactiver et refaire l'activation passent par une fenêtre de confirmation.
 * La réussite d'une création s'affiche en haut de la page ; le résultat d'une action de ligne,
 * sous les boutons de sa ligne. Quand le bouton qui avait le focus disparaît, le focus va au
 * premier bouton de la même ligne, ou au titre après une création.
 */
export function VueComptes({ titre, donnees, actions }: Props) {
  const ecran = useEcranComptes(actions)
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
      panneau={ecran.panneau}
      creer={actions.creer}
      onCree={ecran.apresCreation}
      onFermer={ecran.fermerPanneau}
    />
  ) : null

  return (
    <div ref={contenuRef} className="flex flex-col gap-12">
      {pleinePage ? null : (
        <div className="flex flex-col gap-6 min-[1024px]:flex-row min-[1024px]:items-end min-[1024px]:justify-between">
          <div className="flex flex-col gap-2.5">
            <h1
              ref={titreRef}
              tabIndex={-1}
              className="font-lecture text-titre leading-[1.1] font-medium focus:outline-hidden"
            >
              {titre}
            </h1>
            <p className="max-w-[720px] leading-relaxed text-encre-2">
              {TEXTES_COMPTES.introduction}
            </p>
          </div>
          {donnees.etat === 'donnees' ? (
            <BoutonAjout
              principal
              libelle={TEXTES_COMPTES.ajouterMinistere}
              onClick={() => ecran.ouvrirPanneau({ genre: 'ministere' })}
            />
          ) : null}
        </div>
      )}

      <div className="-my-6">
        <MessageReussite message={ecran.reussite} envoi={ecran.envoi} />
      </div>

      {pleinePage ? panneau : null}
      {!pleinePage && donnees.etat === 'chargement' ? <ChargementBloc /> : null}
      {!pleinePage && donnees.etat === 'erreur' ? (
        <ErreurDePage
          message={TEXTES_COMPTES.erreur}
          libelleBouton={TEXTES_COMPTES.reessayer}
          onReessayer={donnees.reessayer}
        />
      ) : null}
      {!pleinePage && donnees.etat === 'donnees' ? (
        <>
          <SectionComptes
            titre={TEXTES_COMPTES.titreMinisteres}
            complement={
              // Sans aucun ministère, l'en-tête ne dit rien : l'état vide parle.
              donnees.donnees.ministeres.length > 0 ? (
                <span className="text-note text-encre-3">
                  {complementMinisteres(donnees.donnees.nbMinisteresActifs)}
                </span>
              ) : undefined
            }
            lignes={donnees.donnees.ministeres}
            variante="ministeres"
            vide={{ texte: VIDES_COMPTES.ministeres, suite: VIDES_COMPTES.ministeresSuite }}
            note={
              <>
                {TEXTES_COMPTES.noteIndicateurs}{' '}
                <Link to="/indicateurs" className="text-nuit underline underline-offset-4">
                  {TEXTES_COMPTES.lienIndicateurs}
                </Link>
                .
              </>
            }
            onAction={ecran.surAction}
            enCours={ecran.enCours}
            resultat={resultat}
          />
          <SectionComptes
            titre={TEXTES_COMPTES.titreBergerConseil}
            complement={
              <div className="flex w-full flex-col gap-2 min-[600px]:w-auto min-[600px]:flex-row">
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
            }
            lignes={donnees.donnees.bergerConseil}
            variante="personnes"
            vide={{ texte: VIDES_COMPTES.bergerConseil, suite: VIDES_COMPTES.bergerConseilSuite }}
            onAction={ecran.surAction}
            enCours={ecran.enCours}
            resultat={resultat}
          />
          <SectionComptes
            titre={TEXTES_COMPTES.titreEjpTech}
            complement={
              <BoutonAjout
                libelle={TEXTES_COMPTES.ajouterEjpTech}
                onClick={() =>
                  ecran.ouvrirPanneau({
                    genre: 'admin_plateforme',
                    nomAffiche: donnees.donnees.prochainEjpTech,
                  })
                }
              />
            }
            lignes={donnees.donnees.ejpTech}
            variante="personnes"
            vide={{ texte: VIDES_COMPTES.ejpTech, suite: VIDES_COMPTES.ejpTechSuite }}
            onAction={ecran.surAction}
            enCours={ecran.enCours}
            resultat={resultat}
          />
          <ListesEglise />
        </>
      ) : null}

      {pleinePage ? null : panneau}
      {ecran.confirmation ? (
        <FenetreConfirmation
          confirmation={ecran.confirmation.texte}
          onConfirmer={ecran.confirmation.confirmer}
          onAnnuler={ecran.annulerConfirmation}
        />
      ) : null}
    </div>
  )
}
