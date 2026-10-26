#!/usr/bin/env bash
# Fonctions de l'export chiffré par clé publique (T77, docs/conception/export-chiffre.md),
# partagées par l'action « export » de scripts/production.sh, par restaurer.sh, empreintes.sh et
# l'essai de la CI (essai-restauration.sh). Ce fichier se charge par « source » ; seul, il ne
# lance rien.
#
# Règles tenues ici :
#   - le clair ne touche jamais le disque : pg_dump écrit vers age, en flux ;
#   - les identifiants temporaires de la base vivent dans des variables du script (ident_*),
#     jamais à l'écran, jamais dans un fichier, jamais dans les arguments d'un programme ;
#   - la sortie ne dit que la forme du fichier : nom, taille, empreinte, nombre de tables ;
#   - tout écart arrête le script (« Arrêt : ... »), sans rien garder.

set -o pipefail

EXPORT_MOTIF_NOM='^ejp-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}\.dump\.age$'
EXPORT_JOURS_GARDES=28
EXPORT_TAILLE_MIN=10240
EXPORT_CLE_ATTENTE='en-attente-de-la-cle-publique'
EXPORT_ENTETE_AGE='age-encryption.org/v1'

export_arreter() {
  echo "Arrêt : $1" >&2
  exit 1
}

# Date de Paris calculée par node (Git Bash ignore TZ=Europe/Paris). $1 : horodatage (AAAA-MM-JJ-HHMM),
# jour (AAAA-MM-JJ) ou seuil (jour de Paris moins EXPORT_JOURS_GARDES jours). $2 facultatif : un
# instant ISO, pour les tests.
export__date() {
  node -e '
const [mode, instant, jours] = process.argv.slice(1);
const d = instant ? new Date(instant) : new Date();
if (Number.isNaN(d.getTime())) process.exit(2);
const p = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]),
);
const jour = `${p.year}-${p.month}-${p.day}`;
if (mode === "horodatage") console.log(`${jour}-${p.hour}${p.minute}`);
else if (mode === "jour") console.log(jour);
else if (mode === "seuil") {
  const s = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - Number(jours)));
  console.log(s.toISOString().slice(0, 10));
} else process.exit(2);
' "$1" "${2:-}" "$EXPORT_JOURS_GARDES" || export_arreter "date de Paris illisible."
}

export_date_paris() { export__date horodatage "${1:-}"; }
export_jour_paris() { export__date jour "${1:-}"; }

