import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { ApresChargement } from '@/components/etats/ApresChargement'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { ANCRE_A_VALIDER } from '@/features/indicateurs/validation/ancre'
import type {
  LigneAValider as Ligne,
  LigneDecidee,
  LigneRetraitMinistere,
} from '@/features/indicateurs/validation/construire'
import { LigneAValider } from '@/features/indicateurs/validation/LigneAValider'
import type { ActionsLigne } from '@/features/indicateurs/validation/LigneAValider'
import { MasquageTexte } from '@/features/indicateurs/validation/MasquageTexte'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import { TEXTES_A_VALIDER, texteNombreEnAttente } from '@/features/indicateurs/validation/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { EtatVide } from '@/components/etats/EtatVide'
import { nombre } from '@/lib/metier/texte'

interface Props {
  /** EJP Tech décide et lit le « Pourquoi » ; l'administration lit l'attente, sans bouton. */
  decide: boolean
  lignes: EtatBloc<Ligne[]>
  /** Les décisions des 30 derniers jours (EJP Tech seulement) : lues à part, leur échec ne bloque rien. */
  decidees: EtatBloc<LigneDecidee[]> | null
  /**
   * Les retraits des ministères des 30 derniers jours, avec leur motif (EJP Tech seulement, T62) :
   * lus à part, comme les décisions. Absent ou `null` : l'administration, qui ne les lit pas.
   */
  retraits?: EtatBloc<LigneRetraitMinistere[]> | null
  /** `null` : lecture seule. */
  actions: ActionsLigne | null
}

/** Le focus n'est plus nulle part : son élément a disparu (ligne décidée, fenêtre fermée). */
function focusPerdu(): boolean {
  const actif = document.activeElement
  return actif === null || actif === document.body || !actif.isConnected
}

/**
 * Bloc « À valider » de l'écran Indicateurs, sous les phrases (configuration-indicateurs.md, 7.1 ;
 * validation-metier.md, 5.1) : les ajouts des ministères qui attendent EJP Tech, du plus ancien au
 * plus récent. EJP Tech y décide et lit le « Pourquoi » ; l'administration le lit sans bouton et
 * sans « Pourquoi ». Le bloc garde son titre et son ancre (`#a-valider`) même vide, pour que le lien
 * de la Modération et celui d'un indicateur à valider arrivent toujours quelque part ; vide, il dit
 * « Rien à valider. ». Après une décision, le message est annoncé 6 secondes et le focus revient
 * au titre quand la ligne décidée a disparu. EJP Tech lit dessous, repliés, les décisions et les
 * retraits faits par les ministères (T62) des 30 derniers jours, avec leur motif.
 */
