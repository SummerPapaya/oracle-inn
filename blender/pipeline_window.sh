#!/bin/zsh
# moonlit window: paint -> rebuild -> bake the realtime GLB -> split it into the web app's window/ folder
cd "$(dirname "$0")"
mkdir -p renders
python3 window_tex.py > renders/log_window_tex.txt 2>&1 || { echo "window_tex failed"; tail -5 renders/log_window_tex.txt; exit 1; }      # paint the textures (needs Pillow)
B=/Applications/Blender.app/Contents/MacOS/Blender
echo "start $(date +%T)"
PYTHONUNBUFFERED=1 $B -b --factory-startup --python build_window.py > renders/log_window_build.txt 2>&1; grep "BUILT\|Traceback" renders/log_window_build.txt
rm -rf realtime_window; t0=$(date +%s)
PYTHONUNBUFFERED=1 $B -b --factory-startup oracle_window.blend --python bake_window.py -- --size ${SIZE:-4096} --samples ${SAMPLES:-48} > realtime_window_log.txt 2>&1
echo "bake $(( $(date +%s) - t0 ))s"; grep "^\[\|Traceback\|Error:" realtime_window_log.txt | tail -16
# a new name for every bake, so browsers that saw the last one can't serve it from cache; the page is pointed at it
PRE=window_$(date +%m%d%H%M)
mkdir -p ../public/window; find ../public/window -name 'window_*' -delete; python3 glb_split.py realtime_window/oracle_window.glb ../public/window $PRE && ls -la ../public/window
sed -i '' "s/WINDOW_PRE = '[^']*'/WINDOW_PRE = '$PRE'/" ../src/_window.js && grep -o "WINDOW_PRE = '[^']*'" ../src/_window.js && (cd .. && python3 build.py > /dev/null && echo rebuilt)
echo "done $(date +%T)"