# Lignes d'un texte, sans here-string : bash écrirait un gros here-string dans un fichier
# temporaire, et le texte lu ici peut contenir un mot de passe.
export__lignes() {
  local reste=$1
  EXPORT_LIGNES=()
  while [ -n "$reste" ]; do
    if [[ $reste == *$'\n'* ]]; then
      EXPORT_LIGNES+=("${reste%%$'\n'*}")
      reste=${reste#*$'\n'}
    else
      EXPORT_LIGNES+=("$reste")
      reste=""
    fi
  done
}

# Clé publique des exports : texte du fichier scripts/export/destinataires.txt en $1. Lignes vides
# et lignes « # » ignorées ; exactement une clé age (X25519) ; la valeur d'attente est refusée.
export_lire_cle() {
  local ligne cle="" n=0
  export__lignes "$1"
  for ligne in "${EXPORT_LIGNES[@]}"; do
    ligne=${ligne%$'\r'}
    ligne=${ligne#"${ligne%%[![:space:]]*}"}
    ligne=${ligne%"${ligne##*[![:space:]]}"}
    case $ligne in '' | '#'*) continue ;; esac
    [ "$ligne" != "$EXPORT_CLE_ATTENTE" ] ||
      export_arreter "la clé publique des exports est encore la valeur d'attente : la personne crée sa paire de clés et donne la clé publique (gestes G2 à G4, docs/exploitation.md, section 9.2)."
    n=$((n + 1))
    cle=$ligne
  done
  [ "$n" -eq 1 ] ||
    export_arreter "le fichier des destinataires doit contenir exactement une clé publique (trouvé : $n)."
  [[ $cle =~ ^age1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$ ]] ||
    export_arreter "la clé publique des exports n'est pas une clé age valide."
  echo "$cle"
}

# Identifiants temporaires : sortie de l'essai à blanc de la CLI en $1 (db dump --dry-run, qui
# imprime « export PGHOST="..." » ... « export PGPASSWORD="..." »). Chaque ligne exactement une
# fois, sans eval ; remplit ident_hote, ident_port, ident_utilisateur, ident_mot_de_passe,
# ident_base. N'affiche jamais rien de la sortie.
export_lire_identifiants() {
  local ligne nom valeur
  local -A vus=()
  ident_hote="" ident_port="" ident_utilisateur="" ident_mot_de_passe="" ident_base=""
  export__lignes "$1"
  for ligne in "${EXPORT_LIGNES[@]}"; do
    ligne=${ligne%$'\r'}
    [[ $ligne =~ ^export\ (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)=\"(.*)\"$ ]] || continue
    nom=${BASH_REMATCH[1]}
    valeur=${BASH_REMATCH[2]//\\\"/\"}
    vus[$nom]=$((${vus[$nom]:-0} + 1))
    case $nom in
      PGHOST) ident_hote=$valeur ;;
      PGPORT) ident_port=$valeur ;;
      PGUSER) ident_utilisateur=$valeur ;;
      PGPASSWORD) ident_mot_de_passe=$valeur ;;
      PGDATABASE) ident_base=$valeur ;;
    esac
  done
  EXPORT_LIGNES=()
  for nom in PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE; do
    if [ "${vus[$nom]:-0}" -ne 1 ]; then
      export_effacer_identifiants
      export_arreter "identifiants temporaires introuvables dans l'essai à blanc de la CLI (ligne $nom absente ou en double, sortie non affichée) : option B nécessaire (docs/conception/export-chiffre.md, 4.3)."
    fi
  done
  if [ -z "$ident_hote" ] || [ -z "$ident_utilisateur" ] || [ -z "$ident_mot_de_passe" ]; then
    export_effacer_identifiants
    export_arreter "identifiants temporaires vides dans l'essai à blanc de la CLI (sortie non affichée) : option B nécessaire (docs/conception/export-chiffre.md, 4.3)."
  fi
}

export_effacer_identifiants() {
  ident_hote="" ident_port="" ident_utilisateur="" ident_mot_de_passe="" ident_base=""
}

# Outil de l'export : $EXPORT_OUTILS/age/<nom>.exe, $EXPORT_OUTILS/pgsql/bin/<nom>.exe (binaires
# portables du poste, section 9.2), $EXPORT_PG_BIN/<nom> (CI), puis le PATH.
export_trouver_outil() {
  local nom=$1 chemin candidats=()
  if [ -n "${EXPORT_OUTILS:-}" ]; then
    candidats+=("$EXPORT_OUTILS/age/$nom.exe" "$EXPORT_OUTILS/pgsql/bin/$nom.exe")
  fi
  if [ -n "${EXPORT_PG_BIN:-}" ]; then candidats+=("$EXPORT_PG_BIN/$nom"); fi
  for chemin in "${candidats[@]}"; do
    if [ -f "$chemin" ]; then
      echo "$chemin"
      return 0
    fi
  done
  if chemin=$(command -v "$nom" 2>/dev/null); then
    echo "$chemin"
    return 0
  fi
  export_arreter "outil absent : $nom (docs/exploitation.md, section 9.2, installation des outils)."
}