export function VueAValider({
  decide,
  lignes: lecture,
  decidees,
  retraits = null,
  actions,
}: Props) {
  // T65 : le nombre en attente, la phrase et la liste arrivent ensemble, après la tenue.
  const lignes = useLectureAffichee(lecture).lecture
  const idTitre = useId()
  const section = useRef<HTMLElement>(null)
  const { hash } = useLocation()
  const [reussite, setReussite] = useState<string | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  // Le lien « Voir dans À valider » arrive au bloc, une fois la liste affichée.
  const pret = lignes.etat === 'donnees'
  useEffect(() => {
    if (pret && hash === `#${ANCRE_A_VALIDER}`) {
      section.current?.scrollIntoView({ block: 'start' })
      section.current?.focus({ preventScroll: true })
    }
  }, [pret, hash])

  const liste = lignes.etat === 'donnees' ? lignes.donnees : null
  // Une ligne décidée disparaît de la liste quand elle est relue : le focus, perdu avec son bouton,
  // revient au titre du bloc.
  const nombreDeLignes = liste?.length ?? null
  useEffect(() => {
    if (envoi > 0 && focusPerdu()) section.current?.focus()
  }, [envoi, nombreDeLignes])

  const annoncer = (message: string) => {
    setRefus(null)
    setReussite(message)
    setEnvoi((n) => n + 1)
  }
  const signalerRefus = (message: string) => {
    setReussite(null)
    setRefus(message)
    setEnvoi((n) => n + 1)
  }

  return (
    <section
      id={ANCRE_A_VALIDER}
      ref={section}
      tabIndex={-1}
      aria-labelledby={idTitre}
      className="mt-8 scroll-mt-6 outline-hidden"
    >
      <TitreSection
        id={idTitre}
        titre={TEXTES_A_VALIDER.titre}
        complement={
          liste ? (
            <p className="text-note text-encre-3">{texteNombreEnAttente(liste.length)}</p>
          ) : null
        }
      />
      {/* Rien n'attend : l'état vide parle seul, l'introduction dirait le contraire. */}
      {liste !== null && liste.length > 0 ? (
        <p className="mt-3 max-w-prose text-encre-2">
          {decide ? TEXTES_A_VALIDER.introEjpTech : TEXTES_A_VALIDER.introAdministration}
        </p>
      ) : null}
      <MessageReussite message={reussite} envoi={envoi} />
      {refus !== null ? (
        <div className="mt-3">
          <ErreurFormulaire message={refus} />
        </div>
      ) : null}

      <ApresChargement
        enChargement={lignes.etat === 'chargement'}
        indicateur={<ChargementBloc texte={TEXTES_A_VALIDER.chargement} />}
      >
        {lignes.etat === 'erreur' ? <BandeauErreur reessayer={lignes.reessayer} /> : null}
        {liste !== null && liste.length === 0 ? (
          <EtatVide situation="tout_est_fait">{TEXTES_A_VALIDER.vide}</EtatVide>
        ) : null}
        {liste !== null && liste.length > 0 ? (
          <ul className="divide-y divide-filet">
            {liste.map((ligne) => (
              <li key={ligne.id}>
                <LigneAValider
                  ligne={ligne}
                  actions={actions}
                  surFait={annoncer}
                  surRefus={signalerRefus}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Sans la file (chargement, erreur), aucun chiffre ne paraît seul : le bandeau parle. */}
        {liste !== null && decidees !== null && decidees.etat === 'donnees' ? (
          decidees.donnees.length > 0 ? (
            <Decidees lignes={decidees.donnees} actions={actions} surMasque={annoncer} />
          ) : null
        ) : null}
        {liste !== null && decidees !== null && decidees.etat === 'erreur' ? (
          <BandeauErreur reessayer={decidees.reessayer} />
        ) : null}
        {liste !== null && retraits !== null && retraits.etat === 'donnees' ? (
          retraits.donnees.length > 0 ? (
            <RetraitsMinisteres lignes={retraits.donnees} actions={actions} surMasque={annoncer} />
          ) : null
        ) : null}
        {liste !== null && retraits !== null && retraits.etat === 'erreur' ? (
          <BandeauErreur reessayer={retraits.reessayer} />
        ) : null}
      </ApresChargement>
    </section>
  )
}

interface PropsRetraits {
  lignes: LigneRetraitMinistere[]
  /** `null` : lecture seule, aucun « Masquer le texte ». */
  actions: ActionsLigne | null
  surMasque: (message: string) => void
}

/**
 * « Retirés par les ministères ces 30 derniers jours », repliés (T62) : « Kumi, « Projets en
 * cours » », puis « Demande retirée le 14 oct. : « motif » ». Le motif est un texte libre écrit
 * par le ministère : EJP Tech peut le masquer, comme le « Pourquoi » et le motif d'un refus (ces
 * textes n'entrent pas dans la file de la Modération). Une demande retirée avant la décision a
 * quitté la file : son « Pourquoi » suit, avec son propre « Masquer le texte », pour qu'EJP Tech
 * puisse encore le lire et le masquer (ce champ n'a pas de rappel sur les données personnelles,
 * T30). Chaque bouton est décrit par la ligne et par le texte qu'il masque.
 */
function RetraitsMinisteres({ lignes, actions, surMasque }: PropsRetraits) {
  const prefixe = useId()
  return (
    <details className="mt-4 border-t border-filet">
      <summary className="inline-flex min-h-cible cursor-pointer items-center text-[15px] font-semibold underline underline-offset-4">
        {TEXTES_A_VALIDER.titreRetraits} ({nombre(lignes.length)})
      </summary>
      <ul className="divide-y divide-filet pb-2">
        {lignes.map((ligne) => {
          const idTitre = `${prefixe}-${ligne.id}`
          const idMotif = `${idTitre}-motif`
          const idPourquoi = `${idTitre}-pourquoi`
          const masquable = actions !== null && ligne.motif !== TEXTE_MASQUE
          const pourquoi = ligne.pourquoi
          const pourquoiMasquable =
            actions !== null && pourquoi !== null && pourquoi.texte !== TEXTE_MASQUE
          return (
            <li key={ligne.id} className="flex flex-col gap-0.5 py-3">
              <p id={idTitre} className="text-[15px] wrap-anywhere">
                <span className="font-semibold">{ligne.ministere}</span>
                {', '}«&nbsp;{ligne.libelle}&nbsp;»
              </p>
              <p id={idMotif} className="text-note wrap-anywhere text-encre-3">
                {ligne.texte}
                {' : '}«&nbsp;
                <ChampLibre texte={{ texte: ligne.motif, masque: ligne.motif === TEXTE_MASQUE }} />
                &nbsp;»
              </p>
              {masquable ? (
                <div className="mt-1">
                  <MasquageTexte
                    contexte={`${TEXTES_A_VALIDER.contexteMasquageRetrait}, ${ligne.ministere}`}
                    cible="retrait_indicateur"
                    cibleId={ligne.id}
                    champ={{
                      code: 'motif',
                      libelle: TEXTES_A_VALIDER.motifDuRetrait,
                      texte: ligne.motif,
                    }}
                    masquer={actions.masquer}
                    surMasque={() => surMasque(TEXTES_MODERATION.reussiteMasque)}
                    decritPar={`${idTitre} ${idMotif}`}
                  />
                </div>
              ) : null}
              {pourquoi !== null ? (
                <p id={idPourquoi} className="mt-2 text-note wrap-anywhere text-encre-3">
                  {TEXTES_A_VALIDER.pourquoi}
                  {' : '}«&nbsp;
                  <ChampLibre
                    texte={{ texte: pourquoi.texte, masque: pourquoi.texte === TEXTE_MASQUE }}
                  />
                  &nbsp;»
                </p>
              ) : null}
              {pourquoiMasquable ? (
                <div className="mt-1">
                  <MasquageTexte
                    contexte={`${TEXTES_A_VALIDER.contexteMasquagePourquoiRetire}, ${ligne.ministere}`}
                    cible="demande_indicateur"
                    cibleId={pourquoi.demandeId}
                    champ={{
                      code: 'pourquoi',
                      libelle: TEXTES_A_VALIDER.pourquoi,
                      texte: pourquoi.texte,
                    }}
                    masquer={actions.masquer}
                    surMasque={() => surMasque(TEXTES_MODERATION.reussiteMasque)}
                    decritPar={`${idTitre} ${idPourquoi}`}
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

/** « La connexion a échoué. Réessayez. » et « Réessayer » : la lecture en cause est relancée. */
function BandeauErreur({ reessayer }: { reessayer: () => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-alerte-fond px-4 py-3">
      <p role="alert" className="text-[15px] leading-normal text-alerte">
        {TEXTES_A_VALIDER.erreur}
      </p>
      <button
        type="button"
        onClick={reessayer}
        className="inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond"
      >
        {TEXTES_A_VALIDER.reessayer}
      </button>
    </div>
  )
}

interface PropsDecidees {
  lignes: LigneDecidee[]
  /** `null` : lecture seule, aucun « Masquer le texte ». */
  actions: ActionsLigne | null
  surMasque: (message: string) => void
}

/**
 * « Décidées ces 30 derniers jours », repliées : « Validée le 8 oct. », « Refusée le 8 oct. :
 * « motif » ». Le titre est souligné comme les autres listes repliées, pour qu'on voie qu'il
 * s'ouvre. EJP Tech peut masquer le motif d'un refus (même après la décision).
 */
function Decidees({ lignes, actions, surMasque }: PropsDecidees) {
  const prefixe = useId()
  return (
    <details className="mt-4 border-t border-filet">
      <summary className="inline-flex min-h-cible cursor-pointer items-center text-[15px] font-semibold underline underline-offset-4">
        {TEXTES_A_VALIDER.titreDecidees} ({nombre(lignes.length)})
      </summary>
      <ul className="divide-y divide-filet pb-2">
        {lignes.map((ligne) => {
          const idTitre = `${prefixe}-${ligne.id}`
          const motif = ligne.motif
          const masquable = actions !== null && motif !== null && motif !== TEXTE_MASQUE
          return (
            <li key={ligne.id} className="flex flex-col gap-0.5 py-3">
              <p id={idTitre} className="text-[15px] wrap-anywhere">
                <span className="font-semibold">{ligne.ministere}</span>
                {', '}«&nbsp;{ligne.libelle}&nbsp;»
              </p>
              <p className="text-note wrap-anywhere text-encre-3">
                {ligne.texte}
                {ligne.motif !== null ? (
                  <>
                    {' : '}«&nbsp;
                    <ChampLibre
                      texte={{ texte: ligne.motif, masque: ligne.motif === TEXTE_MASQUE }}
                    />
                    &nbsp;»
                  </>
                ) : null}
              </p>
              {masquable ? (
                <div className="mt-1">
                  <MasquageTexte
                    contexte={`${TEXTES_A_VALIDER.contexteMasquageMotif}, ${ligne.ministere}`}
                    cible="validation"
                    cibleId={ligne.id}
                    champ={{
                      code: 'motif',
                      libelle: TEXTES_A_VALIDER.motifDuRefus,
                      texte: motif,
                    }}
                    masquer={actions.masquer}
                    surMasque={() => surMasque(TEXTES_MODERATION.reussiteMasque)}
                    decritPar={idTitre}
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </details>
  )
}
