import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Aide } from '@/components/aide/Aide'
import { ChampNombre } from '@/features/saisie/ChampNombre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { BoutonEnregistrer } from '@/features/saisie-session/BoutonEnregistrer'
import { erreursSession, PRESENTS_MAX } from '@/features/saisie-session/schemas'
import type {
  ChampsSession,
  ErreursSession,
  SaisieParticipation,
} from '@/features/saisie-session/schemas'
import {
  adresseSaisieSession,
  ligneComptesDansTotal,
  ligneDejaSaisi,
  messageReussiteSession,
  phraseCompletudeSession,
} from '@/features/saisie-session/session'
import { useEnvoiSaisie } from '@/features/saisie-session/useEnvoiSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import type { TypeSession } from '@/lib/base'
import { nombre } from '@/lib/metier/texte'

/** La session saisie, avec sa complétude (`v_session_completude`). */
export interface SessionSaisie {
  sessionId: string
  type: TypeSession
  intitule: string | null
  date: string
  nbSaisis: number
  nbAttendus: number
  manquants: readonly string[]
}

interface Props {
  session: SessionSaisie
  ministereId: string
  /** Présents saisis par le ministère à la session précédente du même type ; null : aucune. */
  precedente: number | null
  /** Saisie la plus récente du ministère pour cette session (correction) ; null : première. */
  dejaSaisi: { valeur: number; deja_comptes: number; saisi_le: string } | null
  /** Enregistre la présence ; rejette en cas d'échec (les valeurs restent). */
  enregistrer: (saisie: SaisieParticipation) => Promise<void>
}

/**
 * Formulaire de la saisie d'une session (maquette 09) : tous les STARs présents du ministère, puis
 * ceux déjà comptés par leur ministère principal (0 par défaut), la ligne calculée « Comptés dans
 * le total de l'église : 11. », la complétude de la session et ses manquants. Un nombre de
 * personnes seulement, aucun nom (BRIEF, règle 5). Trois aides au plus, toutes en flux.
 */
export function FormulaireSession({
  session,
  ministereId,
  precedente,
  dejaSaisi,
  enregistrer,
}: Props) {
  const [champs, setChamps] = useState<ChampsSession>({
    presents: dejaSaisi ? String(dejaSaisi.valeur) : '',
    dejaComptes: String(dejaSaisi?.deja_comptes ?? 0),
  })
  const [erreurs, setErreurs] = useState<ErreursSession>({})
  const envoi = useEnvoiSaisie()
  const completude = phraseCompletudeSession(
    session.nbSaisis,
    session.nbAttendus,
    session.manquants,
  )

  const changer = (champ: keyof ChampsSession) => (valeur: string) => {
    setChamps((precedents) => ({ ...precedents, [champ]: valeur }))
    setErreurs((precedentes) => ({ ...precedentes, [champ]: undefined }))
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (envoi.enCours) return
    const ids = { sessionId: session.sessionId, ministereId }
    const trouvees = erreursSession(champs, ids)
    setErreurs(trouvees)
    if (trouvees.presents || trouvees.dejaComptes) {
      const premier = trouvees.presents ? 'session-presents' : 'session-deja-comptes'
      document.getElementById(premier)?.focus()
      return
    }
    await envoi.envoyer(
      () =>
        enregistrer({
          ...ids,
          valeur: Number(champs.presents),
          dejaComptes: Number(champs.dejaComptes),
        }),
      messageReussiteSession(session.type, session.intitule, session.date),
    )
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
      <div className="border border-filet bg-papier px-4 pt-1 pb-4">
        <ChampNombre
          id="session-presents"
          libelle="STARs de votre ministère présents"
          aide="session.presents"
          valeur={champs.presents}
          onChange={changer('presents')}
          max={PRESENTS_MAX}
          note={precedente === null ? undefined : `Session précédente : ${nombre(precedente)}`}
          erreur={erreurs.presents}
        />
      </div>
      <ChampNombre
        id="session-deja-comptes"
        libelle="Dont déjà comptés par leur ministère principal"
        aide="session.dejaComptes"
        valeur={champs.dejaComptes}
        onChange={changer('dejaComptes')}
        max={PRESENTS_MAX}
        variante="compact"
        erreur={erreurs.dejaComptes}
      />
      <p className="text-[15px] leading-normal font-semibold" aria-live="polite">
        {ligneComptesDansTotal(champs)}
      </p>
      {dejaSaisi ? (
        <p className="text-sm leading-normal text-encre-3">{ligneDejaSaisi(dejaSaisi)}</p>
      ) : null}
      <div className="flex flex-wrap items-center">
        <p className="min-w-0 flex-1 text-[15px] leading-normal">
          {completude.texte}
          {completude.manquants ? (
            <>
              <strong className="font-semibold text-attention">{completude.manquants}</strong>.
            </>
          ) : null}
        </p>
        <Aide code="session.completude" libelle="Ministères qui ont déjà saisi" />
      </div>
      <p className="text-sm text-encre-3">Un nombre de personnes seulement, jamais de noms.</p>
      <BoutonEnregistrer libelle="Enregistrer la présence" enCours={envoi.enCours} />
      {envoi.echec ? <ErreurFormulaire message={envoi.echec.message ?? undefined} /> : null}
      <MessageReussite
        message={envoi.reussite?.message ?? null}
        envoi={envoi.reussite?.envoi ?? 0}
      />
      <div className="flex flex-col">
        <Link
          to={adresseSaisieSession()}
          className="inline-flex min-h-cible items-center self-start text-[15px] text-nuit underline underline-offset-4"
        >
          Changer de session
        </Link>
        <LienSignalement ecran="saisie_session" />
      </div>
    </form>
  )
}