# Majeure de PostgreSQL de la base : supabase/.temp/postgres-version du dossier $1 (écrit par la
# CLI au lien), sinon major_version de supabase/config.toml.
export_majeure_base() {
  local v=""
  if [ -f "$1/supabase/.temp/postgres-version" ]; then
    v=$(head -n 1 "$1/supabase/.temp/postgres-version")
  fi
  if [[ $v =~ ^([0-9]+)\. ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  v=$(sed -n 's/^major_version *= *\([0-9][0-9]*\).*/\1/p' "$1/supabase/config.toml" 2>/dev/null | head -n 1)
  [ -n "$v" ] || export_arreter "majeure de PostgreSQL de la base introuvable."
  echo "$v"
}

# pg_dump ($1) de la majeure de la base ($2) exactement. Affiche sa version.
export_verifier_pg_dump() {
  local version
  version=$("$1" --version 2>/dev/null | head -n 1) || export_arreter "pg_dump ne répond pas ($1)."
  [[ $version =~ \(PostgreSQL\)\ ([0-9]+)\. ]] || export_arreter "version de pg_dump illisible."
  [ "${BASH_REMATCH[1]}" = "$2" ] ||
    export_arreter "pg_dump ${BASH_REMATCH[1]} alors que la base est en PostgreSQL $2 : installer le client $2 (docs/exploitation.md, section 9.2)."
  echo "$version"
}

# age ($1) en version 1.x. Affiche sa version.
export_verifier_age() {
  local version
  version=$("$1" --version 2>/dev/null | head -n 1) || export_arreter "age ne répond pas ($1)."
  [[ $version =~ ^v?1\.[0-9]+ ]] ||
    export_arreter "version d'age inattendue ($version) : 1.x attendue (docs/exploitation.md, section 9.2)."
  echo "age $version"
}

# Erreurs utiles d'un journal (entrée standard) : 10 lignes au plus, 200 caractères au plus,
# mots de passe et adresses de connexion masqués.
export_filtrer_erreurs() {
  grep -E -i 'error|erreur|fatal|could not|impossible|failed|échec|detail|détail' |
    grep -v -E 'dumping contents of table|contenu de la table' |
    sed -E -e 's/(pgpassword|password|mot de passe)( *[=:] *)[^ ]+/\1\2***/Ig' \
      -e 's#postgres(ql)?://[^ ]+#postgresql://***#Ig' |
    cut -c 1-200 | head -n 10 || true
}

# Export en flux des schémas public et private vers age. $1 dossier, $2 nom final, $3 clé
# publique, $4 pg_dump, $5 age. Identifiants : ident_* (export_lire_identifiants).
# Remplit EXPORT_TAILLE, EXPORT_SHA256 et EXPORT_TABLES. Écrit d'abord <nom>.partiel (déjà chiffré),
# renommé seulement si tous les contrôles passent ; sinon rien n'est gardé.
export_flux() {
  local dossier=$1 nom=$2 cle=$3 pg_dump=$4 age=$5
  [ ! -e "$dossier/$nom" ] || export_arreter "$nom existe déjà dans $dossier."
  EXPORT_PARTIEL="$dossier/$nom.partiel"
  EXPORT_JOURNAL=$(mktemp)
  trap 'rm -f -- "$EXPORT_PARTIEL" "$EXPORT_JOURNAL"' EXIT
  trap 'exit 130' INT TERM
  if ! LC_ALL=C LC_MESSAGES=C PGHOST="$ident_hote" PGPORT="$ident_port" PGUSER="$ident_utilisateur" \
    PGPASSWORD="$ident_mot_de_passe" PGDATABASE="$ident_base" PGSSLMODE="${EXPORT_SSLMODE:-require}" \
    PGCONNECT_TIMEOUT=30 PGAPPNAME=export-ejp \
    "$pg_dump" --format=custom --schema=public --schema=private --no-owner --no-privileges \
    --role=postgres --verbose 2>"$EXPORT_JOURNAL" |
    "$age" -e -r "$cle" -o "$EXPORT_PARTIEL" 2>>"$EXPORT_JOURNAL"; then
    echo "Arrêt : export incomplet, aucun fichier gardé." >&2
    export_filtrer_erreurs <"$EXPORT_JOURNAL" >&2
    exit 1
  fi
  EXPORT_TAILLE=$(wc -c <"$EXPORT_PARTIEL" | tr -d ' ')
  [ "$EXPORT_TAILLE" -ge "$EXPORT_TAILLE_MIN" ] ||
    export_arreter "export trop petit ($EXPORT_TAILLE octets), aucun fichier gardé."
  [ "$(head -n 1 "$EXPORT_PARTIEL")" = "$EXPORT_ENTETE_AGE" ] ||
    export_arreter "le fichier produit n'a pas l'en-tête d'age, aucun fichier gardé."
  EXPORT_TABLES=$(grep -c -E 'dumping contents of table|contenu de la table' "$EXPORT_JOURNAL" || true)
  [ "$EXPORT_TABLES" -ge 1 ] || export_arreter "aucune table au sommaire de l'export, aucun fichier gardé."
  mv -- "$EXPORT_PARTIEL" "$dossier/$nom"
  EXPORT_SHA256=$(sha256sum "$dossier/$nom" | cut -d ' ' -f 1)
  rm -f -- "$EXPORT_JOURNAL"
  trap - EXIT INT TERM
}

# Restes d'un export tué sans nettoyage : fichiers .partiel du dossier $1 (déjà chiffrés).
export_nettoyer_partiels() {
  local fichier
  for fichier in "$1"/ejp-*.dump.age.partiel; do
    if [ -f "$fichier" ]; then rm -f -- "$fichier"; fi
  done
}

# Purge, après un export réussi : exports du dossier $1 de plus de EXPORT_JOURS_GARDES jours (date
# du nom, heure de Paris) et leur fiche ; jamais le plus récent ; aucun autre fichier. $2 : instant
# ISO facultatif (tests). Remplit EXPORT_SUPPRIMES et EXPORT_GARDES.
export_purger() {
  local dossier=$1 seuil fichier nom plus_recent="" tous=()
  seuil=$(export__date seuil "${2:-}")
  for fichier in "$dossier"/ejp-*.dump.age; do
    nom=${fichier##*/}
    if [[ $nom =~ $EXPORT_MOTIF_NOM ]] && [ -f "$fichier" ]; then tous+=("$nom"); fi
  done
  if [ ${#tous[@]} -gt 0 ]; then plus_recent=$(printf '%s\n' "${tous[@]}" | sort | tail -n 1); fi
  EXPORT_SUPPRIMES=0
  EXPORT_GARDES=0
  for nom in "${tous[@]}"; do
    if [[ ${nom:4:10} < $seuil ]] && [ "$nom" != "$plus_recent" ]; then
      rm -f -- "$dossier/$nom" "$dossier/${nom%.dump.age}.json"
      EXPORT_SUPPRIMES=$((EXPORT_SUPPRIMES + 1))
    else
      EXPORT_GARDES=$((EXPORT_GARDES + 1))
    fi
  done
}

# Vrai si un export complet (non vide) daté d'aujourd'hui, heure de Paris, est dans le dossier $1.
# $2 : instant ISO facultatif (tests).
export_existe_aujourdhui() {
  local jour fichier
  jour=$(export__date jour "${2:-}") || return 1
  [ -n "$jour" ] || return 1
  for fichier in "$1"/ejp-"$jour"-[0-9][0-9][0-9][0-9].dump.age; do
    if [ -f "$fichier" ] && [ -s "$fichier" ]; then return 0; fi
  done
  return 1
}

# Dernière migration appliquée, lue dans la sortie de « migration list » ($1) : la plus grande
# version de 14 chiffres de la colonne Remote, sinon « inconnue ».
export_derniere_migration() {
  printf '%s\n' "$1" | awk -F'|' '
    { v = $2; gsub(/[ \t\r]/, "", v); if (v ~ /^[0-9]+$/ && length(v) == 14 && v > m) m = v }
    END { if (m == "") print "inconnue"; else print m }'
}

# Fiche en clair, sans aucune donnée, à côté de l'export : $1 dossier, $2 nom, $3 clé publique,
# $4 commit de main, $5 dernière migration, $6 version de pg_dump, $7 version d'age, $8 version de
# la CLI. Utilise EXPORT_TAILLE, EXPORT_SHA256, EXPORT_TABLES.
export_ecrire_fiche() {
  node -e '
const [fichier, horodatage, taille, sha256, tables, cle, commit, migration, pgDump, age, cli] =
  process.argv.slice(1);
const fiche = {
  fichier, horodatage_paris: horodatage, taille_octets: Number(taille), sha256,
  tables: Number(tables), cle_publique: cle, commit_main: commit, derniere_migration: migration,
  pg_dump: pgDump, age, cli_supabase: cli,
  contenu: "public et private, structure et donnees, sans droits ni proprietaires (pg_dump --format=custom)",
};
process.stdout.write(JSON.stringify(fiche, null, 2) + "\n");
' "$2" "${2:4:15}" "$EXPORT_TAILLE" "$EXPORT_SHA256" "$EXPORT_TABLES" "$3" "$4" "$5" "$6" "$7" "$8" \
    >"$1/${2%.dump.age}.json"
}

# Les sept lignes que Claude voit après un export : $1 nom, $2 clé publique, $3 dernière migration.
export_resume() {
  echo "Export chiffré : $1"
  echo "Taille : $EXPORT_TAILLE octets ($(((EXPORT_TAILLE + 1023) / 1024)) Kio)"
  echo "Empreinte SHA-256 : $EXPORT_SHA256"
  echo "Sommaire : $EXPORT_TABLES tables exportées"
  echo "Clé : ${2:0:10}...${2: -6}"
  echo "Dernière migration en production : $3"
  echo "Exports gardés : $EXPORT_GARDES ($EXPORT_SUPPRIMES supprimé(s), plus vieux que $EXPORT_JOURS_GARDES jours)"
}

# Vérifie qu'un résumé (entrée standard) n'a que les sept lignes autorisées, dans l'ordre.
export_verifier_resume() {
  local motifs=(
    '^Export chiffré : ejp-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}\.dump\.age$'
    '^Taille : [0-9]+ octets \([0-9]+ Kio\)$'
    '^Empreinte SHA-256 : [0-9a-f]{64}$'
    '^Sommaire : [0-9]+ tables exportées$'
    '^Clé : age1[a-z0-9]{6}\.\.\.[a-z0-9]{6}$'
    '^Dernière migration en production : ([0-9]{14}|inconnue)$'
    '^Exports gardés : [0-9]+ \([0-9]+ supprimé\(s\), plus vieux que [0-9]+ jours\)$'
  )
  local lignes=() ligne i
  while IFS= read -r ligne; do lignes+=("$ligne"); done
  [ ${#lignes[@]} -eq ${#motifs[@]} ] ||
    export_arreter "le résumé a ${#lignes[@]} lignes, ${#motifs[@]} attendues."
  for i in "${!motifs[@]}"; do
    [[ ${lignes[$i]} =~ ${motifs[$i]} ]] || export_arreter "ligne $((i + 1)) du résumé non autorisée."
  done
}

# Base Supabase locale (Docker) : nom du seul conteneur supabase_db_* qui tourne.
export_conteneur_base() {
  local noms
  command -v docker >/dev/null 2>&1 ||
    export_arreter "docker introuvable : la restauration se fait dans la pile Supabase locale."
  noms=$(docker ps --filter 'name=^supabase_db_' --format '{{.Names}}')
  [ -n "$noms" ] || export_arreter "base locale arrêtée : lancer npx supabase start (ou db start)."
  [ "$(printf '%s\n' "$noms" | wc -l)" -eq 1 ] ||
    export_arreter "plusieurs bases Supabase locales tournent : n'en garder qu'une."
  echo "$noms"
}

# psql dans le conteneur de la base locale ($1), mot de passe local par défaut de la CLI (pas un
# secret). Sans -i : l'entrée standard n'est pas transmise.
export_psql_local() {
  local base=$1
  shift
  docker exec -e PGPASSWORD=postgres "$base" psql -X -h 127.0.0.1 -p 5432 -U postgres -d postgres "$@"
}
