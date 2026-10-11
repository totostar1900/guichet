#!/usr/bin/env bash
# Enchaîne les tours de reprise de l'arriéré, un par un.
#
# Mesuré le 11 octobre 2026 : une séance demande environ dix secondes, pas
# quatre, donc soixante par tour dépassent les trois cents secondes de la
# fonction et elle est tuée. Le travail déjà fait est GARDÉ (chaque séance
# s'écrit pour elle-même), mais le tour ne rend pas son compte rendu.
#
# Vingt-cinq par tour tiennent avec de la marge. On s'arrête dès que l'arriéré
# ne descend plus : c'est le signe que ce qui reste ne se répare pas en
# relisant.
set -u
cd /c/dev/guichet
S=$(grep -oP '^CRON_SECRET=\K.*' .env.local | tr -d '"'"'"' \r')
U="https://guichet.purposecapital.africa"

for tour in $(seq 1 12); do
  echo "=== tour $tour ==="
  curl -s --max-time 310 -H "authorization: Bearer $S" "$U/api/cron/boc?arriere=1&n=25" | head -c 400
  echo ""
  sleep 5
done
