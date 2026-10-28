#!/bin/zsh
# tea room: paint -> rebuild -> bake the realtime GLB -> split it into the web app's tea/ folder
cd "$(dirname "$0")"
mkdir -p renders
python3 tea_tex.py > renders/log_tea_tex.txt 2>&1 || { echo "tea_tex failed"; tail -5 renders/log_tea_tex.txt; exit 1; }      # paint the textures (needs Pillow)
B=/Applications/Blender.app/Contents/MacOS/Blender
echo "start $(date +%T)"
PYTHONUNBUFFERED=1 $B -b --factory-startup --python build_tea.py > renders/log_tea_build.txt 2>&1; grep "BUILT\|Traceback" renders/log_tea_build.txt
rm -rf realtime_tea; t0=$(date +%s)
PYTHONUNBUFFERED=1 $B -b --factory-startup oracle_tea.blend --python bake_tea.py -- --size ${SIZE:-4096} --samples ${SAMPLES:-48} > realtime_tea_log.txt 2>&1
echo "bake $(( $(date +%s) - t0 ))s"; grep "^\[\|Traceback\|Error:" realtime_tea_log.txt | tail -16
# a new name for every bake, so browsers that saw the last one can't serve it from cache; the page is pointed at it
PRE=tea_$(date +%m%d%H%M)
mkdir -p ../public/tea; find ../public/tea -name 'tea_*' -delete; python3 glb_split.py realtime_tea/oracle_tea.glb ../public/tea $PRE && ls -la ../public/tea
sed -i '' "s/TEA_PRE = '[^']*'/TEA_PRE = '$PRE'/" ../src/_tea.js && grep -o "TEA_PRE = '[^']*'" ../src/_tea.js && (cd .. && python3 build.py > /dev/null && echo rebuilt)
echo "done $(date +%T)"
