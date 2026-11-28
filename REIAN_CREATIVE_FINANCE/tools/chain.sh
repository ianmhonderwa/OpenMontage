#!/usr/bin/env bash
# Build + package the remaining videos one after another; resumable (build.sh caches narration).
cd /home/user/OpenMontage/market-recap
for pair in RCF-02-AFRICA:video_02_african_markets RCF-03-LISTING-READY:video_03_listing_prerequisites RCF-04-PRIVATE-TO-PUBLIC:video_04_private_to_public RCF-05-IPO-VALUATION:video_05_ipo_and_valuation RCF-06-LIFE-AFTER-LISTING:video_06_life_after_listing; do
  EP=${pair%%:*}; SLUG=${pair##*:}
  if [ -f ../REIAN_CREATIVE_FINANCE/06_FINAL_VIDEOS/$SLUG.mp4 ]; then echo "SKIP $EP"; continue; fi
  echo "START $EP $(date -u +%T)"
  bash engine/build.sh $EP full > out/$EP.build.log 2>&1 && python3 ../REIAN_CREATIVE_FINANCE/tools/package.py $EP $SLUG && echo "DONE $EP $(date -u +%T)" || echo "FAIL $EP"
done
echo ALLDONE
