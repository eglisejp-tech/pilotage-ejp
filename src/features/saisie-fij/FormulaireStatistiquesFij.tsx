import { useState } from 'react'
import type { FormEvent } from 'react'
import { Aide } from '@/components/aide/Aide'
import type { LigneStatistiqueFij } from '@/data/fij'
import { ChampNombre } from '@/features/saisie/ChampNombre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import {
  champsStatistiques,
  ligneTotalRubrique,
  messageReussiteStatistiques,
  semainesProposees,
  valeursStatistiques,
} from '@/features/saisie-fij/calculs'
import type { ChampsStatistiques } from '@/features/saisie-fij/calculs'
import {
  DEPARTEMENTS_FIJ,
  libelleDepartement,
  RUBRIQUES_FIJ,
  VALEUR_FIJ_MAX,
} from '@/features/saisie-fij/departements'
import { erreurValeurFij, MESSAGES_FIJ } from '@/features/saisie-fij/schemas'
import type { SaisieStatistiquesFij } from '@/features/saisie-fij/schemas'
import { BoutonEnregistrer } from '@/features/saisie-session/BoutonEnregistrer'
import { useEnvoiSaisie } from '@/features/saisie-session/useEnvoiSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import type { Departement, RubriqueFij } from '@/lib/base'
import type { DateIso } from '@/lib/metier/dates'

interface Props {
  /** Dimanche de référence (`v_semaine.dimanche`, heure de Paris). */
  dimancheReference: DateIso
  /** `v_fij_statistique` : semaines déjà saisies et valeurs à préremplir. */
  statistiques: readonly LigneStatistiqueFij[]
  /** Enregistre la semaine en un appel ; rejette en cas d'échec (les valeurs restent). */
  enregistrer: (saisie: SaisieStatistiquesFij) => Promise<void>
}

type ErreursStatistiques = Partial<Record<`${RubriqueFij}-${Departement}`, string>>

const idChamp = (rubrique: RubriqueFij, departement: Departement) =>
  `stat-${rubrique}-${departement}`

/**
 * Chiffres par département (dérivé de 08, ministère `fij` seulement ; BRIEF section 9) : la
 * semaine, puis les quatre rubriques, une par section, chacune avec ses 8 départements et son
 * total en direct (« Total : 58, 6 dép. sur 8 »). Un champ vide n'est pas envoyé : un
 * département absent ne compte jamais pour 0. Toute la semaine part en un appel.
 */
export function FormulaireStatistiquesFij({ dimancheReference, statistiques, enregistrer }: Props) {
  const semaines = semainesProposees(dimancheReference, statistiques)
  const [dimanche, setDimanche] = useState(dimancheReference)
  const [champs, setChamps] = useState<ChampsStatistiques>(() =>
    champsStatistiques(statistiques, dimancheReference),
  )
  const [erreurs, setErreurs] = useState<ErreursStatistiques>({})
  const [aucuneValeur, setAucuneValeur] = useState(false)
  const envoi = useEnvoiSaisie()

  const choisirSemaine = (jour: DateIso) => {
    setDimanche(jour)
    setChamps(champsStatistiques(statistiques, jour))
    setErreurs({})
    setAucuneValeur(false)
  }

  const changer = (rubrique: RubriqueFij, departement: Departement) => (valeur: string) => {
    setChamps((precedents) => ({
      ...precedents,
      [rubrique]: { ...precedents[rubrique], [departement]: valeur },
    }))
    setErreurs((precedentes) => ({ ...precedentes, [`${rubrique}-${departement}`]: undefined }))
    setAucuneValeur(false)
  }

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (envoi.enCours) return
    const trouvees: ErreursStatistiques = {}
    let premier: string | null = null
    for (const { code: rubrique } of RUBRIQUES_FIJ) {
      for (const { code: departement } of DEPARTEMENTS_FIJ) {
        const erreur = erreurValeurFij(champs[rubrique][departement], false)
        if (!erreur) continue
        trouvees[`${rubrique}-${departement}`] = erreur
        premier ??= idChamp(rubrique, departement)
      }
    }
    setErreurs(trouvees)
    if (premier) {
      document.getElementById(premier)?.focus()
      return
    }
    const valeurs = valeursStatistiques(champs)
    if (valeurs.length === 0) {
      setAucuneValeur(true)
      return
    }
    await envoi.envoyer(
      () => enregistrer({ dimanche, valeurs }),
      messageReussiteStatistiques(dimanche),
    )
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stat-semaine" className="text-[15px] font-semibold">
          Semaine
        </label>
        <select
          id="stat-semaine"
          value={dimanche}
          onChange={(evenement) => choisirSemaine(evenement.target.value)}
          className="h-14 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre"
        >
          {semaines.map((semaine) => (
            <option key={semaine.dimanche} value={semaine.dimanche}>
              {semaine.libelle}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center">
        <p className="min-w-0 flex-1 text-[15px] leading-normal">
          Laissez vide un département sans chiffre : il ne compte pas pour 0.
        </p>
        <Aide code="fij.departements" libelle="Chiffres par département" />
      </div>
      {RUBRIQUES_FIJ.map((rubrique) => (
        <fieldset
          key={rubrique.code}
          className="flex min-w-0 flex-col gap-3 border-t-2 border-encre pt-3"
        >
          <legend className="float-left w-full font-lecture text-[22px] leading-tight font-medium">
            {statistiques.find((ligne) => ligne.rubrique === rubrique.code)?.rubrique_libelle ??
              rubrique.libelle}
          </legend>
          <div className="clear-both grid grid-cols-2 items-end gap-x-3 gap-y-4 min-[600px]:grid-cols-4">
            {DEPARTEMENTS_FIJ.map((departement) => (
              <ChampNombre
                key={departement.code}
                id={idChamp(rubrique.code, departement.code)}
                libelle={libelleDepartement(departement)}
                valeur={champs[rubrique.code][departement.code]}
                onChange={changer(rubrique.code, departement.code)}
                max={VALEUR_FIJ_MAX}
                variante="compact"
                erreur={erreurs[`${rubrique.code}-${departement.code}`]}
              />
            ))}
          </div>
          <p className="text-[15px] leading-normal font-semibold" aria-live="polite">
            {ligneTotalRubrique(champs[rubrique.code])}
          </p>
        </fieldset>
      ))}
      <BoutonEnregistrer libelle="Enregistrer les chiffres" enCours={envoi.enCours} />
      {aucuneValeur ? <ErreurFormulaire message={MESSAGES_FIJ.aucuneValeur} /> : null}
      {envoi.echec ? <ErreurFormulaire message={envoi.echec.message ?? undefined} /> : null}
      <MessageReussite
        message={envoi.reussite?.message ?? null}
        envoi={envoi.reussite?.envoi ?? 0}
      />
      <LienSignalement ecran="saisie_fij_statistiques" />
    </form>
  )
}
