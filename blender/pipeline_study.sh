#!/bin/zsh
# study: paint -> rebuild -> bake the realtime GLB -> split it into the web app's study/ folder
cd "$(dirname "$0")"
mkdir -p renders
python3 study_tex.py > renders/log_study_tex.txt 2>&1 || { echo "study_tex failed"; tail -5 renders/log_study_tex.txt; exit 1; }      # paint the textures (needs Pillow)
B=/Applications/Blender.app/Contents/MacOS/Blender
echo "start $(date +%T)"
PYTHONUNBUFFERED=1 $B -b --factory-startup --python build_study.py > renders/log_study_build.txt 2>&1; grep "BUILT\|Traceback" renders/log_study_build.txt
rm -rf realtime_study; t0=$(date +%s)
PYTHONUNBUFFERED=1 $B -b --factory-startup oracle_study.blend --python bake_study.py -- --size ${SIZE:-4096} --samples ${SAMPLES:-48} > realtime_study_log.txt 2>&1
echo "bake $(( $(date +%s) - t0 ))s"; grep "^\[\|Traceback\|Error:" realtime_study_log.txt | tail -16
# a new name for every bake, so browsers that saw the last one can't serve it from cache; the page is pointed at it
PRE=study_$(date +%m%d%H%M)
mkdir -p ../public/study; find ../public/study -name 'study_*' -delete; python3 glb_split.py realtime_study/oracle_study.glb ../public/study $PRE && ls -la ../public/study
sed -i '' "s/STUDY_PRE = '[^']*'/STUDY_PRE = '$PRE'/" ../src/_study.js && grep -o "STUDY_PRE = '[^']*'" ../src/_study.js && (cd .. && python3 build.py > /dev/null && echo rebuilt)
echo "done $(date +%T)"
