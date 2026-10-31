#!/bin/zsh
# Nordic hearth: paint -> rebuild -> bake the realtime GLB -> split it into the web app's hearth/ folder
cd "$(dirname "$0")"
mkdir -p renders
python3 hearth_tex.py > renders/log_hearth_tex.txt 2>&1 || { echo "hearth_tex failed"; tail -5 renders/log_hearth_tex.txt; exit 1; }      # paint the textures (needs Pillow)
B=/Applications/Blender.app/Contents/MacOS/Blender
echo "start $(date +%T)"
PYTHONUNBUFFERED=1 $B -b --factory-startup --python build_hearth.py > renders/log_hearth_build.txt 2>&1; grep "BUILT\|Traceback" renders/log_hearth_build.txt
rm -rf realtime_hearth; t0=$(date +%s)
PYTHONUNBUFFERED=1 $B -b --factory-startup oracle_hearth.blend --python bake_hearth.py -- --size ${SIZE:-4096} --samples ${SAMPLES:-48} > realtime_hearth_log.txt 2>&1
echo "bake $(( $(date +%s) - t0 ))s"; grep "^\[\|Traceback\|Error:" realtime_hearth_log.txt | tail -16
# a new name for every bake, so browsers that saw the last one can't serve it from cache; the page is pointed at it
PRE=hearth_$(date +%m%d%H%M)
mkdir -p ../public/hearth; find ../public/hearth -name 'hearth_*' -delete; python3 glb_split.py realtime_hearth/oracle_hearth.glb ../public/hearth $PRE && ls -la ../public/hearth
sed -i '' "s/HEARTH_PRE = '[^']*'/HEARTH_PRE = '$PRE'/" ../src/_hearth.js && grep -o "HEARTH_PRE = '[^']*'" ../src/_hearth.js && (cd .. && python3 build.py > /dev/null && echo rebuilt)
echo "done $(date +%T)"
