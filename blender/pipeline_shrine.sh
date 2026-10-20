#!/bin/zsh
# shrine: rebuild -> bake the realtime GLB -> split it into the web app's shrine/ folder
cd "$(dirname "$0")"
mkdir -p renders
python3 shrine_tex.py > renders/log_shrine_tex.txt 2>&1 || { echo "shrine_tex failed"; tail -5 renders/log_shrine_tex.txt; exit 1; }      # paint the textures (needs Pillow)
B=/Applications/Blender.app/Contents/MacOS/Blender
echo "start $(date +%T)"
PYTHONUNBUFFERED=1 $B -b --factory-startup --python build_shrine.py > renders/log_shrine_build.txt 2>&1; grep "BUILT\|Traceback" renders/log_shrine_build.txt
rm -rf realtime_shrine; t0=$(date +%s)
PYTHONUNBUFFERED=1 $B -b --factory-startup oracle_shrine.blend --python bake_shrine.py -- --size ${SIZE:-4096} --samples ${SAMPLES:-48} > realtime_shrine_log.txt 2>&1
echo "bake $(( $(date +%s) - t0 ))s"; grep "^\[\|Traceback\|Error:" realtime_shrine_log.txt | tail -16
# a new name for every bake, so browsers that saw the last one can't serve it from cache; the page is pointed at it
PRE=shrine_$(date +%m%d%H%M)
rm -f ../public/shrine/shrine_*; python3 glb_split.py realtime_shrine/oracle_shrine.glb ../public/shrine $PRE && ls -la ../public/shrine
sed -i '' "s/SHRINE_PRE = '[^']*'/SHRINE_PRE = '$PRE'/" ../src/_rooms.js && grep -o "SHRINE_PRE = '[^']*'" ../src/_rooms.js && (cd .. && python3 build.py > /dev/null && echo rebuilt)
echo "done $(date +%T)"
