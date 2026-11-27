#!/bin/bash
# Concatenate rendered parts in time order and mux the loudness-normalised soundtrack.
set -e; cd "$(dirname "$0")"
P="c0 c1 c2 c3 c4 c5a c5b c6a1 c6a2 c6b c7a1 c7a2 c7b1 c7b2"
: > renders/concat.txt
for p in $P; do [ -s renders/chunks/$p.mp4 ] || { echo "missing $p"; exit 1; }; echo "file 'chunks/$p.mp4'" >> renders/concat.txt; done
mkdir -p renders/ts; for p in $P; do ffmpeg -v error -y -i renders/chunks/$p.mp4 -c copy -bsf:v h264_mp4toannexb -f mpegts renders/ts/$p.ts; done
ffmpeg -v error -y -i "concat:$(for p in $P; do printf "renders/ts/%s.ts|" $p; done | sed "s/|$//")" -c copy -fflags +genpts -r 30 renders/video_only.mp4
ffmpeg -v error -y -i renders/video_only.mp4 -i assets/audio/final_mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart renders/CUMSM506_Manual_Treadmill_Build.mp4
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_frames -of compact renders/CUMSM506_Manual_Treadmill_Build.mp4
