#!/bin/sh
# Arma la carpeta publicable (_site) y sustituye la URL canónica.
# Para pasar al dominio propio, edite un solo archivo: landing/site-origin.txt
# (por ejemplo: https://seid.com.bo) y vuelva a desplegar.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ORIGIN=$(tr -d ' \t\r\n' < "$ROOT/landing/site-origin.txt")
ORIGIN=${ORIGIN%/}
DEST=${1:-"$ROOT/_site"}

if [ -z "$ORIGIN" ]; then
  echo "landing/site-origin.txt está vacío" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST/app"
cp -a "$ROOT/landing/." "$DEST/"
# La URL canónica no debe quedar como marcador en el sitio publicado.
find "$DEST" -type f \( \
    -name '*.html' -o -name '*.xml' -o -name '*.txt' -o \
    -name '*.js' -o -name '*.json' -o -name '*.css' \
  \) -print | while IFS= read -r f; do
  if grep -q '__SITE_ORIGIN__' "$f" 2>/dev/null; then
    sed -i "s|__SITE_ORIGIN__|${ORIGIN}|g" "$f"
  fi
done

if [ -d "$ROOT/app/demo" ]; then
  cp -a "$ROOT/app/demo/." "$DEST/app/"
fi
touch "$DEST/.nojekyll"
echo "Sitio armado en $DEST (origen: $ORIGIN)"
