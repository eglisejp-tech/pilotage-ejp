import { useEffect, useId, useRef, useState } from 'react'
import { Arrivee } from '@/components/etats/Arrivee'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'
import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { Masquage } from '@/features/moderation/schemas'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { idTitreLigne } from '@/features/signalement/identifiants'
import { LigneSignalementBloc } from '@/features/signalement/LigneSignalementBloc'
import type { GestesEjpTech, SuitesLigne } from '@/features/signalement/LigneSignalementBloc'
import { groupesEjpTech, lignesDe } from '@/features/signalement/suivi'
import { TEXTES_BLOC_SIGNALEMENTS, TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

/** Ce que montre le bloc « Signalements ». */
export type ContenuBloc =
  | { etat: 'chargement' }
  | { etat: 'probleme'; reessayer: () => void }
  | {
      etat: 'liste'
      /** Ouverts et clos des 30 derniers jours (filtres de la base), du plus ancien au plus récent. */
      signalements: LigneSignalement[]
      /** Leurs lignes de suivi. */
      suivi: EtapeDuSuivi[]
      gestes: GestesEjpTech
      /** Relit la liste (après un refus qui dit que le signalement a changé). */
      relire: () => void
      /**
       * « Masquer » (lot L6) : remplace le texte du signalement ou une réponse par « [texte masqué
       * par EJP Tech] ». Sans cette fonction, le bouton n'existe pas.
       */
      masquer?: (masquage: Masquage) => Promise<void>
    }

interface Props {
  contenu: ContenuBloc
}

/**
 * Bloc « Signalements » de l'accueil d'EJP Tech (T39, T77 ; BRIEF, « Modération »), au-dessus du
 * reste de l'écran : titre avec « N signalements à traiter » (Reçu et En cours : ce qui attend un
 * geste d'EJP Tech) ; trois groupes, « À traiter » et « En attente du ministère » du plus ancien au
 * plus récent, puis « Clos ces 30 derniers jours » (jour de Paris, calculé par la base), les
 * derniers clos en premier ; un groupe vide n'apparaît pas. Rien du tout : « Aucun signalement. ».
 * Après un geste, le message est annoncé (`role="status"`) et le focus va sur l'en-tête de la
 * ligne, qui a peut-être changé de groupe ; après un masquage, au titre du bloc.
 */
export function ContenuBlocSignalements({ contenu: lecture }: Props) {
  // T65 : la petite flamme reste au moins 600 ms une fois montrée ; le compteur et la liste
  // arrivent ensuite ensemble, en fondu.
  const { lecture: contenu, fondu } = useLectureAffichee(lecture)
  const attente = contenu.etat === 'chargement'
  const idTitre = useId()
  const idATraiter = useId()
  const idAttente = useId()
  const idClos = useId()
  const titre = useRef<HTMLHeadingElement>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const [refus, setRefus] = useState<{ id: string; message: string } | null>(null)
  const [cible, setCible] = useState<string | null>(null)
  const [masques, setMasques] = useState(0)

  const liste = contenu.etat === 'liste' ? contenu : null
  const groupes = groupesEjpTech(liste?.signalements ?? [])
  // Le statut de la cible du focus : quand la lecture le change, le focus suit la ligne.
  const statutCible = cible
    ? liste?.signalements.find((ligne) => ligne.id === cible)?.statut
    : undefined

  useEffect(() => {
    if (cible === null) return
    document.getElementById(idTitreLigne(cible))?.focus()
  }, [cible, statutCible])

  const suites: SuitesLigne | undefined = liste
    ? {
        gestes: liste.gestes,
        surReussite: (id, message) => {
          setRefus(null)
          setReussite(message)
          setEnvoi((precedent) => precedent + 1)
          setCible(id)
        },
        surChange: (id, message) => {
          setReussite(null)
          setRefus({ id, message })
          liste.relire()
        },
        // Un autre panneau s'ouvre : l'ancien refus n'a plus lieu d'être.
        surOuverture: () => setRefus(null),
      }
    : undefined

  // « Masquer » : après le masquage, le message est annoncé et le focus va au titre du bloc, une
  // fois la fenêtre démontée (qui rendait le focus au bouton, parfois disparu).
  const masquage =
    liste && liste.masquer
      ? {
          masquer: liste.masquer,
          surMasque: () => {
            setRefus(null)
            setCible(null)
            setReussite(TEXTES_MODERATION.reussiteMasque)
            setEnvoi((precedent) => precedent + 1)
            setMasques((precedent) => precedent + 1)
          },
        }
      : undefined
  useEffect(() => {
    if (masques > 0) titre.current?.focus()
  }, [masques])

  const groupe = (
    id: string,
    nom: string,
    lignes: LigneSignalement[],
    avecGestes: boolean,
    espace: boolean,
  ) =>
    !liste || lignes.length === 0 ? null : (
      <section aria-labelledby={id} className={espace ? 'mt-6 flex flex-col' : 'flex flex-col'}>
        <h3 id={id} className="border-b border-filet pb-2 text-[15px] font-semibold text-encre-2">
          {nom}
        </h3>
        <ol>
          {lignes.map((signalement) => (
            <li key={signalement.id} className="border-t border-filet first:border-t-0">
              <LigneSignalementBloc
                signalement={signalement}
                lignes={lignesDe(liste.suivi, signalement.id)}
                suites={avecGestes ? suites : undefined}
                refus={refus?.id === signalement.id ? refus.message : null}
                masquage={masquage}
              />
            </li>
          ))}
        </ol>
      </section>
    )

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-encre pb-3">
        <h2
          id={idTitre}
          ref={titre}
          tabIndex={-1}
          className="font-lecture text-section leading-tight font-medium outline-hidden"
        >
          {TEXTES_SIGNALEMENT.bloc.titre}
        </h2>
        {liste ? (
          <p className="text-note text-encre-2">
            {TEXTES_BLOC_SIGNALEMENTS.aTraiter(groupes.aTraiter.length)}
          </p>
        ) : null}
      </div>

      {attente ? <ChargementBloc texte={TEXTES_BLOC_SIGNALEMENTS.chargement} /> : null}
      {!attente && contenu.etat === 'probleme' ? (
        <Arrivee fondu={fondu}>
          <EtatVide
            situation="probleme_passager"
            action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
          >
            {TEXTES_VIDES.page.erreur}
          </EtatVide>
        </Arrivee>
      ) : null}

      <MessageReussite message={reussite} envoi={envoi} />

      {!attente && liste ? (
        <Arrivee fondu={fondu}>
          {liste.signalements.length === 0 ? (
            <EtatVide situation="tout_est_fait">{TEXTES_SIGNALEMENT.bloc.vide}</EtatVide>
          ) : null}
          {groupe(
            idATraiter,
            TEXTES_BLOC_SIGNALEMENTS.groupeATraiter,
            groupes.aTraiter,
            true,
            false,
          )}
          {groupe(
            idAttente,
            TEXTES_BLOC_SIGNALEMENTS.groupeAttente,
            groupes.attente,
            false,
            groupes.aTraiter.length > 0,
          )}
          {groupe(
            idClos,
            TEXTES_BLOC_SIGNALEMENTS.titreClos,
            groupes.clos,
            false,
            groupes.aTraiter.length + groupes.attente.length > 0,
          )}
        </Arrivee>
      ) : null}
    </section>
  )
}
