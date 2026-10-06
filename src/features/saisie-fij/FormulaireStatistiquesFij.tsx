import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LigneStatistiqueFij } from '@/data/fij'
import { ChampNombre } from '@/features/saisie/ChampNombre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import {
  champsStatistiques,
  ligneTotalRubrique,
  messageReussiteStatistiques,
  messageValeurEffacee,
  semainesProposees,
  valeursEffacees,
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
import { LigneAvecAide } from '@/features/saisie-session/LigneAvecAide'
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

type CleChamp = `${RubriqueFij}-${Departement}`
type ErreursStatistiques = Partial<Record<CleChamp, string>>

const idChamp = (rubrique: RubriqueFij, departement: Departement) =>
  `stat-${rubrique}-${departement}`

/**
 * Chiffres par département (dérivé de 08, ministère `fij` seulement ; BRIEF section 9) : la
 * semaine, puis les quatre rubriques, une par section, chacune avec ses 8 départements et son
 * total en direct (« Total : 58, 6 dép. sur 8 »). Un champ vide n'est pas envoyé : un
 * département absent ne compte jamais pour 0. Toute la semaine part en un appel. Une valeur déjà
 * enregistrée ne s'efface pas (ajout seulement) : la vider bloque l'envoi et le dit.
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
  const valeurs = valeursStatistiques(champs)
  const signature = `${dimanche}|${valeurs.map((v) => `${v.rubrique}:${v.departement}:${v.valeur}`).join(',')}`
  const effacees = valeursEffacees(champs, statistiques, dimanche)

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
    // Une valeur enregistrée puis vidée n'est pas retirée par un envoi : la base garde la dernière
    // saisie. L'envoi attend un 0 ou la bonne valeur, sinon le total resterait faux sans rien dire.
    for (const { rubrique, departement, valeur } of effacees) {
      trouvees[`${rubrique}-${departement}`] = messageValeurEffacee(valeur)
      premier ??= idChamp(rubrique, departement)
    }
    setErreurs(trouvees)
    if (premier) {
      document.getElementById(premier)?.focus()
      return
    }
    if (valeurs.length === 0) {
      setAucuneValeur(true)
      return
    }
    await envoi.envoyer(
      () => enregistrer({ dimanche, valeurs }),
      messageReussiteStatistiques(dimanche),
      signature,
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
      <LigneAvecAide code="fij.departements" libelle="Chiffres par département">
        Laissez vide un département sans chiffre : il ne compte pas pour 0. Un chiffre déjà
        enregistré se corrige, il ne s'efface pas.
      </LigneAvecAide>
      {RUBRIQUES_FIJ.map((rubrique) => (
        <fieldset
          key={rubrique.code}
          className="flex min-w-0 flex-col gap-3 border-t-2 border-encre pt-3"
        >
          <legend className="float-left w-full font-lecture text-[22px] leading-tight font-medium">
            {statistiques.find((ligne) => ligne.rubrique === rubrique.code)?.rubrique_libelle ??
              rubrique.libelle}
          </legend>
          <div className="clear-both grid grid-cols-2 items-start gap-x-3 gap-y-4 min-[600px]:grid-cols-4">
            {DEPARTEMENTS_FIJ.map((departement) => {
              const cle: CleChamp = `${rubrique.code}-${departement.code}`
              const effacee = effacees.find(
                (ligne) =>
                  ligne.rubrique === rubrique.code && ligne.departement === departement.code,
              )
              return (
                <ChampNombre
                  key={departement.code}
                  id={idChamp(rubrique.code, departement.code)}
                  libelle={libelleDepartement(departement)}
                  valeur={champs[rubrique.code][departement.code]}
                  onChange={changer(rubrique.code, departement.code)}
                  max={VALEUR_FIJ_MAX}
                  variante="compact"
                  erreur={erreurs[cle]}
                  note={effacee && !erreurs[cle] ? messageValeurEffacee(effacee.valeur) : undefined}
                />
              )
            })}
          </div>
          <p className="text-[15px] leading-normal font-semibold" aria-live="polite">
            {ligneTotalRubrique(champs[rubrique.code])}
          </p>
        </fieldset>
      ))}
      <BoutonEnregistrer
        libelle="Enregistrer les chiffres"
        enCours={envoi.enCours}
        dejaEnvoye={envoi.dejaEnvoye(signature)}
        doublon={envoi.doublonRefuse(signature)}
      />
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
