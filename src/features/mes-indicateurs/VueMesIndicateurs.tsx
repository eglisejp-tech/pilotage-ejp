import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { BoutonAjout } from '@/features/comptes/BoutonAjout'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import type {
  DonneesMesIndicateurs,
  LigneMonIndicateur,
} from '@/features/mes-indicateurs/construire'
import { FenetreRetrait } from '@/features/mes-indicateurs/FenetreRetrait'
import {
  RetiresMesIndicateurs,
  SectionsMesIndicateurs,
} from '@/features/mes-indicateurs/ListeMesIndicateurs'
import { PanneauAjout } from '@/features/mes-indicateurs/PanneauAjout'
import type { FormulaireSuggestion } from '@/features/mes-indicateurs/schemas'
import { reussiteRetrait, TEXTES_MES_INDICATEURS } from '@/features/mes-indicateurs/textes'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  /** « Mes indicateurs ». */
  titre: string
  donnees: EtatBloc<DonneesMesIndicateurs>
  /** L'appel à `ajouter_suggestion` pour la suggestion choisie. */
  envoyer: (code: string, formulaire: FormulaireSuggestion) => Promise<void>
  /** L'appel à `retirer_mon_indicateur` pour un ajout du ministère, avec son motif (T62). */
  retirer: (indicateurId: string, motif: string) => Promise<void>
}

/** Le focus n'est plus nulle part : son élément a disparu (panneau fermé). */
function focusPerdu(): boolean {
  const actif = document.activeElement
  return actif === null || actif === document.body || !actif.isConnected
}

/**
 * `/ma-fiche/indicateurs`, « Mes indicateurs » (configuration-indicateurs.md, 7.3) : la phrase du
 * ministère (« Communication suit 7 indicateurs : ... Vous pouvez en ajouter 1 autre. »), « Ajouter
 * un indicateur », puis les indicateurs par rythme avec leur origine, leur usage et leur état (« À
 * valider par EJP Tech depuis 2 jours. Vous pouvez déjà le saisir... »), et « Retirés » avec le
 * motif d'un refus. Aucune valeur n'est lue. Le bouton « Ajouter un indicateur » ouvre un panneau
 * de 460 px (page entière sous 600 px) ; il reste actif à la limite, le panneau dit alors quoi
 * faire. Un envoi réussi ferme le panneau et s'annonce 6 secondes ; le focus revient au titre
 * quand le bouton d'origine n'est plus là. Sur ses ajouts, « Retirer la demande » ou « Retirer »
 * ouvre la fenêtre du motif (T62) ; un retrait réussi s'annonce de la même façon.
 */
export function VueMesIndicateurs({ titre, donnees, envoyer, retirer }: Props) {
  useTitrePage(titre)
  const idTitre = useId()
  const titreRef = useRef<HTMLHeadingElement>(null)
  const enPanneau = useLargeurMin(LARGEUR_PANNEAU)
  const [panneau, setPanneau] = useState(false)
  const [aRetirer, setARetirer] = useState<LigneMonIndicateur | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  const annoncer = (message: string) => {
    setReussite(message)
    setEnvoi((n) => n + 1)
  }

  // Sous 600 px, le panneau prend la page entière.
  const pleinePage = panneau && !enPanneau
  const pleinePagePrecedente = useRef(pleinePage)
  useEffect(() => {
    const etait = pleinePagePrecedente.current
    pleinePagePrecedente.current = pleinePage
    if (etait && !pleinePage && focusPerdu()) titreRef.current?.focus()
  }, [pleinePage])

  const pret = donnees.etat === 'donnees' ? donnees.donnees : null

  // Un ajout retiré quitte sa section quand la liste est relue : le focus, rendu à son bouton par
  // la fenêtre puis perdu avec lui, revient au titre.
  const nombreDeRetires = pret?.retires.length ?? null
  useEffect(() => {
    if (envoi > 0 && focusPerdu()) titreRef.current?.focus()
  }, [envoi, nombreDeRetires])

  return (
    <div className="flex flex-col gap-8">
      {pleinePage ? null : (
        <>
          <header className="flex flex-col gap-2.5">
            <div>
              <Link
                to="/ma-fiche"
                className="inline-flex min-h-cible items-center text-[15px] text-nuit underline underline-offset-4"
              >
                {TEXTES_MES_INDICATEURS.titreRetour}
              </Link>
            </div>
            <p className="text-[15px] text-encre-3">{TEXTES_MES_INDICATEURS.surtitre}</p>
            <h1
              id={idTitre}
              ref={titreRef}
              tabIndex={-1}
              className="font-lecture text-titre leading-[1.1] font-medium focus:outline-hidden"
            >
              {titre}
            </h1>
            {pret?.phrase ? (
              <p className="max-w-[720px] leading-relaxed text-encre-2">{pret.phrase}</p>
            ) : null}
            {pret ? (
              <div className="mt-2">
                <BoutonAjout
                  principal
                  libelle={TEXTES_MES_INDICATEURS.ajouter}
                  onClick={() => setPanneau(true)}
                />
              </div>
            ) : null}
          </header>

          <div className="-my-5">
            <MessageReussite message={reussite} envoi={envoi} />
          </div>

          {donnees.etat === 'chargement' ? <ChargementBloc /> : null}
          {donnees.etat === 'erreur' ? (
            <ErreurDePage
              message={TEXTES_MES_INDICATEURS.erreur}
              libelleBouton={TEXTES_MES_INDICATEURS.reessayer}
              onReessayer={donnees.reessayer}
            />
          ) : null}
          {pret?.vide ? (
            <EtatVide situation="premier_usage" suite={TEXTES_MES_INDICATEURS.aucunIndicateurSuite}>
              {TEXTES_MES_INDICATEURS.aucunIndicateur}
            </EtatVide>
          ) : null}
          {pret ? (
            <SectionsMesIndicateurs sections={pret.sections} surRetirer={setARetirer} />
          ) : null}
          {pret ? <RetiresMesIndicateurs retires={pret.retires} /> : null}
        </>
      )}

      {pret && panneau ? (
        <PanneauAjout
          suggestions={pret.suggestions}
          limite={pret.limite}
          envoyer={envoyer}
          onFait={(message) => {
            setPanneau(false)
            annoncer(message)
          }}
          onFermer={() => setPanneau(false)}
        />
      ) : null}

      {aRetirer !== null && aRetirer.retrait !== null && aRetirer.retrait.genre !== 'source' ? (
        <FenetreRetrait
          key={aRetirer.id}
          libelle={aRetirer.libelle}
          demande={aRetirer.retrait.genre === 'demande'}
          retirer={(motif) => retirer(aRetirer.id, motif)}
          onFait={() => {
            const demande = aRetirer.retrait?.genre === 'demande'
            setARetirer(null)
            annoncer(reussiteRetrait(aRetirer.libelle, demande))
          }}
          onAnnuler={() => setARetirer(null)}
        />
      ) : null}
    </div>
  )
}
