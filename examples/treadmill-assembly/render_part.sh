#!/bin/bash
# Usage: render_part.sh name:start:end ...  (skips finished parts)
cd "$(dirname "$0")"
for spec in "$@"; do
  IFS=: read n s e <<< "$spec"; out=renders/chunks/$n.mp4
  [ -s "$out" ] && continue
  echo "$n: $s-$e start $(date +%T)"
  npx hyperframes render hf --start $s --end $e --fps 30 --crf 18 --quiet -o "$out" > renders/chunks/$n.log 2>&1 || { echo "$n FAILED"; tail -5 renders/chunks/$n.log; rm -f "$out"; exit 1; }
  echo "$n done $(date +%T) $(ffprobe -v error -show_entries format=duration -of csv=p=0 $out)"
done
echo PART_DONE
