#!/bin/zsh
# tent: rebuild -> bake -> split straight into the web app's tent/ folder (no Cycles stills)
cd "$(dirname "$0")"
mkdir -p renders
B=/Applications/Blender.app/Contents/MacOS/Blender
echo "start $(date +%T)"
PYTHONUNBUFFERED=1 $B -b --factory-startup --python build_tent.py > renders/log_build.txt 2>&1; grep "BUILT\|Traceback" renders/log_build.txt
rm -rf realtime; t0=$(date +%s)
PYTHONUNBUFFERED=1 $B -b --factory-startup oracle_tent.blend --python bake_tent.py -- --size 4096 --samples 48 > realtime_log.txt 2>&1
echo "bake $(( $(date +%s) - t0 ))s"; grep "^\[\|Traceback\|Error:" realtime_log.txt | tail -8
# a new name for every bake, so browsers that saw the last one can't serve it from cache; the page is pointed at it
PRE=tent_$(date +%m%d%H%M)
rm -f ../public/tent/tent_*; python3 glb_split.py realtime/oracle_tent.glb ../public/tent $PRE && ls -la ../public/tent
sed -i '' "s/TENT_PRE = '[^']*'/TENT_PRE = '$PRE'/" ../src/_rooms.js && grep -o "TENT_PRE = '[^']*'" ../src/_rooms.js && (cd .. && python3 build.py > /dev/null && echo rebuilt)
echo "done $(date +%T)"
