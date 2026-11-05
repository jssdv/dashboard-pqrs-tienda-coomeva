#!/usr/bin/env bash
# Abre la app PQR a internet con un túnel de Cloudflare: URL HTTPS temporal, sin cuenta.
# Requiere cloudflared y que la app ya esté corriendo con PQR_PROXY=1 (ver README).
set -euo pipefail

PORT="${PORT:-3000}"
BASE="http://127.0.0.1:${PORT}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Falta cloudflared. Instálalo: brew install cloudflared  (Windows: winget install --id Cloudflare.cloudflared)" >&2
  exit 1
fi
if ! curl -fs -o /dev/null "${BASE}/api/auth/estado"; then
  echo "La app no responde en ${BASE}. Inícialla primero con: PQR_PROXY=1 npm start" >&2
  exit 1
fi

echo "Túnel hacia ${BASE}. Cuando aparezca https://....trycloudflare.com, cópiala en Compartir > URL pública."
echo "Cada vez que reinicies el túnel la dirección cambia: vuelve a copiarla."
exec cloudflared tunnel --no-autoupdate --url "${BASE}"
