#!/bin/bash
# Render the composition in chunks with HyperFrames (CRF 18, 30 fps).
cd "$(dirname "$0")"
B=(0 52 126 175 262 311 403)
for i in 0 1 2 3 4 5; do
  out=renders/chunks/c$i.mp4
  [ -s "$out" ] && continue
  s=${B[$i]}; e=${B[$((i+1))]}
  echo "chunk $i: $s-$e start $(date +%T)"
  npx hyperframes render hf --start $s --end $e --fps 30 --crf 18 --quiet -o "$out" > renders/chunks/c$i.log 2>&1 || { echo "chunk $i FAILED"; tail -5 renders/chunks/c$i.log; exit 1; }
  echo "chunk $i done $(date +%T) $(ffprobe -v error -show_entries format=duration -of csv=p=0 $out)"
done
echo ALL_DONE
