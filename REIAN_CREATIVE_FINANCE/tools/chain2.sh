#!/usr/bin/env bash
# Wait for chain.sh, then re-render Video 1 with the caption/kicker fixes and re-package it.
cd /home/user/OpenMontage
until grep -q ALLDONE REIAN_CREATIVE_FINANCE/09_QUALITY_CONTROL/chain.log; do sleep 30; done
cd market-recap && rm -rf out/RCF-01-USA-EUROPE/chunks out/RCF-01-USA-EUROPE/RCF-01-USA-EUROPE_*.mp4 && bash engine/build.sh RCF-01-USA-EUROPE full > out/RCF-01-USA-EUROPE.build2.log 2>&1 && python3 ../REIAN_CREATIVE_FINANCE/tools/package.py RCF-01-USA-EUROPE video_01_usa_europe && echo V1REDONE || echo V1FAIL
