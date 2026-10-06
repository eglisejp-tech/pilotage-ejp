import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Aide } from '@/components/aide/Aide'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import { Compteur } from '@/features/saisie/Compteur'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { RappelDonneesPersonnelles } from '@/features/saisie/RappelDonneesPersonnelles'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { TEXTES_SIGNALEMENT } from '@/features/signalement/textes'

const champ = 'h-14 w-full min-w-0 border border-encre bg-papier px-3.5 text-base text-encre'
/** Le compteur du nom (80 caractères) paraît à partir de 60. */
const DEBUT_COMPTEUR = 60

/**
 * Aperçu de développement du panneau « Ajouter un événement » (maquette 11) : trois aides en
 * bulle « flux », le rappel sur les données personnelles sous le premier champ libre, le compteur
 * à partir de 60 caractères et le lien « Signaler une difficulté ». `?etat=refus` montre la date
 * refusée et l'erreur de formulaire. Sans base ni envoi, données d'exemple. Adresse :
 * /apercu/evenements. Les lots E5 et E6 le remplacent, en gardant les aides, car
 * `e2e/aide.spec.ts` s'appuie sur cette adresse. Enregistrée seulement en développement.
 */
export function ApercuEvenements() {
  const [parametres] = useSearchParams()
  const refus = parametres.get('etat') === 'refus'
  const [nom, setNom] = useState('')

  return (
    <>
      <title>Aperçu, Ajouter un événement, Pilotage EJP</title>
      <PanneauSaisie titre="Ajouter un événement" onFermer={() => undefined}>
        <form className="flex flex-col gap-5" onSubmit={(evenement) => evenement.preventDefault()}>
          <div className="flex flex-col gap-1.5">
            <LibelleAvecAide htmlFor="apercu-date" libelle="Date" code="evenement.date" />
            <input
              id="apercu-date"
              type="date"
              aria-invalid={refus ? true : undefined}
              aria-describedby={refus ? 'apercu-date-erreur' : undefined}
              className={`${champ} aria-invalid:border-2 aria-invalid:border-alerte`}
            />
            {refus ? (
              <p id="apercu-date-erreur" className="text-[15px] leading-normal text-alerte">
                {TEXTES_SIGNALEMENT.dateRefuseeAjout} {TEXTES_SIGNALEMENT.questionDate}{' '}
                <LienSignalement ecran="saisie_evenement" enLigne />
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="apercu-nom" className="text-[15px] font-semibold">
              Nom de l'événement
            </label>
            <input
              id="apercu-nom"
              type="text"
              value={nom}
              onChange={(evenement) => setNom(evenement.target.value)}
              aria-describedby={
                nom.length >= DEBUT_COMPTEUR
                  ? 'apercu-nom-rappel apercu-nom-compteur'
                  : 'apercu-nom-rappel'
              }
              className={champ}
            />
            <RappelDonneesPersonnelles id="apercu-nom-rappel" />
            <Compteur
              id="apercu-nom-compteur"
              valeur={nom.length}
              max={80}
              afficherDes={DEBUT_COMPTEUR}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <LibelleAvecAide htmlFor="apercu-statut" libelle="Statut" code="evenement.statut" />
            <select id="apercu-statut" className={champ} defaultValue="attente">
              <option value="prevu">Prévu</option>
              <option value="attente">En attente de validation</option>
              <option value="valide">Validé</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
          {/* Un groupe de cases : son titre n'est pas un <label> (il n'a pas un seul champ) ni
              une <legend> (son nom garderait « Aide : ... »). Le groupe le lit par aria-labelledby. */}
          <fieldset aria-labelledby="apercu-mentions-titre" className="flex flex-col gap-1.5">
            <div className="flex min-h-cible flex-wrap items-center">
              <p id="apercu-mentions-titre" className="text-[15px] font-semibold">
                Ministères mentionnés
              </p>
              <Aide code="evenement.mentions" libelle="Ministères mentionnés" />
            </div>
            <label className="inline-flex min-h-cible items-center gap-3 text-base">
              <input type="checkbox" className="size-5" />
              Coordination
            </label>
            <p className="text-sm text-encre-3">
              Le ministère mentionné verra cet événement, et seulement cet événement.
            </p>
          </fieldset>
          <button
            type="submit"
            className="min-h-14.5 w-full bg-lumiere px-4 text-[17px] font-bold text-encre"
          >
            Ajouter l'événement
          </button>
          {refus ? <ErreurFormulaire objet="message" /> : null}
          <LienSignalement ecran="saisie_evenement" />
        </form>
      </PanneauSaisie>
    </>
  )
}
