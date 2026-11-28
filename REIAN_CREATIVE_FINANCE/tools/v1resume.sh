#!/usr/bin/env bash
cd /home/user/OpenMontage/market-recap && bash engine/build.sh RCF-01-USA-EUROPE full >> out/RCF-01-USA-EUROPE.build2.log 2>&1 && python3 ../REIAN_CREATIVE_FINANCE/tools/package.py RCF-01-USA-EUROPE video_01_usa_europe && echo V1REDONE || echo V1FAIL
